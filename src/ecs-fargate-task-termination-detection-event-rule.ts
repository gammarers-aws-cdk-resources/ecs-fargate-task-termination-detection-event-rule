import { type IBaseService, type ICluster, LaunchType } from 'aws-cdk-lib/aws-ecs';
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
  readonly serviceNames?: string[];
  readonly service?: IBaseService;
  readonly group?: string;
  readonly taskDefinitionArn?: string;
}

/**
 * Cluster inputs. At most one of `cluster`, `clusterArn`, and `clusterArns`
 * may be set. `service` supplies a cluster when none of those are set.
 */
interface ClusterSelection {
  readonly cluster?: ICluster;
  readonly clusterArn?: string;
  readonly clusterArns?: string[];
  readonly service?: IBaseService;
}

/**
 * Options for {@link buildScopeDetail}.
 */
interface ScopeDetailOptions {
  /**
   * ECS cluster ARNs used to scope matching events.
   */
  readonly clusterArns: readonly string[];

  /**
   * Resolved `detail.group` values, or `undefined` to skip the filter.
   */
  readonly taskGroups?: readonly string[];

  /**
   * Task definition ARN, or `undefined` to skip the filter.
   */
  readonly taskDefinitionArn?: string;
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

  /**
   * Container names to match, or `undefined` to match every container.
   */
  readonly containerNames?: readonly string[];

  /**
   * Exit codes excluded in addition to the successful code `0`.
   */
  readonly ignoredExitCodes: readonly number[];
}

/**
 * Options for {@link buildEventPattern}.
 */
interface EventPatternOptions {
  /**
   * Cluster inputs. See {@link ClusterSelection}.
   */
  readonly cluster: ClusterSelection;

  /**
   * Service, task group, and task definition filters.
   */
  readonly scope: TaskScopeFilters;

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

  /**
   * Container names to match, or `undefined` to match every container.
   */
  readonly containerNames?: readonly string[];

