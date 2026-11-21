import { LaunchType } from 'aws-cdk-lib/aws-ecs';
import { EventPattern, Rule, RuleProps } from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';

/**
 * EventBridge `source` for Amazon ECS.
 */
const ECS_EVENT_SOURCE = 'aws.ecs';

/**
 * EventBridge `detail-type` for an ECS task state change.
 */
const ECS_TASK_STATE_CHANGE_DETAIL_TYPE = 'ECS Task State Change';

/**
 * ECS task `lastStatus` after the task has stopped.
 */
const TASK_LAST_STATUS_STOPPED = 'STOPPED';

/**
 * Container `exitCode` for a successful exit. Any other code is a failure.
 */
const SUCCESSFUL_CONTAINER_EXIT_CODE = 0;

/**
 * Prefix ECS writes on `detail.group` for tasks that belong to a service.
 */
const ECS_SERVICE_GROUP_PREFIX = 'service:';

/**
 * EventBridge content filter key that matches every value except the given one.
 */
const ANYTHING_BUT_FILTER = 'anything-but';

/**
 * EventBridge content filter key that matches a string prefix.
 */
const PREFIX_FILTER = 'prefix';

/**
 * EventBridge content filter key that matches whether a field is present.
 */
const EXISTS_FILTER = 'exists';

/**
 * EventBridge key that matches when any one of its branches matches.
 */
const OR_OPERATOR = '$or';

/**
 * EventBridge `anything-but` prefix matcher for `stoppedReason`.
 */
interface StoppedReasonPrefixExclusion {
  readonly [ANYTHING_BUT_FILTER]: {
    readonly [PREFIX_FILTER]: string[];
  };
}

/**
 * Optional task identity filters. `launchType` is not included: this construct
 * always matches `FARGATE`.
 */
interface TaskScopeFilters {
  readonly serviceName?: string;
  readonly group?: string;
  readonly taskDefinitionArn?: string;
}

/**
 * Options for {@link buildScopeDetail}.
 */
interface ScopeDetailOptions {
  /**
   * ECS cluster ARN used to scope matching events.
   */
  readonly clusterArn: string;

  /**
   * Optional service, task group, and task definition filters.
   */
  readonly scope: TaskScopeFilters;
}

/**
 * Options for {@link buildFailureDetail}.
 */
interface FailureDetailOptions extends ScopeDetailOptions {
  /**
   * Failure matching strategy.
   */
  readonly detectionMode: EcsFargateTaskTerminationDetectionMode;

  /**
   * Resolved `stopCode` values excluded from non-zero exit-code matching.
   */
  readonly excludedStopCodes: string[];

  /**
   * Resolved `stoppedReason` prefixes excluded from non-zero exit-code matching.
   */
  readonly excludedStoppedReasonPrefixes: string[];

  /**
   * Resolved `stoppedReason` prefixes that match a startup failure when
   * `stopCode` is absent.
   */
  readonly startupFailureStoppedReasonPrefixes: string[];
}

/**
 * Options for {@link buildEventPattern}.
 */
interface EventPatternOptions extends ScopeDetailOptions {
  /**
   * Failure matching strategy.
   */
  readonly detectionMode: EcsFargateTaskTerminationDetectionMode;

  /**
   * `stopCode` values excluded from non-zero exit-code matching, or
   * `undefined` for {@link DefaultExcludedStopCodes.ALL}.
   */
  readonly excludedStopCodes?: string[];

  /**
   * `stoppedReason` prefixes excluded from non-zero exit-code matching, or
   * `undefined` for {@link DefaultExcludedStoppedReasonPrefixes.ALL}.
   */
  readonly excludedStoppedReasonPrefixes?: string[];

  /**
   * Startup-failure `stoppedReason` prefixes, or `undefined` for
   * {@link DefaultStartupFailureStoppedReasonPrefixes.ALL}.
   */
  readonly startupFailureStoppedReasonPrefixes?: string[];
}

