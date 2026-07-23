import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as events from 'aws-cdk-lib/aws-events';
import {
  EcsFargateTaskTerminationDetectionEventRule,
  EcsFargateTaskTerminationDetectionMode,
} from '../src';

describe('EcsFargateTaskTerminationDetectionNotificationEventRule Testing', () => {
  const app = new App();
  const stack = new Stack(app, 'TestingStack', {
    env: {
      account: '123456789012',
      region: 'us-east-1',
    },
  });

  const clusterArn = 'arn:aws:ecs:us-east-1:123456789012:cluster/example-app-cluster';

  const rule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'EcsFargateTaskTerminationDetectionEventRule', {
    ruleName: 'example-event-rule',
    description: 'example event rule.',
    clusterArn,
  });

  it('should be a Rule', () => {
    expect(rule).toBeInstanceOf(events.Rule);
  });

  const template = Template.fromStack(stack);

  it('should match all failures by default (non-zero exitCode or startup failure)', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      EventPattern: Match.objectEquals({
        'source': ['aws.ecs'],
        'detail-type': ['ECS Task State Change'],
        'detail': {
          clusterArn,
          lastStatus: ['STOPPED'],
          $or: [
            {
              containers: {
                exitCode: [
                  { 'anything-but': 0 },
                ],
              },
              stoppedReason: [
                {
                  'anything-but': { prefix: 'Scaling activity initiated by' },
                },
              ],
            },
            {
              stopCode: ['TaskFailedToStart'],
            },
            {
              stoppedReason: [
                { prefix: 'CannotPullContainerError' },
                { prefix: 'ResourceInitializationError' },
              ],
            },
          ],
        },
      }),
    });
  });

  it('should match only non-zero exit codes when detectionMode is NON_ZERO_EXIT_CODE', () => {
    const modeApp = new App();
    const modeStack = new Stack(modeApp, 'NonZeroExitCodeModeStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });

    new EcsFargateTaskTerminationDetectionEventRule(modeStack, 'NonZeroExitCodeRule', {
      clusterArn,
      detectionMode: EcsFargateTaskTerminationDetectionMode.NON_ZERO_EXIT_CODE,
    });

    Template.fromStack(modeStack).hasResourceProperties('AWS::Events::Rule', {
      EventPattern: Match.objectEquals({
        'source': ['aws.ecs'],
        'detail-type': ['ECS Task State Change'],
        'detail': {
          clusterArn,
          lastStatus: ['STOPPED'],
          containers: {
            exitCode: [
              { 'anything-but': 0 },
            ],
          },
          stoppedReason: [
            {
              'anything-but': { prefix: 'Scaling activity initiated by' },
            },
          ],
        },
      }),
    });
  });

  it('should match only startup failures when detectionMode is TASK_FAILED_TO_START', () => {
    const modeApp = new App();
    const modeStack = new Stack(modeApp, 'TaskFailedToStartModeStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });

    new EcsFargateTaskTerminationDetectionEventRule(modeStack, 'TaskFailedToStartRule', {
      clusterArn,
      detectionMode: EcsFargateTaskTerminationDetectionMode.TASK_FAILED_TO_START,
    });

    Template.fromStack(modeStack).hasResourceProperties('AWS::Events::Rule', {
      EventPattern: Match.objectEquals({
        'source': ['aws.ecs'],
        'detail-type': ['ECS Task State Change'],
        'detail': {
          clusterArn,
          lastStatus: ['STOPPED'],
          $or: [
            {
              stopCode: ['TaskFailedToStart'],
            },
            {
              stoppedReason: [
                { prefix: 'CannotPullContainerError' },
                { prefix: 'ResourceInitializationError' },
              ],
            },
          ],
        },
      }),
    });
  });

  it('should throw when eventPattern is provided', () => {
    expect(() => {
      new EcsFargateTaskTerminationDetectionEventRule(stack, 'EcsFargateTaskTerminationDetectionEventRuleWithEventPattern', {
        clusterArn,
        ruleName: 'codepipeline-state-change-detection-event-rule',
        eventPattern: {
          source: ['aws.ecs'],
          detailType: ['ECS Task State Change'],
        },
      });
    }).toThrow('eventPattern is not allowed to be set for EcsFargateTaskTerminationDetectionEventRule.');
  });

  it('should match the snapshot', () => {
    expect(template.toJSON()).toMatchSnapshot();
  });
});