  /**
   * Exit codes excluded in addition to `0`, or `undefined` for none.
   */
  readonly ignoredExitCodes?: readonly number[];
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
 * Builds the exit codes placed in an `anything-but` filter.
 *
 * `0` is always first. Later duplicates are dropped. A single code stays a
 * number so the default pattern keeps `anything-but: 0`.
 *
 * @param ignoredExitCodes - Extra codes to exclude.
 * @returns The `anything-but` payload.
 */
const buildExitCodeExclusion = (ignoredExitCodes: readonly number[]): number | number[] => {
  const codes: number[] = [];
  for (const code of [SUCCESSFUL_CONTAINER_EXIT_CODE, ...ignoredExitCodes]) {
    if (!codes.includes(code)) {
      codes.push(code);
    }
  }

  if (codes.length === 1) {
    return SUCCESSFUL_CONTAINER_EXIT_CODE;
  }

  return codes;
};

/**
 * Builds a name-only `containers` object.
 *
 * @param containerNames - Names to match, or `undefined` to skip the filter.
 * @returns The `containers` object, or `undefined` when no names are set.
 */
const buildContainerNameFilter = (
  containerNames: readonly string[] | undefined,
): Record<string, unknown> | undefined => {
  if (containerNames === undefined) {
    return undefined;
  }

  return {
    name: [...containerNames],
  };
};

/**
 * Builds the `containers` object for a non-zero exit branch.
 *
 * Exit codes are always present on this branch, so the object is never omitted.
 *
 * @param containerNames - Names to match, or `undefined` to skip the name filter.
 * @param exitCodes - `anything-but` payload for `exitCode`.
 * @returns The `containers` object.
 */
const buildExitContainers = (
  containerNames: readonly string[] | undefined,
  exitCodes: number | number[],
): Record<string, unknown> => {
  return {
    ...(containerNames === undefined ? {} : { name: [...containerNames] }),
    exitCode: [{ [ANYTHING_BUT_FILTER]: exitCodes }],
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
 * and applies only the prefix filter. `ignoredExitCodes` widens the exit-code
 * exclusion. `containerNames` requires the same container to match.
 *
 * @param options - Container, exit-code, stop-code, and prefix filters.
 * @returns One branch when no stop code is excluded, otherwise two.
 */
const buildNonZeroExitBranches = (options: {
  readonly containerNames?: readonly string[];
  readonly ignoredExitCodes: readonly number[];
  readonly excludedStopCodes: readonly string[];
  readonly excludedStoppedReasonPrefixes: readonly string[];
}): Record<string, unknown>[] => {
  const containers = {
    containers: buildExitContainers(
      options.containerNames,
      buildExitCodeExclusion(options.ignoredExitCodes),
    ),
  };
  const stoppedReasonExclusion = buildStoppedReasonExclusion([...options.excludedStoppedReasonPrefixes]);
  const stoppedReason = stoppedReasonExclusion === undefined
    ? {}
    : { stoppedReason: [stoppedReasonExclusion] };
  const withStopCode: Record<string, unknown> = {
    ...containers,
    ...stoppedReason,
  };

  if (options.excludedStopCodes.length === 0) {
    return [withStopCode];
  }

  return [
    {
      ...withStopCode,
      stopCode: [{ [ANYTHING_BUT_FILTER]: [...options.excludedStopCodes] }],
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
 * @param containerNames - Container names, or `undefined` to match every container.
 * @returns One branch when there are no prefixes, otherwise two.
 */
const buildStartupBranches = (
  prefixes: readonly string[],
  containerNames: readonly string[] | undefined,
): Record<string, unknown>[] => {
  const containers = buildContainerNameFilter(containerNames);
  const containerFields = containers === undefined ? {} : { containers };
  const withStopCode = {
    ...containerFields,
    stopCode: [EcsTaskStopCode.TASK_FAILED_TO_START],
  };

  if (prefixes.length === 0) {
    return [withStopCode];
  }

  return [
    withStopCode,
    {
      ...containerFields,
      stopCode: [{ [EXISTS_FILTER]: false }],
      stoppedReason: prefixes.map((prefix) => ({ [PREFIX_FILTER]: prefix })),
    },
  ];
};

/**
 * Rejects an empty scope value.
 *
 * @param fieldName - Property name used in the error message.
 * @param value - Caller-supplied value.
 * @throws Error if `value` is an empty string.
 */
const assertNonEmptyScopeValue = (fieldName: string, value: string): void => {
  if (value.length === 0) {
    throw new Error(`${fieldName} must not be empty.`);
  }
};

/**
 * Rejects an empty list and empty string elements.
 *
 * @param fieldName - Property name used in the error message.
 * @param values - Caller-supplied strings.
 * @throws Error if `values` is empty or contains an empty string.
 */
const assertPopulatedStrings = (fieldName: string, values: readonly string[]): void => {
  if (values.length === 0) {
    throw new Error(`${fieldName} must not be empty.`);
  }

  if (values.some((value) => value.length === 0)) {
    throw new Error(`${fieldName} must not contain empty strings.`);
  }
};

/**
 * Rejects a non-integer.
 *
 * @param fieldName - Property name used in the error message.
 * @param values - Caller-supplied numbers.
 * @throws Error if any value is not an integer.
 */
const assertIntegers = (fieldName: string, values: readonly number[]): void => {
  if (values.some((value) => !Number.isInteger(value))) {
    throw new Error(`${fieldName} must contain only integers.`);
  }
};

/**
 * Resolves exit codes that are excluded in addition to `0`.
 *
 * @param ignoredExitCodes - Caller-supplied codes, or `undefined` for none.
 * @returns A copy of the caller list, or an empty array when omitted.
 * @throws Error if any code is not an integer.
 */
const resolveIgnoredExitCodes = (ignoredExitCodes: readonly number[] | undefined): number[] => {
  if (ignoredExitCodes === undefined) {
    return [];
  }

  assertIntegers('ignoredExitCodes', ignoredExitCodes);
  return [...ignoredExitCodes];
};

/**
 * Resolves container names.
 *
 * @param containerNames - Caller-supplied names, or `undefined` to match every container.
 * @returns A copy of the names, or `undefined` when the filter is omitted.
 * @throws Error if the list is empty or contains an empty string.
 */
const resolveContainerNames = (containerNames: readonly string[] | undefined): string[] | undefined => {
  if (containerNames === undefined) {
    return undefined;
  }

  assertPopulatedStrings('containerNames', containerNames);
  return [...containerNames];
};

/**
 * Counts how many cluster inputs the caller set.
 *
 * @param selection - Cluster inputs.
 * @returns The number of set inputs among `cluster`, `clusterArn`, and `clusterArns`.
 */
const clusterSourceCount = (selection: ClusterSelection): number => {
  return [selection.cluster, selection.clusterArn, selection.clusterArns]
    .filter((value) => value !== undefined)
    .length;
};

/**
 * Resolves the cluster ARNs the rule matches.
 *
 * @param selection - Cluster inputs and the optional service used as a fallback.
 * @returns One or more cluster ARNs. Tokens are preserved.
 * @throws Error if more than one of `cluster`, `clusterArn`, and `clusterArns` is set.
 * @throws Error if none of those are set and `service` is also omitted.
 * @throws Error if `clusterArns` is empty or contains an empty string.
 */
const resolveClusterArns = (selection: ClusterSelection): string[] => {
  if (clusterSourceCount(selection) > 1) {
    throw new Error('Set only one of cluster, clusterArn, or clusterArns.');
  }

  if (selection.cluster !== undefined) {
    return [selection.cluster.clusterArn];
  }

  if (selection.clusterArn !== undefined) {
    return [selection.clusterArn];
  }

  if (selection.clusterArns !== undefined) {
    assertPopulatedStrings('clusterArns', selection.clusterArns);
    return [...selection.clusterArns];
  }

  if (selection.service !== undefined) {
    return [selection.service.cluster.clusterArn];
  }

  throw new Error('Set cluster, clusterArn, clusterArns, or service.');
};

/**
 * Builds the `detail.group` value for one ECS service name.
 *
 * @param fieldName - Property name used in the error message.
 * @param serviceName - Service name without the `service:` prefix.
 * @returns `service:` plus `serviceName`.
 * @throws Error if `serviceName` is empty or already starts with `service:`.
 */
const toServiceGroup = (fieldName: string, serviceName: string): string => {
  assertNonEmptyScopeValue(fieldName, serviceName);
  if (serviceName.startsWith(ECS_SERVICE_GROUP_PREFIX)) {
    throw new Error(
      `${fieldName} must be the ECS service name without the "service:" prefix. Use group to match a raw task group.`,
    );
  }

  return `${ECS_SERVICE_GROUP_PREFIX}${serviceName}`;
};

/**
 * Counts how many service or group inputs the caller set.
 *
 * @param scope - Service and group inputs.
 * @returns The number of set inputs among `serviceName`, `serviceNames`, `service`, and `group`.
 */
const serviceSourceCount = (scope: TaskScopeFilters): number => {
  return [scope.serviceName, scope.serviceNames, scope.service, scope.group]
    .filter((value) => value !== undefined)
    .length;
};

/**
 * Resolves `detail.group` values from the service and group inputs.
 *
 * @param scope - Service and group inputs.
 * @returns Group values to match, or `undefined` when none of the inputs are set.
 * @throws Error if more than one of `serviceName`, `serviceNames`, `service`, and `group` is set.
 * @throws Error if a service name or `group` is empty, if a service name starts
 *   with `service:`, or if `serviceNames` is empty.
 */
const resolveTaskGroups = (scope: TaskScopeFilters): string[] | undefined => {
  if (serviceSourceCount(scope) > 1) {
    throw new Error('Set only one of serviceName, serviceNames, service, or group.');
  }

  if (scope.serviceName !== undefined) {
    return [toServiceGroup('serviceName', scope.serviceName)];
  }

  if (scope.serviceNames !== undefined) {
    assertPopulatedStrings('serviceNames', scope.serviceNames);
    return scope.serviceNames.map((serviceName) => toServiceGroup('serviceNames', serviceName));
  }

  if (scope.service !== undefined) {
    return [toServiceGroup('service.serviceName', scope.service.serviceName)];
  }

  if (scope.group !== undefined) {
    assertNonEmptyScopeValue('group', scope.group);
    return [scope.group];
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
 * @param options - Cluster ARNs and the optional scope filters.
 * @returns `detail` fields shared by every detection mode.
 */
const buildScopeDetail = (options: ScopeDetailOptions): Record<string, unknown> => {
  const taskDefinitionArn = resolveTaskDefinitionArn(options.taskDefinitionArn);

  return {
    clusterArn: [...options.clusterArns],
    launchType: [LaunchType.FARGATE],
    ...(options.taskGroups === undefined ? {} : { group: [...options.taskGroups] }),
    ...(taskDefinitionArn === undefined ? {} : { taskDefinitionArn: [taskDefinitionArn] }),
    lastStatus: [TASK_LAST_STATUS_STOPPED],
  };
};

/**
 * Builds the EventBridge `detail` filter for the selected detection mode.
 *
 * @param options - Scope, detection mode, and the resolved failure filters.
 * @returns Event pattern `detail` object for the given mode.
 * @throws Error if `options.detectionMode` is unsupported.
 */
const buildFailureDetail = (options: FailureDetailOptions): Record<string, unknown> => {
  const base = buildScopeDetail(options);
  const exitBranches = buildNonZeroExitBranches(options);
  const startupBranches = buildStartupBranches(
    options.startupFailureStoppedReasonPrefixes,
    options.containerNames,
  );

  if (options.detectionMode === EcsFargateTaskTerminationDetectionMode.NON_ZERO_EXIT_CODE) {
    return attachBranches(base, exitBranches);
  }

  if (options.detectionMode === EcsFargateTaskTerminationDetectionMode.TASK_FAILED_TO_START) {
    return attachBranches(base, startupBranches);
  }

  if (options.detectionMode === EcsFargateTaskTerminationDetectionMode.ALL_FAILURES) {
    return attachBranches(base, [...exitBranches, ...startupBranches]);
  }

  throw new Error(`Unsupported detectionMode: ${options.detectionMode}`);
};

/**
 * Builds the full EventBridge event pattern for the construct.
 *
 * Resolves the default stop-code and `stoppedReason` exclusions when those
 * options are omitted.
 *
 * @param options - Cluster, scope, detection mode, and the optional exclusions.
 * @returns Event pattern targeting `aws.ecs` / `ECS Task State Change`.
 * @throws Error if the cluster or service selection is invalid.
 * @throws Error if `options.excludedStopCodes`, `options.excludedStoppedReasonPrefixes`,
 *   or `options.startupFailureStoppedReasonPrefixes` contains an empty string.
 * @throws Error if `options.containerNames` is empty or contains an empty string.
 * @throws Error if `options.ignoredExitCodes` contains a non-integer.
 * @throws Error if `options.detectionMode` is unsupported.
 */
const buildEventPattern = (options: EventPatternOptions): EventPattern => {
  // Service selection is checked first so an invalid combination fails before
  // the cluster fallback reads `service.cluster`.
  const taskGroups = resolveTaskGroups(options.scope);
  const clusterArns = resolveClusterArns(options.cluster);

  return {
    source: [ECS_EVENT_SOURCE],
    detailType: [ECS_TASK_STATE_CHANGE_DETAIL_TYPE],
    detail: buildFailureDetail({
      clusterArns,
      taskGroups,
      taskDefinitionArn: options.scope.taskDefinitionArn,
      detectionMode: options.detectionMode,
      excludedStopCodes: resolveExcludedStopCodes(options.excludedStopCodes),
      excludedStoppedReasonPrefixes: resolveExcludedStoppedReasonPrefixes(options.excludedStoppedReasonPrefixes),
      startupFailureStoppedReasonPrefixes: resolveStartupFailureStoppedReasonPrefixes(
        options.startupFailureStoppedReasonPrefixes,
      ),
      containerNames: resolveContainerNames(options.containerNames),
      ignoredExitCodes: resolveIgnoredExitCodes(options.ignoredExitCodes),
    }),
  };
};

/**
 * How {@link EcsFargateTaskTerminationDetectionEventRule} matches ECS/Fargate
 * task failure events in its EventBridge pattern.
 */
export enum EcsFargateTaskTerminationDetectionMode {
  /**
   * Detect only container exits with a non-zero `exitCode`, ignoring codes in
   * `ignoredExitCodes`.
   *
   * Does not match startup failures where `containers.exitCode` is absent.
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
 * {@link EcsTaskStopCode} values. `ALL` is frozen. Mutating it throws.
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
   * The array is frozen. Spread it to extend the set. Mutating it throws,
   * so the library default cannot be changed.
   * `Object.freeze` is readonly, and jsii rejects a getter named `ALL`.
   * The cast keeps `ALL` assignable to `string[]`.
   */
  public static readonly ALL: string[] = Object.freeze([
    DefaultExcludedStopCodes.USER_INITIATED,
    DefaultExcludedStopCodes.SPOT_INTERRUPTION,
  ]) as string[];
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
 * and append extra prefixes. `ALL` is frozen. Mutating it throws.
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
   * The array is frozen. Spread it to extend the set. Mutating it throws,
   * so the library default cannot be changed.
   * `Object.freeze` is readonly, and jsii rejects a getter named `ALL`.
   * The cast keeps `ALL` assignable to `string[]`.
   */
  public static readonly ALL: string[] = Object.freeze([
    DefaultExcludedStoppedReasonPrefixes.SCALING_ACTIVITY_INITIATED_BY,
    DefaultExcludedStoppedReasonPrefixes.TASK_STOPPED_BY_USER,
    DefaultExcludedStoppedReasonPrefixes.SPOT_TASK_INTERRUPTED,
  ]) as string[];
}

/**
 * Default `stoppedReason` prefixes that match a startup failure when `stopCode`
 * is absent.
 *
 * `stopCode` `TaskFailedToStart` is matched separately and does not use this list.
 *
 * Override via {@link EcsFargateTaskTerminationDetectionEventRuleProps.startupFailureStoppedReasonPrefixes}.
 * To extend this set, spread {@link DefaultStartupFailureStoppedReasonPrefixes.ALL}.
 * `ALL` is frozen. Mutating it throws.
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
   * The array is frozen. Spread it to extend the set. Mutating it throws,
   * so the library default cannot be changed.
   * `Object.freeze` is readonly, and jsii rejects a getter named `ALL`.
   * The cast keeps `ALL` assignable to `string[]`.
   */
  public static readonly ALL: string[] = Object.freeze([
    DefaultStartupFailureStoppedReasonPrefixes.CANNOT_PULL_CONTAINER_ERROR,
    DefaultStartupFailureStoppedReasonPrefixes.RESOURCE_INITIALIZATION_ERROR,
    DefaultStartupFailureStoppedReasonPrefixes.CANNOT_START_CONTAINER_ERROR,
    DefaultStartupFailureStoppedReasonPrefixes.TASK_FAILED_TO_START,
  ]) as string[];
}

/**
 * Properties for {@link EcsFargateTaskTerminationDetectionEventRule}.
 *
 * Extends EventBridge {@link RuleProps}, except `eventPattern` which must not
 * be set (this construct always owns the pattern).
 */
export interface EcsFargateTaskTerminationDetectionEventRuleProps extends RuleProps {
  /**
   * ECS cluster to monitor.
   *
   * The rule uses `cluster.clusterArn`. A cluster created in the same stack
   * stays a CloudFormation token until deploy.
   *
   * Set this, {@link EcsFargateTaskTerminationDetectionEventRuleProps.clusterArn},
   * or {@link EcsFargateTaskTerminationDetectionEventRuleProps.clusterArns}.
   * When {@link EcsFargateTaskTerminationDetectionEventRuleProps.service} is set
   * and none of those are set, the service's cluster is used.
   *
   * The rule matches only tasks whose `launchType` is `FARGATE`. EC2 and
   * EXTERNAL tasks in the same cluster are ignored. Fargate Spot tasks stay in
   * scope because their `launchType` remains `FARGATE`.
   */
  readonly cluster?: ICluster;

  /**
   * ARN of one ECS cluster to monitor.
   *
   * Set this, {@link EcsFargateTaskTerminationDetectionEventRuleProps.cluster},
   * or {@link EcsFargateTaskTerminationDetectionEventRuleProps.clusterArns}.
   * The value is placed in the pattern as given, including a CloudFormation token.
   * An empty string is kept as given.
   */
  readonly clusterArn?: string;

  /**
   * ARNs of the ECS clusters to monitor.
   *
   * Each ARN is an alternative match. The list must contain at least one ARN.
   * Set this, {@link EcsFargateTaskTerminationDetectionEventRuleProps.cluster},
   * or {@link EcsFargateTaskTerminationDetectionEventRuleProps.clusterArn}.
   */
  readonly clusterArns?: string[];

  /**
   * ECS service name used to narrow matching to one service.
   *
   * Matched as `detail.group` equal to `service:${serviceName}`. Omit to
   * match every Fargate task in the selected clusters. Pass the service name
   * only, without the `service:` prefix.
   *
   * Cannot be set together with `serviceNames`, `service`, or `group`.
   */
  readonly serviceName?: string;

  /**
   * ECS service names used to narrow matching to those services.
   *
   * Each name is matched as `detail.group` equal to `service:${name}`. Any
   * listed service matches. Pass service names only, without the `service:` prefix.
   *
   * Cannot be set together with `serviceName`, `service`, or `group`.
   */
  readonly serviceNames?: string[];

  /**
   * ECS service to monitor.
   *
   * The rule matches `detail.group` equal to `service:${service.serviceName}`.
   * When `cluster`, `clusterArn`, and `clusterArns` are all omitted, it also
   * uses `service.cluster`. When a cluster input is set as well, that input
   * selects the cluster and this property only selects the service name.
   *
   * Cannot be set together with `serviceName`, `serviceNames`, or `group`.
   */
  readonly service?: IBaseService;

  /**
   * Raw ECS task group used to narrow matching.
   *
   * Matched exactly against `detail.group`. Use this for a non-service task
   * group. For an ECS service, use `serviceName`, `serviceNames`, or `service`.
   *
   * Cannot be set together with `serviceName`, `serviceNames`, or `service`.
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
   * Container names to monitor.
   *
   * The rule matches when one of these containers satisfies the failure
   * condition. Other containers in the task are ignored. Applies to both the
   * non-zero exit branch and the startup-failure branch. Omit to match any
   * container.
   */
  readonly containerNames?: string[];

  /**
   * Container exit codes to ignore, in addition to the successful code `0`.
   *
   * Applies only to non-zero exit matching. For example, `143` drops SIGTERM
   * exits that are not already excluded by `stopCode` or `stoppedReason`.
   * Startup-failure matching is unchanged. `0` is always ignored.
   *
   * @default - only exit code 0 is ignored
   */
  readonly ignoredExitCodes?: number[];

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
   * `ALL` is frozen. Mutating it throws.
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
   * `ALL` is frozen. Mutating it throws.
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
   * {@link DefaultStartupFailureStoppedReasonPrefixes.ALL}.
   * `ALL` is frozen. Mutating it throws.
   * Pass an empty array to match startup failures only by `stopCode` `TaskFailedToStart`.
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
 * The pattern is scoped to the selected clusters and to `launchType` `FARGATE`.
 * Optional `serviceName`, `serviceNames`, `service`, `group`, `taskDefinitionArn`,
 * and `containerNames` narrow that scope further. `ignoredExitCodes` drops more
 * exit codes on the non-zero exit branch.
 */
export class EcsFargateTaskTerminationDetectionEventRule extends Rule {
  /**
   * Creates a new {@link EcsFargateTaskTerminationDetectionEventRule}.
   *
   * @param scope - Parent construct.
   * @param id - Construct identifier.
   * @param props - Rule properties. Set `cluster`, `clusterArn`, `clusterArns`, or `service`.
   * @throws Error if `props.eventPattern` is provided. This construct always
   *   manages its own `eventPattern`.
   * @throws Error if more than one of `cluster`, `clusterArn`, and `clusterArns` is set.
   * @throws Error if none of `cluster`, `clusterArn`, `clusterArns`, and `service` is set.
   * @throws Error if `clusterArns` is empty or contains an empty string.
   * @throws Error if more than one of `serviceName`, `serviceNames`, `service`, and `group` is set.
   * @throws Error if `serviceName`, `serviceNames`, `service.serviceName`, `group`,
   *   or `taskDefinitionArn` is empty.
   * @throws Error if a service name starts with `service:`.
   * @throws Error if `containerNames` is empty or contains an empty string.
   * @throws Error if `ignoredExitCodes` contains a non-integer.
   * @throws Error if `props.excludedStopCodes`, `props.excludedStoppedReasonPrefixes`,
   *   or `props.startupFailureStoppedReasonPrefixes` contains an empty string.
   * @throws Error if `props.detectionMode` is unsupported.
   */
  constructor(scope: Construct, id: string, props: EcsFargateTaskTerminationDetectionEventRuleProps) {
    const {
      eventPattern: providedEventPattern,
      cluster,
      clusterArn,
      clusterArns,
      detectionMode = EcsFargateTaskTerminationDetectionMode.ALL_FAILURES,
      excludedStopCodes,
      excludedStoppedReasonPrefixes,
      startupFailureStoppedReasonPrefixes,
      serviceName,
      serviceNames,
      service,
      group,
      taskDefinitionArn,
      containerNames,
      ignoredExitCodes,
      ...restProps
    } = props;

    if (providedEventPattern) {
      throw new Error('eventPattern is not allowed to be set for EcsFargateTaskTerminationDetectionEventRule.');
    }

    super(scope, id, {
      ...restProps,
      eventPattern: buildEventPattern({
        cluster: {
          cluster,
          clusterArn,
          clusterArns,
          service,
        },
        detectionMode,
        excludedStopCodes,
        excludedStoppedReasonPrefixes,
        startupFailureStoppedReasonPrefixes,
        containerNames,
        ignoredExitCodes,
        scope: {
          serviceName,
          serviceNames,
          service,
          group,
          taskDefinitionArn,
        },
      }),
    });
  }
}