/**
 * Resolves excluded `stopCode` values, defaulting to
 * {@link DefaultExcludedStopCodes.ALL}.
 *
 * @param stopCodes - Caller-supplied codes, or `undefined` for the default set.
 * @returns Codes to exclude from non-zero exit-code matching.
 * @throws Error if any code is an empty string.
 */
const resolveExcludedStopCodes = (stopCodes: string[] | undefined): string[] => {
  const resolved = stopCodes ?? [...DefaultExcludedStopCodes.ALL];

  if (resolved.some((stopCode) => stopCode.length === 0)) {
    throw new Error('excludedStopCodes must not contain empty strings.');
  }

  return resolved;
};

/**
 * Resolves excluded `stoppedReason` prefixes, defaulting to
 * {@link DefaultExcludedStoppedReasonPrefixes.ALL}.
 *
 * @param prefixes - Caller-supplied prefixes, or `undefined` for the default set.
 * @returns Prefixes to exclude from non-zero exit-code matching.
 * @throws Error if any prefix is an empty string.
 */
const resolveExcludedStoppedReasonPrefixes = (
  prefixes: string[] | undefined,
): string[] => {
  const resolved = prefixes ?? [...DefaultExcludedStoppedReasonPrefixes.ALL];

  if (resolved.some((prefix) => prefix.length === 0)) {
    throw new Error('excludedStoppedReasonPrefixes must not contain empty strings.');
  }

  return resolved;
};

/**
 * Resolves startup-failure `stoppedReason` prefixes, defaulting to
 * {@link DefaultStartupFailureStoppedReasonPrefixes.ALL}.
 *
 * @param prefixes - Caller-supplied prefixes, or `undefined` for the default set.
 * @returns Prefixes that match a startup failure when `stopCode` is absent.
 * @throws Error if any prefix is an empty string.
 */
const resolveStartupFailureStoppedReasonPrefixes = (
  prefixes: string[] | undefined,
): string[] => {
  const resolved = prefixes ?? [...DefaultStartupFailureStoppedReasonPrefixes.ALL];

  if (resolved.some((prefix) => prefix.length === 0)) {
    throw new Error('startupFailureStoppedReasonPrefixes must not contain empty strings.');
  }

  return resolved;
};

/**
 * Builds an EventBridge `anything-but` prefix matcher for `stoppedReason`.
 *
 * @param prefixes - Prefixes to exclude. An empty array yields `undefined` (no filter).
 * @returns Matcher object, or `undefined` when there are no prefixes.
 */
const buildStoppedReasonExclusion = (
  prefixes: string[],
): StoppedReasonPrefixExclusion | undefined => {
  if (prefixes.length === 0) {
    return undefined;
  }

  return {
    [ANYTHING_BUT_FILTER]: { [PREFIX_FILTER]: prefixes },
  };
};

/**
 * Builds the non-zero exit branches.
 *
 * `stopCode` exclusion is the primary filter. Prefix exclusion stays on the
 * same branch so scale-in (`ServiceSchedulerInitiated` plus
 * `Scaling activity initiated by`) stays quiet without also dropping ELB
 * health-check replacement, which uses that same stop code.
 *
 * EventBridge rejects a branch when a filtered field is missing. When stop
 * codes are excluded, a second branch matches events that omit `stopCode`
 * and applies only the prefix filter.
 *
 * @param excludedStoppedReasonPrefixes - Prefixes excluded via `anything-but`.
 * @param excludedStopCodes - Stop codes excluded via `anything-but`.
 * @returns One branch when no stop code is excluded, otherwise two.
 */
const buildNonZeroExitBranches = (
  excludedStoppedReasonPrefixes: string[],
  excludedStopCodes: string[],
): Record<string, unknown>[] => {
  const containers = {
    containers: {
      exitCode: [
        { [ANYTHING_BUT_FILTER]: SUCCESSFUL_CONTAINER_EXIT_CODE },
      ],
    },
  };
  const stoppedReasonExclusion = buildStoppedReasonExclusion(excludedStoppedReasonPrefixes);
  const stoppedReason = stoppedReasonExclusion === undefined
    ? {}
    : { stoppedReason: [stoppedReasonExclusion] };
  const withStopCode: Record<string, unknown> = {
    ...containers,
    ...stoppedReason,
  };

  if (excludedStopCodes.length === 0) {
    return [withStopCode];
  }

  return [
    {
      ...withStopCode,
      stopCode: [{ [ANYTHING_BUT_FILTER]: [...excludedStopCodes] }],
    },
    {
      ...containers,
      stopCode: [{ [EXISTS_FILTER]: false }],
      ...stoppedReason,
    },
  ];
};

