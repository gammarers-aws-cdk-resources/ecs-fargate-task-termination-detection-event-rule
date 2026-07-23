import { EventPattern, Rule, RuleProps } from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';

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
 * Properties for {@link EcsFargateTaskTerminationDetectionEventRule}.
 *
 * Extends EventBridge {@link RuleProps}, except `eventPattern` which must not
 * be set (this construct always owns the pattern).
 */
export interface EcsFargateTaskTerminationDetectionEventRuleProps extends RuleProps {
  /**
   * ARN of the ECS cluster to monitor.
   *
   * Used to scope the EventBridge rule to task state change events from the
   * specified cluster.
   */
  readonly clusterArn: string;

  /**
   * How task failures are matched in the EventBridge event pattern.
   *
   * @default EcsFargateTaskTerminationDetectionMode.ALL_FAILURES
   */
  readonly detectionMode?: EcsFargateTaskTerminationDetectionMode;
}

/**
 * EventBridge matcher that excludes expected ECS scaling stop reasons.
 */
const SCALING_STOPPED_REASON_EXCLUSION = {
  'anything-but': { prefix: 'Scaling activity initiated by' },
};

/**
 * `$or` branch for non-zero container exit codes.
 *
 * Scaling stop reasons are excluded in the same branch so EventBridge does not
 * combine a top-level `stoppedReason` filter with `$or` branches that also
 * match on `stoppedReason`.
 */
const NON_ZERO_EXIT_CODE_CONDITION = {
  containers: {
    exitCode: [
      { 'anything-but': 0 },
    ],
  },
  stoppedReason: [SCALING_STOPPED_REASON_EXCLUSION],
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
 * Builds the EventBridge `detail` filter for the selected detection mode.
 *
 * @param clusterArn - ECS cluster ARN used to scope matching events.
 * @param detectionMode - Failure matching strategy.
 * @returns Event pattern `detail` object for the given mode.
 * @throws Error if `detectionMode` is unsupported.
 */
const buildFailureDetail = (
  clusterArn: string,
  detectionMode: EcsFargateTaskTerminationDetectionMode,
): Record<string, unknown> => {
  const base = {
    clusterArn,
    lastStatus: ['STOPPED'],
  };

  if (detectionMode === EcsFargateTaskTerminationDetectionMode.NON_ZERO_EXIT_CODE) {
    return {
      ...base,
      ...NON_ZERO_EXIT_CODE_CONDITION,
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
        NON_ZERO_EXIT_CODE_CONDITION,
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
 * @returns Event pattern targeting `aws.ecs` / `ECS Task State Change`.
 */
const buildEventPattern = (
  clusterArn: string,
  detectionMode: EcsFargateTaskTerminationDetectionMode,
): EventPattern => ({
  source: ['aws.ecs'],
  detailType: ['ECS Task State Change'],
  detail: buildFailureDetail(clusterArn, detectionMode),
});

/**
 * EventBridge rule that detects ECS/Fargate task terminations caused by
 * unexpected failures, while excluding expected scaling events.
 *
 * By default this matches both non-zero container exit codes and startup/pull
 * failures where `exitCode` is absent (for example `CannotPullContainerError`
 * / `TaskFailedToStart`). Use {@link EcsFargateTaskTerminationDetectionMode}
 * to narrow the match if needed.
 *
 * This rule defines its own `eventPattern` and does not accept `props.eventPattern`.
 * The pattern is scoped to the given `clusterArn`.
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
   */
  constructor(scope: Construct, id: string, props: EcsFargateTaskTerminationDetectionEventRuleProps) {
    const {
      eventPattern: providedEventPattern,
      clusterArn,
      detectionMode = EcsFargateTaskTerminationDetectionMode.ALL_FAILURES,
      ...restProps
    } = props;

    if (providedEventPattern) {
      throw new Error('eventPattern is not allowed to be set for EcsFargateTaskTerminationDetectionEventRule.');
    }

    super(scope, id, {
      ...restProps,
      eventPattern: buildEventPattern(clusterArn, detectionMode),
    });
  }
}
