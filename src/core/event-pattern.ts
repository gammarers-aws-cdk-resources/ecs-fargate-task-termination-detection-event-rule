import { LaunchType } from 'aws-cdk-lib/aws-ecs';
import { EventPattern } from 'aws-cdk-lib/aws-events';
import {
  DefaultExcludedStoppedReasonPrefixes,
  EcsFargateTaskTerminationDetectionMode,
} from './public-types';

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
 * ECS `stopCode` when the task never reached a running container.
 */
const STOP_CODE_TASK_FAILED_TO_START = 'TaskFailedToStart';

/**
 * `stoppedReason` prefix for an image pull failure.
 */
const CANNOT_PULL_CONTAINER_ERROR_PREFIX = 'CannotPullContainerError';

/**
 * `stoppedReason` prefix for an ENI or secrets initialization failure.
 */
const RESOURCE_INITIALIZATION_ERROR_PREFIX = 'ResourceInitializationError';

/**
 * Container `exitCode` for a successful exit. Any other code is a failure.
 */
const SUCCESSFUL_CONTAINER_EXIT_CODE = 0;

/**
 * Prefix ECS writes on `detail.group` for tasks that belong to a service.
 */
const ECS_SERVICE_GROUP_PREFIX = 'service:';

/**
 * EventBridge `anything-but` prefix matcher for `stoppedReason`.
 */
interface StoppedReasonPrefixExclusion {
  readonly 'anything-but': {
    readonly prefix: string[];
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
        { 'anything-but': SUCCESSFUL_CONTAINER_EXIT_CODE },
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
  stopCode: [STOP_CODE_TASK_FAILED_TO_START],
};

/**
 * `$or` branch with `stoppedReason` prefix matches for common startup failures
 * where `exitCode` is often absent.
 *
 * Used as a fallback when `stopCode` is not present on the event.
 */
const TASK_FAILED_TO_START_STOPPED_REASON_CONDITION = {
  stoppedReason: [
    { prefix: CANNOT_PULL_CONTAINER_ERROR_PREFIX },
    { prefix: RESOURCE_INITIALIZATION_ERROR_PREFIX },
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
    lastStatus: [TASK_LAST_STATUS_STOPPED],
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
 * Resolves the default `stoppedReason` exclusions when `excludedStoppedReasonPrefixes`
 * is omitted.
 *
 * @param clusterArn - ECS cluster ARN used to scope matching events.
 * @param detectionMode - Failure matching strategy.
 * @param excludedStoppedReasonPrefixes - `stoppedReason` prefixes excluded from
 *   non-zero exit-code matching, or `undefined` for the default set.
 * @param scope - Optional service, task group, and task definition filters.
 * @returns Event pattern targeting `aws.ecs` / `ECS Task State Change`.
 * @throws Error if `excludedStoppedReasonPrefixes` contains an empty string.
 * @throws Error if `scope.serviceName` and `scope.group` are both set.
 * @throws Error if a scope value is an empty string, or if `scope.serviceName`
 *   starts with `service:`.
 * @throws Error if `detectionMode` is unsupported.
 */
export const buildEventPattern = (
  clusterArn: string,
  detectionMode: EcsFargateTaskTerminationDetectionMode,
  excludedStoppedReasonPrefixes: string[] | undefined,
  scope: TaskScopeFilters,
): EventPattern => ({
  source: [ECS_EVENT_SOURCE],
  detailType: [ECS_TASK_STATE_CHANGE_DETAIL_TYPE],
  detail: buildFailureDetail(
    clusterArn,
    detectionMode,
    resolveExcludedStoppedReasonPrefixes(excludedStoppedReasonPrefixes),
    scope,
  ),
});