/**
 * Merges failure branches into the shared scope fields.
 *
 * A single branch is inlined. Several branches become `$or`.
 *
 * @param base - Scope fields shared by every branch.
 * @param branches - Failure branches.
 * @returns The `detail` object.
 */
const attachBranches = (
  base: Record<string, unknown>,
  branches: readonly Record<string, unknown>[],
): Record<string, unknown> => {
  if (branches.length === 1) {
    return {
      ...base,
      ...branches[0],
    };
  }

  return {
    ...base,
    [OR_OPERATOR]: [...branches],
  };
};

/**
 * Builds the startup-failure branches.
 *
 * `stopCode` `TaskFailedToStart` is the primary match. Known `stoppedReason`
 * prefixes match only when `stopCode` is absent, so a pull-error reason paired
 * with another stop code is not treated as a startup failure.
 *
 * @param prefixes - Startup-failure prefixes. An empty list leaves only the stop-code branch.
 * @returns One branch when there are no prefixes, otherwise two.
 */
const buildStartupBranches = (prefixes: readonly string[]): Record<string, unknown>[] => {
  const withStopCode = {
    stopCode: [EcsTaskStopCode.TASK_FAILED_TO_START],
  };

  if (prefixes.length === 0) {
    return [withStopCode];
  }

  return [
    withStopCode,
    {
      stopCode: [{ [EXISTS_FILTER]: false }],
      stoppedReason: prefixes.map((prefix) => ({ [PREFIX_FILTER]: prefix })),
    },
  ];
};

/**
 * Rejects an empty scope value.
 *
 * @param name - Property name used in the error message.
 * @param value - Caller-supplied value.
 * @throws Error if `value` is an empty string.
 */
const assertNonEmptyScopeValue = (name: string, value: string): void => {
  if (value.length === 0) {
    throw new Error(`${name} must not be empty.`);
  }
};

/**
 * Resolves the EventBridge `detail.group` value from `serviceName` or `group`.
 *
 * @param scope - Filters. `serviceName` is prefixed with `service:` when set,
 *   and `group` is used as-is when set.
 * @returns Group value to match, or `undefined` when neither filter is set.
 * @throws Error if both filters are set, if either value is empty, or if
 *   `serviceName` already starts with `service:`.
 */
const resolveTaskGroup = (scope: TaskScopeFilters): string | undefined => {
  const { serviceName, group } = scope;

  if (serviceName !== undefined && group !== undefined) {
    throw new Error(
      'serviceName and group cannot both be set. Use serviceName for an ECS service, or group for a raw task group.',
    );
  }

  if (serviceName !== undefined) {
    assertNonEmptyScopeValue('serviceName', serviceName);
    if (serviceName.startsWith(ECS_SERVICE_GROUP_PREFIX)) {
      throw new Error(
        'serviceName must be the ECS service name without the "service:" prefix. Use group to match a raw task group.',
      );
    }
    return `${ECS_SERVICE_GROUP_PREFIX}${serviceName}`;
  }

  if (group !== undefined) {
    assertNonEmptyScopeValue('group', group);
    return group;
  }

  return undefined;
};

/**
 * Resolves the task definition ARN filter.
 *
 * @param taskDefinitionArn - Caller-supplied ARN, or `undefined` to skip the filter.
 * @returns ARN to match, or `undefined` when the filter is omitted.
 * @throws Error if `taskDefinitionArn` is an empty string.
 */
const resolveTaskDefinitionArn = (
  taskDefinitionArn: string | undefined,
): string | undefined => {
  if (taskDefinitionArn === undefined) {
    return undefined;
  }

  assertNonEmptyScopeValue('taskDefinitionArn', taskDefinitionArn);
  return taskDefinitionArn;
};

