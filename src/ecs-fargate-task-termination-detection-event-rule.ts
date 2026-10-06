import { Rule } from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
import { buildEventPattern } from './core/event-pattern';
import {
  EcsFargateTaskTerminationDetectionEventRuleProps,
  EcsFargateTaskTerminationDetectionMode,
} from './core/public-types';

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

    super(scope, id, {
      ...restProps,
      eventPattern: buildEventPattern(
        clusterArn,
        detectionMode,
        excludedStoppedReasonPrefixes,
        {
          serviceName,
          group,
          taskDefinitionArn,
        },
      ),
    });
  }
}
