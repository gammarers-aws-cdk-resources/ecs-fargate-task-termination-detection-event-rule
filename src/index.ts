import { LaunchType } from 'aws-cdk-lib/aws-ecs';
import { EventPattern, Rule, RuleProps } from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';

/**
 * Prefix ECS writes on `detail.group` for tasks that belong to a service.
 */
const ECS_SERVICE_GROUP_PREFIX = 'service:';

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
   * Detect only tasks that failed to start (for example image pull failures).
   *
   * Matched via `stopCode` = `TaskFailedToStart` or known startup-failure
   * `stoppedReason` prefixes (`CannotPullContainerError`,
   * `ResourceInitializationError`).
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
 * Default `stoppedReason` prefixes treated as expected operational stops
 * (not unexpected failures) and excluded from non-zero exit-code matching.
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
   * `stoppedReason` prefixes excluded from non-zero exit-code matching via
   * EventBridge `anything-but` prefix matching.
   *
   * Applies only to the non-zero `exitCode` branch (`NON_ZERO_EXIT_CODE` and
   * the corresponding `$or` branch of `ALL_FAILURES`). Startup-failure
   * matching is unchanged.
   *
   * Pass a new array to replace the default set. To extend defaults, spread
   * {@link DefaultExcludedStoppedReasonPrefixes.ALL} and append prefixes.
   * Pass an empty array to disable exclusion.
   *
   * @default DefaultExcludedStoppedReasonPrefixes.ALL
   */
  readonly excludedStoppedReasonPrefixes?: string[];
}

/**
 * EventBridge `anything-but` prefix matcher for `stoppedReason`.
 */
interface StoppedReasonPrefixExclusion {
  readonly 'anything-but': {
    readonly prefix: string[];
  };
}

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
    'anything-but': { prefix: prefixes },
  };
};

/**
 * `$or` / top-level branch for non-zero container exit codes.
 *
 * Scaling and other expected operational stop reasons are excluded in the same
 * branch so EventBridge does not combine a top-level `stoppedReason` filter
 * with `$or` branches that also match on `stoppedReason`.
 *
 * @param excludedStoppedReasonPrefixes - Prefixes excluded via `anything-but`.
 * @returns Event pattern fragment for non-zero `exitCode` matching.
 */
const buildNonZeroExitCodeCondition = (
  excludedStoppedReasonPrefixes: string[],
): Record<string, unknown> => {
  const condition: Record<string, unknown> = {
    containers: {
      exitCode: [
        { 'anything-but': 0 },
      ],
    },
  };

  const stoppedReasonExclusion = buildStoppedReasonExclusion(excludedStoppedReasonPrefixes);
  if (!stoppedReasonExclusion) {
    return condition;
  }

  return {
    ...condition,
    stoppedReason: [stoppedReasonExclusion],
  };
};

/**
 * `$or` branch that matches ECS `stopCode` = `TaskFailedToStart`
 * (covers pull/start failures where `exitCode` is typically absent).
 */
const TASK_FAILED_TO_START_STOP_CODE_CONDITION = {
  stopCode: ['TaskFailedToStart'],
};

/**
 * `$or` branch with `stoppedReason` prefix matches for common startup failures
 * where `exitCode` is often absent.
 *
 * Used as a fallback when `stopCode` is not present on the event.
 */
const TASK_FAILED_TO_START_STOPPED_REASON_CONDITION = {
  stoppedReason: [
    { prefix: 'CannotPullContainerError' },
    { prefix: 'ResourceInitializationError' },
  ],
};

/**
 * `$or` conditions that detect startup/pull failures without relying on
 * `containers.exitCode`.
 */
const STARTUP_FAILURE_OR_CONDITIONS = [
  TASK_FAILED_TO_START_STOP_CODE_CONDITION,
  TASK_FAILED_TO_START_STOPPED_REASON_CONDITION,
];

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
 * @param serviceName - ECS service name, prefixed with `service:` when set.
 * @param group - Raw task group, used as-is when set.
 * @returns Group value to match, or `undefined` when neither filter is set.
 * @throws Error if both filters are set, if either value is empty, or if
 *   `serviceName` already starts with `service:`.
 */