/**
 * Builds the always-on task scope fields for the EventBridge `detail` filter.
 *
 * `launchType` is fixed to `FARGATE` so EC2 and EXTERNAL tasks in the same
 * cluster do not match. Fargate Spot remains included because its launch type
 * is still `FARGATE`.
 *
 * @param options - Cluster ARN and the optional scope filters.
 * @returns `detail` fields shared by every detection mode.
 * @throws Error if a scope value is invalid. See {@link resolveTaskGroup} and
 *   {@link resolveTaskDefinitionArn}.
 */
const buildScopeDetail = (options: ScopeDetailOptions): Record<string, unknown> => {
  const { clusterArn, scope } = options;
  const taskGroup = resolveTaskGroup(scope);
  const taskDefinitionArn = resolveTaskDefinitionArn(scope.taskDefinitionArn);

  return {
    clusterArn: [clusterArn],
    launchType: [LaunchType.FARGATE],
    ...(taskGroup === undefined ? {} : { group: [taskGroup] }),
    ...(taskDefinitionArn === undefined ? {} : { taskDefinitionArn: [taskDefinitionArn] }),
    lastStatus: [TASK_LAST_STATUS_STOPPED],
  };
};

/**
 * Builds the EventBridge `detail` filter for the selected detection mode.
 *
 * @param options - Cluster ARN, scope filters, detection mode, and the resolved
 *   stop-code and `stoppedReason` exclusions.
 * @returns Event pattern `detail` object for the given mode.
 * @throws Error if `options.detectionMode` is unsupported.
 * @throws Error if `options.scope.serviceName` and `options.scope.group` are both set.
 * @throws Error if a scope value is an empty string, or if
 *   `options.scope.serviceName` starts with `service:`.
 */
const buildFailureDetail = (options: FailureDetailOptions): Record<string, unknown> => {
  const { detectionMode, excludedStopCodes, excludedStoppedReasonPrefixes, startupFailureStoppedReasonPrefixes } = options;
  const base = buildScopeDetail(options);
  const exitBranches = buildNonZeroExitBranches(excludedStoppedReasonPrefixes, excludedStopCodes);
  const startupBranches = buildStartupBranches(startupFailureStoppedReasonPrefixes);

  if (detectionMode === EcsFargateTaskTerminationDetectionMode.NON_ZERO_EXIT_CODE) {
    return attachBranches(base, exitBranches);
  }

  if (detectionMode === EcsFargateTaskTerminationDetectionMode.TASK_FAILED_TO_START) {
    return attachBranches(base, startupBranches);
  }

  if (detectionMode === EcsFargateTaskTerminationDetectionMode.ALL_FAILURES) {
    return attachBranches(base, [...exitBranches, ...startupBranches]);
  }

  throw new Error(`Unsupported detectionMode: ${detectionMode}`);
};

/**
 * Builds the full EventBridge event pattern for the construct.
 *
 * Resolves the default stop-code and `stoppedReason` exclusions when those
 * options are omitted.
 *
 * @param options - Cluster ARN, scope filters, detection mode, and the optional
 *   exclusions.
 * @returns Event pattern targeting `aws.ecs` / `ECS Task State Change`.
 * @throws Error if `options.excludedStopCodes`, `options.excludedStoppedReasonPrefixes`,
 *   or `options.startupFailureStoppedReasonPrefixes` contains an empty string.
 * @throws Error if `options.scope.serviceName` and `options.scope.group` are both set.
 * @throws Error if a scope value is an empty string, or if
 *   `options.scope.serviceName` starts with `service:`.
 * @throws Error if `options.detectionMode` is unsupported.
 */
