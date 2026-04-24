import { Rule, RuleProps } from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';

/**
 * Properties for {@link EcsFargateTaskTerminationDetectionEventRule}.
 */
export interface EcsFargateTaskTerminationDetectionEventRuleProps extends RuleProps {
  /**
   * ARN of the ECS cluster to monitor.
   *
   * This is used to scope the EventBridge rule to task state changes emitted
   * by the specified cluster.
   */
  readonly clusterArn: string;
}

/**
 * EventBridge rule that detects ECS/Fargate task terminations caused by
 * non-zero container exit codes, while excluding expected scaling events.
 *
 * This rule defines its own `eventPattern` and does not accept `props.eventPattern`.
 * The pattern is scoped to the given `clusterArn`.
 */
export class EcsFargateTaskTerminationDetectionEventRule extends Rule {

  /**
   * Creates a new {@link EcsFargateTaskTerminationDetectionEventRule}.
   *
   * @throws if `props.eventPattern` is provided. This construct always manages its own `eventPattern`.
   */
  constructor(scope: Construct, id: string, props: EcsFargateTaskTerminationDetectionEventRuleProps) {
    const { eventPattern: providedEventPattern, clusterArn, ...restProps } = props;
    if (providedEventPattern) {
      throw new Error('eventPattern is not allowed to be set for EcsFargateTaskTerminationDetectionEventRule.');
    }

    super(scope, id, {
      ...restProps,
      eventPattern: {
        source: ['aws.ecs'],
        detailType: ['ECS Task State Change'],
        detail: {
          clusterArn,
          containers: {
            exitCode: [
              { 'anything-but': 0 },
            ],
          },
          lastStatus: ['STOPPED'],
          stoppedReason: [
            {
              'anything-but': { prefix: 'Scaling activity initiated by' },
            },
          ],
        },
      },
    });
  }
}