const resolveTaskGroup = (
  serviceName: string | undefined,
  group: string | undefined,
): string | undefined => {
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
 * @param clusterArn - ECS cluster ARN used to scope matching events.
 * @param scope - Optional service, task group, and task definition filters.
 * @returns `detail` fields shared by every detection mode.
 */
const buildScopeDetail = (
  clusterArn: string,
  scope: TaskScopeFilters,
): Record<string, unknown> => {
  const taskGroup = resolveTaskGroup(scope.serviceName, scope.group);
  const taskDefinitionArn = resolveTaskDefinitionArn(scope.taskDefinitionArn);

  return {
    clusterArn,
    launchType: [LaunchType.FARGATE],
    ...(taskGroup === undefined ? {} : { group: [taskGroup] }),
    ...(taskDefinitionArn === undefined ? {} : { taskDefinitionArn: [taskDefinitionArn] }),
    lastStatus: ['STOPPED'],
  };
};

/**
 * Builds the EventBridge `detail` filter for the selected detection mode.
 *
 * @param clusterArn - ECS cluster ARN used to scope matching events.
 * @param detectionMode - Failure matching strategy.
 * @param excludedStoppedReasonPrefixes - `stoppedReason` prefixes excluded from
 *   non-zero exit-code matching.
 * @param scope - Optional service, task group, and task definition filters.
 * @returns Event pattern `detail` object for the given mode.
 * @throws Error if `detectionMode` is unsupported.
 * @throws Error if `scope.serviceName` and `scope.group` are both set.
 * @throws Error if a scope value is an empty string, or if `scope.serviceName`
 *   starts with `service:`.
 */
const buildFailureDetail = (
  clusterArn: string,
  detectionMode: EcsFargateTaskTerminationDetectionMode,
  excludedStoppedReasonPrefixes: string[],
  scope: TaskScopeFilters,
): Record<string, unknown> => {
  const base = buildScopeDetail(clusterArn, scope);

  if (detectionMode === EcsFargateTaskTerminationDetectionMode.NON_ZERO_EXIT_CODE) {
    return {
      ...base,
      ...buildNonZeroExitCodeCondition(excludedStoppedReasonPrefixes),
    };
  }

  if (detectionMode === EcsFargateTaskTerminationDetectionMode.TASK_FAILED_TO_START) {
    return {
      ...base,
      $or: STARTUP_FAILURE_OR_CONDITIONS,
    };
  }

  if (detectionMode === EcsFargateTaskTerminationDetectionMode.ALL_FAILURES) {
    return {
      ...base,
      $or: [
        buildNonZeroExitCodeCondition(excludedStoppedReasonPrefixes),
        ...STARTUP_FAILURE_OR_CONDITIONS,
      ],
    };
  }

  throw new Error(`Unsupported detectionMode: ${detectionMode}`);
};

/**
 * Builds the full EventBridge event pattern for the construct.
 *
 * @param clusterArn - ECS cluster ARN used to scope matching events.
 * @param detectionMode - Failure matching strategy.
 * @param excludedStoppedReasonPrefixes - `stoppedReason` prefixes excluded from
 *   non-zero exit-code matching.
 * @param scope - Optional service, task group, and task definition filters.
 * @returns Event pattern targeting `aws.ecs` / `ECS Task State Change`.
 * @throws Error if `scope.serviceName` and `scope.group` are both set.
 * @throws Error if a scope value is an empty string, or if `scope.serviceName`
 *   starts with `service:`.
 */
const buildEventPattern = (
  clusterArn: string,
  detectionMode: EcsFargateTaskTerminationDetectionMode,
  excludedStoppedReasonPrefixes: string[],
  scope: TaskScopeFilters,
): EventPattern => ({
  source: ['aws.ecs'],
  detailType: ['ECS Task State Change'],
  detail: buildFailureDetail(
    clusterArn,
    detectionMode,
    excludedStoppedReasonPrefixes,
    scope,
  ),
});

/**
 * EventBridge rule that detects ECS/Fargate task terminations caused by
 * unexpected failures, while excluding expected operational stops
 * (scale-in, rolling deployment replacement, user-initiated stops, and
 * Fargate Spot interruptions).
 *
 * By default this matches both non-zero container exit codes and startup/pull
 * failures where `exitCode` is absent (for example `CannotPullContainerError`
 * / `TaskFailedToStart`). Use {@link EcsFargateTaskTerminationDetectionMode}
 * to narrow the match if needed.
 *
 * Excluded `stoppedReason` prefixes default to
 * {@link DefaultExcludedStoppedReasonPrefixes.ALL} and can be replaced or
 * extended via
 * {@link EcsFargateTaskTerminationDetectionEventRuleProps.excludedStoppedReasonPrefixes}.
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
   * @throws Error if `props.excludedStoppedReasonPrefixes` contains an empty string.
   * @throws Error if `props.serviceName` and `props.group` are both set.
   * @throws Error if `props.serviceName`, `props.group`, or
   *   `props.taskDefinitionArn` is an empty string.
   * @throws Error if `props.serviceName` starts with `service:`.
   */
  constructor(scope: Construct, id: string, props: EcsFargateTaskTerminationDetectionEventRuleProps) {
    const {
      eventPattern: providedEventPattern,
      clusterArn,
      detectionMode = EcsFargateTaskTerminationDetectionMode.ALL_FAILURES,
      excludedStoppedReasonPrefixes,
      serviceName,
      group,
      taskDefinitionArn,
      ...restProps
    } = props;

    if (providedEventPattern) {
      throw new Error('eventPattern is not allowed to be set for EcsFargateTaskTerminationDetectionEventRule.');
    }

    const resolvedExcludedPrefixes = resolveExcludedStoppedReasonPrefixes(
      excludedStoppedReasonPrefixes,
    );

    super(scope, id, {
      ...restProps,
      eventPattern: buildEventPattern(
        clusterArn,
        detectionMode,
        resolvedExcludedPrefixes,
        {
          serviceName,
          group,
          taskDefinitionArn,
        },
      ),
    });
  }
}