const buildEventPattern = (options: EventPatternOptions): EventPattern => ({
  source: [ECS_EVENT_SOURCE],
  detailType: [ECS_TASK_STATE_CHANGE_DETAIL_TYPE],
  detail: buildFailureDetail({
    ...options,
    excludedStopCodes: resolveExcludedStopCodes(options.excludedStopCodes),
    excludedStoppedReasonPrefixes: resolveExcludedStoppedReasonPrefixes(options.excludedStoppedReasonPrefixes),
    startupFailureStoppedReasonPrefixes: resolveStartupFailureStoppedReasonPrefixes(
      options.startupFailureStoppedReasonPrefixes,
    ),
  }),
});

/**
 * How {@link EcsFargateTaskTerminationDetectionEventRule} matches ECS/Fargate
 * task failure events in its EventBridge pattern.
 */
export enum EcsFargateTaskTerminationDetectionMode {
  /**
   * Detect only container exits with a non-zero `exitCode`.
   *
   * Does not match startup/pull failures (for example `CannotPullContainerError`)
   * where `containers.exitCode` is absent.
   */
  NON_ZERO_EXIT_CODE = 'NON_ZERO_EXIT_CODE',

  /**
   * Detect only tasks that failed to start.
   *
   * Matched via `stopCode` `TaskFailedToStart`. When `stopCode` is absent,
   * known startup-failure `stoppedReason` prefixes match instead.
   */
  TASK_FAILED_TO_START = 'TASK_FAILED_TO_START',

  /**
   * Detect both non-zero exit codes and startup/pull failures
   * (`TaskFailedToStart` / known `stoppedReason` prefixes).
   *
   * This is the default {@link EcsFargateTaskTerminationDetectionEventRuleProps.detectionMode}.
   */
  ALL_FAILURES = 'ALL_FAILURES',
}

/**
 * ECS task `stopCode` values published on `ECS Task State Change`.
 *
 * These strings are the stable codes ECS writes.
 */
export enum EcsTaskStopCode {
  /**
   * The task never reached a running container.
   */
  TASK_FAILED_TO_START = 'TaskFailedToStart',

  /**
   * An essential container exited.
   */
  ESSENTIAL_CONTAINER_EXITED = 'EssentialContainerExited',

  /**
   * A user or API call stopped the task.
   */
  USER_INITIATED = 'UserInitiated',

  /**
   * The service scheduler stopped the task.
   *
   * Scale-in, rolling replacement, and ELB health-check replacement share this
   * code. It is not part of {@link DefaultExcludedStopCodes.ALL}.
   */
  SERVICE_SCHEDULER_INITIATED = 'ServiceSchedulerInitiated',

  /**
   * Fargate Spot reclaimed the task.
   */
  SPOT_INTERRUPTION = 'SpotInterruption',

  /**
   * The infrastructure asked the task to stop, such as host retirement or a
   * platform update. Not part of {@link DefaultExcludedStopCodes.ALL}.
   */
  TERMINATION_NOTICE = 'TerminationNotice',
}

/**
 * Default `stopCode` values excluded from non-zero exit-code matching.
 *
 * `ServiceSchedulerInitiated` is omitted because ELB health-check replacement
 * uses that code as well as scale-in. Scale-in stays excluded by
 * {@link DefaultExcludedStoppedReasonPrefixes.SCALING_ACTIVITY_INITIATED_BY}.
 * `TerminationNotice` is omitted so platform updates and host retirement still match.
 *
 * Override via {@link EcsFargateTaskTerminationDetectionEventRuleProps.excludedStopCodes}.
 * To extend this set, spread {@link DefaultExcludedStopCodes.ALL} and append
 * {@link EcsTaskStopCode} values.
 */
export class DefaultExcludedStopCodes {
  /**
   * Console or API stop.
   */
  public static readonly USER_INITIATED = EcsTaskStopCode.USER_INITIATED;

  /**
   * Fargate Spot reclaim.
   */
  public static readonly SPOT_INTERRUPTION = EcsTaskStopCode.SPOT_INTERRUPTION;

  /**
   * All default stop codes, in a stable order.
   *
   * Contains {@link DefaultExcludedStopCodes.USER_INITIATED} and
   * {@link DefaultExcludedStopCodes.SPOT_INTERRUPTION}.
   */
  public static readonly ALL: string[] = [
    DefaultExcludedStopCodes.USER_INITIATED,
    DefaultExcludedStopCodes.SPOT_INTERRUPTION,
  ];
}

