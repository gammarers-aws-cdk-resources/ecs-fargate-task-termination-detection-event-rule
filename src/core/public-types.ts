import { RuleProps } from 'aws-cdk-lib/aws-events';

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
