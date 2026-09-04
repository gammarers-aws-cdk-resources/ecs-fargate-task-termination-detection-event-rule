import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as events from 'aws-cdk-lib/aws-events';
import {
  DefaultExcludedStoppedReasonPrefixes,
  EcsFargateTaskTerminationDetectionEventRule,
  EcsFargateTaskTerminationDetectionMode,
} from '../src';

const clusterArn = 'arn:aws:ecs:us-east-1:123456789012:cluster/example-app-cluster';

const createTestStack = (id: string): Stack => {
  const app = new App();
  return new Stack(app, id, {
    env: {
      account: '123456789012',
      region: 'us-east-1',
    },
  });
};

const defaultStoppedReasonExclusion = {
  'anything-but': {
    prefix: [
      'Scaling activity initiated by',
      'Task stopped by user',
      'Your Spot Task was interrupted',
    ],
  },
};

describe('EcsFargateTaskTerminationDetectionNotificationEventRule Testing', () => {
  const stack = createTestStack('TestingStack');

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
                defaultStoppedReasonExclusion,
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

  it('should document the default excluded stoppedReason prefixes', () => {
    expect(DefaultExcludedStoppedReasonPrefixes.ALL).toEqual([
      DefaultExcludedStoppedReasonPrefixes.SCALING_ACTIVITY_INITIATED_BY,
      DefaultExcludedStoppedReasonPrefixes.TASK_STOPPED_BY_USER,
      DefaultExcludedStoppedReasonPrefixes.SPOT_TASK_INTERRUPTED,
    ]);
    expect(DefaultExcludedStoppedReasonPrefixes.ALL).toEqual([
      'Scaling activity initiated by',
      'Task stopped by user',
      'Your Spot Task was interrupted',
    ]);
  });

  it('should match only non-zero exit codes when detectionMode is NON_ZERO_EXIT_CODE', () => {
    const modeStack = createTestStack('NonZeroExitCodeModeStack');

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
            defaultStoppedReasonExclusion,
          ],
        },
      }),
    });
  });

  it('should match only startup failures when detectionMode is TASK_FAILED_TO_START', () => {
    const modeStack = createTestStack('TaskFailedToStartModeStack');

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

  it('should replace default excluded stoppedReason prefixes when excludedStoppedReasonPrefixes is set', () => {
    const customStack = createTestStack('CustomExcludedPrefixesStack');

    new EcsFargateTaskTerminationDetectionEventRule(customStack, 'CustomExcludedPrefixesRule', {
      clusterArn,
      excludedStoppedReasonPrefixes: ['Task stopped by user'],
    });

    Template.fromStack(customStack).hasResourceProperties('AWS::Events::Rule', {
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
                  'anything-but': { prefix: ['Task stopped by user'] },
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

  it('should extend default excluded stoppedReason prefixes when the default set is spread', () => {
    const extendedStack = createTestStack('ExtendedExcludedPrefixesStack');

    new EcsFargateTaskTerminationDetectionEventRule(extendedStack, 'ExtendedExcludedPrefixesRule', {
      clusterArn,
      excludedStoppedReasonPrefixes: [
        ...DefaultExcludedStoppedReasonPrefixes.ALL,
        'Task stopped due to a platform version update',
      ],
    });

    Template.fromStack(extendedStack).hasResourceProperties('AWS::Events::Rule', {
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
                  'anything-but': {
                    prefix: [
                      'Scaling activity initiated by',
                      'Task stopped by user',
                      'Your Spot Task was interrupted',
                      'Task stopped due to a platform version update',
                    ],
                  },
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

  it('should omit stoppedReason exclusion when excludedStoppedReasonPrefixes is empty', () => {
    const emptyStack = createTestStack('EmptyExcludedPrefixesStack');

    new EcsFargateTaskTerminationDetectionEventRule(emptyStack, 'EmptyExcludedPrefixesRule', {
      clusterArn,
      detectionMode: EcsFargateTaskTerminationDetectionMode.NON_ZERO_EXIT_CODE,
      excludedStoppedReasonPrefixes: [],
    });

    Template.fromStack(emptyStack).hasResourceProperties('AWS::Events::Rule', {
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

  it('should throw when excludedStoppedReasonPrefixes contains an empty string', () => {
    expect(() => {
      new EcsFargateTaskTerminationDetectionEventRule(stack, 'EmptyPrefixRule', {
        clusterArn,
        excludedStoppedReasonPrefixes: ['Scaling activity initiated by', ''],
      });
    }).toThrow('excludedStoppedReasonPrefixes must not contain empty strings.');
  });

  it('should match the snapshot', () => {
    expect(template.toJSON()).toMatchSnapshot();
  });
});