/**
 * Default `stoppedReason` prefixes treated as expected operational stops
 * (not unexpected failures) and excluded from non-zero exit-code matching.
 *
 * This is the auxiliary filter. It applies together with
 * {@link DefaultExcludedStopCodes} when `stopCode` is present, and it is the
 * only operational-stop filter when `stopCode` is absent.
 *
 * Override via {@link EcsFargateTaskTerminationDetectionEventRuleProps.excludedStoppedReasonPrefixes}.
 * To extend this set, spread {@link DefaultExcludedStoppedReasonPrefixes.ALL}
 * and append extra prefixes.
 */
export class DefaultExcludedStoppedReasonPrefixes {
  /**
   * Service scale-in and rolling deployment replacement
   * (`Scaling activity initiated by (deployment ...)`).
   */
  public static readonly SCALING_ACTIVITY_INITIATED_BY = 'Scaling activity initiated by';

  /**
   * Console/API stop (`stopCode` = `UserInitiated`).
   */
  public static readonly TASK_STOPPED_BY_USER = 'Task stopped by user';

  /**
   * Fargate Spot reclaim (`stopCode` = `SpotInterruption`).
   */
  public static readonly SPOT_TASK_INTERRUPTED = 'Your Spot Task was interrupted';

  /**
   * All default prefixes, in a stable order.
   *
   * Contains {@link DefaultExcludedStoppedReasonPrefixes.SCALING_ACTIVITY_INITIATED_BY},
   * {@link DefaultExcludedStoppedReasonPrefixes.TASK_STOPPED_BY_USER}, and
   * {@link DefaultExcludedStoppedReasonPrefixes.SPOT_TASK_INTERRUPTED}.
   */
  public static readonly ALL: string[] = [
    DefaultExcludedStoppedReasonPrefixes.SCALING_ACTIVITY_INITIATED_BY,
    DefaultExcludedStoppedReasonPrefixes.TASK_STOPPED_BY_USER,
    DefaultExcludedStoppedReasonPrefixes.SPOT_TASK_INTERRUPTED,
  ];
}

/**
 * Default `stoppedReason` prefixes that match a startup failure when `stopCode`
 * is absent.
 *
 * `stopCode` `TaskFailedToStart` is matched separately and does not use this list.
 *
 * Override via {@link EcsFargateTaskTerminationDetectionEventRuleProps.startupFailureStoppedReasonPrefixes}.
 * To extend this set, spread {@link DefaultStartupFailureStoppedReasonPrefixes.ALL}.
 */
export class DefaultStartupFailureStoppedReasonPrefixes {
  /**
   * Image pull failure.
   */
  public static readonly CANNOT_PULL_CONTAINER_ERROR = 'CannotPullContainerError';

  /**
   * ENI or secrets initialization failure.
   */
  public static readonly RESOURCE_INITIALIZATION_ERROR = 'ResourceInitializationError';

  /**
   * Container runtime failed to start the container.
   */
  public static readonly CANNOT_START_CONTAINER_ERROR = 'CannotStartContainerError';

  /**
   * Generic "task failed to start" wording used when `stopCode` was not set.
   */
  public static readonly TASK_FAILED_TO_START = 'Task failed to start';

  /**
   * All default startup-failure prefixes, in a stable order.
   *
   * Contains {@link DefaultStartupFailureStoppedReasonPrefixes.CANNOT_PULL_CONTAINER_ERROR},
   * {@link DefaultStartupFailureStoppedReasonPrefixes.RESOURCE_INITIALIZATION_ERROR},
   * {@link DefaultStartupFailureStoppedReasonPrefixes.CANNOT_START_CONTAINER_ERROR}, and
   * {@link DefaultStartupFailureStoppedReasonPrefixes.TASK_FAILED_TO_START}.
   */
  public static readonly ALL: string[] = [
    DefaultStartupFailureStoppedReasonPrefixes.CANNOT_PULL_CONTAINER_ERROR,
    DefaultStartupFailureStoppedReasonPrefixes.RESOURCE_INITIALIZATION_ERROR,
    DefaultStartupFailureStoppedReasonPrefixes.CANNOT_START_CONTAINER_ERROR,
    DefaultStartupFailureStoppedReasonPrefixes.TASK_FAILED_TO_START,
  ];
}

