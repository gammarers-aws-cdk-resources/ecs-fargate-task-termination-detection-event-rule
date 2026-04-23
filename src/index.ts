import { Rule, EventPattern, RuleProps } from 'aws-cdk-lib/aws-events';
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
 * This rule sets its own `eventPattern`. Providing `props.eventPattern` is not supported.
 */
export class EcsFargateTaskTerminationDetectionEventRule extends Rule {

  /**
   * Creates a new {@link EcsFargateTaskTerminationDetectionEventRule}.
   *
   * @throws if `props.eventPattern` is provided.
   */
  constructor(scope: Construct, id: string, props: EcsFargateTaskTerminationDetectionEventRuleProps) {
    super(scope, id, {
      ...props,
      eventPattern: ((): EventPattern => {
        if (props.eventPattern) {
          throw new Error('eventPattern is not allowed to be set for EcsFargateTaskTerminationDetectionEventRule.');
        }
        return {
          source: ['aws.ecs'],
          detailType: ['ECS Task State Change'],
          detail: {
            clusterArn: props.clusterArn,
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
        };
      })(),
    });
  }
}