/**
 * Properties for {@link EcsFargateTaskTerminationDetectionEventRule}.
 *
 * Extends EventBridge {@link RuleProps}, except `eventPattern` which must not
 * be set (this construct always owns the pattern).
 */
export interface EcsFargateTaskTerminationDetectionEventRuleProps extends RuleProps {
  /**
   * ARN of the ECS cluster to monitor.
   *
   * The rule matches only tasks in this cluster whose `launchType` is
   * `FARGATE`. EC2 and EXTERNAL tasks in the same cluster are ignored.
   * Fargate Spot tasks stay in scope because their `launchType` remains
   * `FARGATE` (`capacityProviderName` is `FARGATE_SPOT`).
   */
  readonly clusterArn: string;

  /**
   * ECS service name used to narrow matching to one service.
   *
   * Matched as `detail.group` equal to `service:${serviceName}`. Omit to
   * match every Fargate task in the cluster. Pass the service name only,
   * without the `service:` prefix.
   *
   * Cannot be set together with {@link EcsFargateTaskTerminationDetectionEventRuleProps.group}.
   */
  readonly serviceName?: string;

  /**
   * Raw ECS task group used to narrow matching.
   *
   * Matched exactly against `detail.group`. Use this for a non-service task
   * group. For an ECS service, use
   * {@link EcsFargateTaskTerminationDetectionEventRuleProps.serviceName}.
   *
   * Cannot be set together with {@link EcsFargateTaskTerminationDetectionEventRuleProps.serviceName}.
   */
  readonly group?: string;

  /**
   * Task definition ARN used to narrow matching.
   *
   * Matched exactly against `detail.taskDefinitionArn`. Include the revision
   * when events carry one
   * (`arn:aws:ecs:region:account:task-definition/family:revision`).
   */
  readonly taskDefinitionArn?: string;

  /**
   * How task failures are matched in the EventBridge event pattern.
   *
   * @default EcsFargateTaskTerminationDetectionMode.ALL_FAILURES
   */
  readonly detectionMode?: EcsFargateTaskTerminationDetectionMode;

  /**
   * `stopCode` values excluded from non-zero exit-code matching.
   *
   * This is the primary operational-stop filter. It applies when the event
   * has a `stopCode`. Events with no `stopCode` use
   * {@link EcsFargateTaskTerminationDetectionEventRuleProps.excludedStoppedReasonPrefixes}
   * instead. Those prefixes also apply when `stopCode` is present.
   *
   * Applies only to the non-zero `exitCode` branch. Startup-failure matching
   * is unchanged.
   *
   * Pass a new array to replace the default set. To extend defaults, spread
   * {@link DefaultExcludedStopCodes.ALL} and append {@link EcsTaskStopCode} values.
   * Pass an empty array to disable `stopCode` exclusion.
   *
   * @default DefaultExcludedStopCodes.ALL
   */
  readonly excludedStopCodes?: string[];

  /**
   * `stoppedReason` prefixes excluded from non-zero exit-code matching via
   * EventBridge `anything-but` prefix matching.
   *
   * Auxiliary filter on the non-zero `exitCode` branch. It runs both when
   * `stopCode` is present and when `stopCode` is absent. Use it for operational
   * stops that share a `stopCode` with real failures, such as scale-in.
   * Startup-failure matching is unchanged.
   *
   * Pass a new array to replace the default set. To extend defaults, spread
   * {@link DefaultExcludedStoppedReasonPrefixes.ALL} and append prefixes.
   * Pass an empty array to disable prefix exclusion.
   *
   * @default DefaultExcludedStoppedReasonPrefixes.ALL
   */
  readonly excludedStoppedReasonPrefixes?: string[];

  /**
   * `stoppedReason` prefixes that match a startup failure when the event has
   * no `stopCode`.
   *
   * `stopCode` `TaskFailedToStart` always matches in
   * {@link EcsFargateTaskTerminationDetectionMode.TASK_FAILED_TO_START} and
   * {@link EcsFargateTaskTerminationDetectionMode.ALL_FAILURES}, and does not
   * use this list.
   *
   * Pass a new array to replace the default set. To extend defaults, spread
   * {@link DefaultStartupFailureStoppedReasonPrefixes.ALL}. Pass an empty array
   * to match startup failures only by `stopCode` `TaskFailedToStart`.
   *
   * @default DefaultStartupFailureStoppedReasonPrefixes.ALL
   */
  readonly startupFailureStoppedReasonPrefixes?: string[];
}

/**
 * EventBridge rule that detects ECS/Fargate task terminations caused by
 * unexpected failures, while excluding expected operational stops
 * (scale-in, rolling deployment replacement, user-initiated stops, and
 * Fargate Spot interruptions).
 *
 * By default this matches both non-zero container exit codes and startup/pull
 * failures where `exitCode` is absent. Startup failures match `stopCode`
 * `TaskFailedToStart`, and {@link DefaultStartupFailureStoppedReasonPrefixes.ALL}
 * when `stopCode` is absent. Use {@link EcsFargateTaskTerminationDetectionMode}
 * to narrow the match if needed.
 *
 * User-initiated stops and Fargate Spot interruptions are excluded by
 * `stopCode` ({@link DefaultExcludedStopCodes.ALL}). Scale-in stays excluded
 * by the `stoppedReason` prefix `Scaling activity initiated by`, including
 * when `stopCode` is `ServiceSchedulerInitiated`. Events that omit `stopCode`
 * use {@link DefaultExcludedStoppedReasonPrefixes.ALL}.
 *
 * This rule defines its own `eventPattern` and does not accept `props.eventPattern`.
 * The pattern is scoped to the given `clusterArn` and to `launchType` `FARGATE`.
 * Optional `serviceName`, `group`, and `taskDefinitionArn` narrow that scope
 * further.
 */
export class EcsFargateTaskTerminationDetectionEventRule extends Rule {
  /**
   * Creates a new {@link EcsFargateTaskTerminationDetectionEventRule}.
   *
   * @param scope - Parent construct.
   * @param id - Construct identifier.
   * @param props - Rule properties including required `clusterArn`.
   * @throws Error if `props.eventPattern` is provided. This construct always
   *   manages its own `eventPattern`.
   * @throws Error if `props.excludedStopCodes`, `props.excludedStoppedReasonPrefixes`,
   *   or `props.startupFailureStoppedReasonPrefixes` contains an empty string.
   * @throws Error if `props.serviceName` and `props.group` are both set.
   * @throws Error if `props.serviceName`, `props.group`, or
   *   `props.taskDefinitionArn` is an empty string.
   * @throws Error if `props.serviceName` starts with `service:`.
   * @throws Error if `props.detectionMode` is unsupported.
   */
  constructor(scope: Construct, id: string, props: EcsFargateTaskTerminationDetectionEventRuleProps) {
    const {
      eventPattern: providedEventPattern,
      clusterArn,
      detectionMode = EcsFargateTaskTerminationDetectionMode.ALL_FAILURES,
      excludedStopCodes,
      excludedStoppedReasonPrefixes,
      startupFailureStoppedReasonPrefixes,
      serviceName,
      group,
      taskDefinitionArn,
      ...restProps
    } = props;

    if (providedEventPattern) {
      throw new Error('eventPattern is not allowed to be set for EcsFargateTaskTerminationDetectionEventRule.');
    }

    super(scope, id, {
      ...restProps,
      eventPattern: buildEventPattern({
        clusterArn,
        detectionMode,
        excludedStopCodes,
        excludedStoppedReasonPrefixes,
        startupFailureStoppedReasonPrefixes,
        scope: {
          serviceName,
          group,
          taskDefinitionArn,
        },
      }),
    });
  }
}
