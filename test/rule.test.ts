import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as events from 'aws-cdk-lib/aws-events';
import {
  DefaultExcludedStoppedReasonPrefixes,
  EcsFargateTaskTerminationDetectionEventRule,
  EcsFargateTaskTerminationDetectionMode,
} from '../src';
import { eventMatchesPattern, readEventPattern } from './match-event-pattern';
import { buildEventPattern } from '../src/core/event-pattern';

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

describe('EcsFargateTaskTerminationDetectionEventRule', () => {
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
  const defaultPattern = readEventPattern(template.toJSON());

  const serviceMatchStack = createTestStack('ServiceMatchStack');
  new EcsFargateTaskTerminationDetectionEventRule(serviceMatchStack, 'ServiceMatchRule', {
    clusterArn,
    serviceName: 'example-api',
  });
  const servicePattern = readEventPattern(Template.fromStack(serviceMatchStack).toJSON());

  it('should match all failures by default (non-zero exitCode or startup failure)', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      EventPattern: Match.objectEquals({
        'source': ['aws.ecs'],
        'detail-type': ['ECS Task State Change'],
        'detail': {
          clusterArn,
          launchType: ['FARGATE'],
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
          launchType: ['FARGATE'],
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
          launchType: ['FARGATE'],
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
          launchType: ['FARGATE'],
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
          launchType: ['FARGATE'],
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
          launchType: ['FARGATE'],
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

  it('should narrow matching to one ECS service when serviceName is set', () => {
    const serviceStack = createTestStack('ServiceNameStack');

    new EcsFargateTaskTerminationDetectionEventRule(serviceStack, 'ServiceNameRule', {
      clusterArn,
      serviceName: 'example-api',
    });

    Template.fromStack(serviceStack).hasResourceProperties('AWS::Events::Rule', {
      EventPattern: Match.objectEquals({
        'source': ['aws.ecs'],
        'detail-type': ['ECS Task State Change'],
        'detail': {
          clusterArn,
          launchType: ['FARGATE'],
          group: ['service:example-api'],
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

  it('should narrow matching to a raw task group when group is set', () => {
    const groupStack = createTestStack('TaskGroupStack');

    new EcsFargateTaskTerminationDetectionEventRule(groupStack, 'TaskGroupRule', {
      clusterArn,
      group: 'family:example-worker',
    });

    Template.fromStack(groupStack).hasResourceProperties('AWS::Events::Rule', {
      EventPattern: Match.objectEquals({
        'source': ['aws.ecs'],
        'detail-type': ['ECS Task State Change'],
        'detail': {
          clusterArn,
          launchType: ['FARGATE'],
          group: ['family:example-worker'],
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

  it('should narrow matching to a task definition when taskDefinitionArn is set', () => {
    const taskDefinitionStack = createTestStack('TaskDefinitionArnStack');
    const taskDefinitionArn = 'arn:aws:ecs:us-east-1:123456789012:task-definition/example-api:3';

    new EcsFargateTaskTerminationDetectionEventRule(taskDefinitionStack, 'TaskDefinitionArnRule', {
      clusterArn,
      taskDefinitionArn,
    });

    Template.fromStack(taskDefinitionStack).hasResourceProperties('AWS::Events::Rule', {
      EventPattern: Match.objectEquals({
        'source': ['aws.ecs'],
        'detail-type': ['ECS Task State Change'],
        'detail': {
          clusterArn,
          launchType: ['FARGATE'],
          taskDefinitionArn: [taskDefinitionArn],
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

  it('should apply serviceName and taskDefinitionArn together', () => {
    const combinedStack = createTestStack('CombinedScopeStack');
    const taskDefinitionArn = 'arn:aws:ecs:us-east-1:123456789012:task-definition/example-api:3';

    new EcsFargateTaskTerminationDetectionEventRule(combinedStack, 'CombinedScopeRule', {
      clusterArn,
      serviceName: 'example-api',
      taskDefinitionArn,
    });

    Template.fromStack(combinedStack).hasResourceProperties('AWS::Events::Rule', {
      EventPattern: Match.objectEquals({
        'source': ['aws.ecs'],
        'detail-type': ['ECS Task State Change'],
        'detail': {
          clusterArn,
          launchType: ['FARGATE'],
          group: ['service:example-api'],
          taskDefinitionArn: [taskDefinitionArn],
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

  it('should throw when serviceName and group are both set', () => {
    expect(() => {
      new EcsFargateTaskTerminationDetectionEventRule(stack, 'ConflictingScopeRule', {
        clusterArn,
        serviceName: 'example-api',
        group: 'service:example-api',
      });
    }).toThrow(
      'serviceName and group cannot both be set. Use serviceName for an ECS service, or group for a raw task group.',
    );
  });

  it.each([
    ['serviceName', { serviceName: '' }],
    ['group', { group: '' }],
    ['taskDefinitionArn', { taskDefinitionArn: '' }],
  ])('should throw when %s is empty', (propertyName, scopeProps) => {
    expect(() => {
      new EcsFargateTaskTerminationDetectionEventRule(stack, `Empty${propertyName}Rule`, {
        clusterArn,
        ...scopeProps,
      });
    }).toThrow(`${propertyName} must not be empty.`);
  });

  it('should throw when serviceName includes the service: prefix', () => {
    expect(() => {
      new EcsFargateTaskTerminationDetectionEventRule(stack, 'PrefixedServiceNameRule', {
        clusterArn,
        serviceName: 'service:example-api',
      });
    }).toThrow(
      'serviceName must be the ECS service name without the "service:" prefix. Use group to match a raw task group.',
    );
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

  it('should throw when detectionMode is unsupported', () => {
    expect(() => {
      buildEventPattern(
        clusterArn,
        'UNSUPPORTED' as EcsFargateTaskTerminationDetectionMode,
        undefined,
        {},
      );
    }).toThrow('Unsupported detectionMode: UNSUPPORTED');
  });

  it('should throw when excludedStoppedReasonPrefixes contains an empty string', () => {
    expect(() => {
      new EcsFargateTaskTerminationDetectionEventRule(stack, 'EmptyPrefixRule', {
        clusterArn,
        excludedStoppedReasonPrefixes: ['Scaling activity initiated by', ''],
      });
    }).toThrow('excludedStoppedReasonPrefixes must not contain empty strings.');
  });

  it('should keep an empty clusterArn in the event pattern', () => {
    const emptyClusterStack = createTestStack('EmptyClusterArnStack');

    new EcsFargateTaskTerminationDetectionEventRule(emptyClusterStack, 'EmptyClusterArnRule', {
      clusterArn: '',
    });

    Template.fromStack(emptyClusterStack).hasResourceProperties('AWS::Events::Rule', {
      EventPattern: Match.objectLike({
        detail: {
          clusterArn: '',
        },
      }),
    });
  });

  it('should keep a non-ARN clusterArn in the event pattern', () => {
    const invalidClusterStack = createTestStack('InvalidClusterArnStack');

    new EcsFargateTaskTerminationDetectionEventRule(invalidClusterStack, 'InvalidClusterArnRule', {
      clusterArn: 'not-an-arn',
    });

    Template.fromStack(invalidClusterStack).hasResourceProperties('AWS::Events::Rule', {
      EventPattern: Match.objectLike({
        detail: {
          clusterArn: 'not-an-arn',
        },
      }),
    });
  });

  it('should keep a non-ARN taskDefinitionArn in the event pattern', () => {
    const invalidTaskDefinitionStack = createTestStack('InvalidTaskDefinitionArnStack');

    new EcsFargateTaskTerminationDetectionEventRule(invalidTaskDefinitionStack, 'InvalidTaskDefinitionArnRule', {
      clusterArn,
      taskDefinitionArn: 'not-a-task-definition',
    });

    Template.fromStack(invalidTaskDefinitionStack).hasResourceProperties('AWS::Events::Rule', {
      EventPattern: Match.objectLike({
        detail: {
          taskDefinitionArn: ['not-a-task-definition'],
        },
      }),
    });
  });

  it('should apply serviceName and a custom stoppedReason exclusion together', () => {
    const scopedExclusionStack = createTestStack('ScopedExclusionStack');

    new EcsFargateTaskTerminationDetectionEventRule(scopedExclusionStack, 'ScopedExclusionRule', {
      clusterArn,
      serviceName: 'example-api',
      excludedStoppedReasonPrefixes: ['Task stopped by user'],
    });

    Template.fromStack(scopedExclusionStack).hasResourceProperties('AWS::Events::Rule', {
      EventPattern: Match.objectEquals({
        'source': ['aws.ecs'],
        'detail-type': ['ECS Task State Change'],
        'detail': {
          clusterArn,
          launchType: ['FARGATE'],
          group: ['service:example-api'],
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

  it('should apply group and taskDefinitionArn together', () => {
    const groupAndTaskDefinitionStack = createTestStack('GroupAndTaskDefinitionStack');
    const taskDefinitionArn = 'arn:aws:ecs:us-east-1:123456789012:task-definition/example-worker:2';

    new EcsFargateTaskTerminationDetectionEventRule(groupAndTaskDefinitionStack, 'GroupAndTaskDefinitionRule', {
      clusterArn,
      group: 'family:example-worker',
      taskDefinitionArn,
    });

    Template.fromStack(groupAndTaskDefinitionStack).hasResourceProperties('AWS::Events::Rule', {
      EventPattern: Match.objectEquals({
        'source': ['aws.ecs'],
        'detail-type': ['ECS Task State Change'],
        'detail': {
          clusterArn,
          launchType: ['FARGATE'],
          group: ['family:example-worker'],
          taskDefinitionArn: [taskDefinitionArn],
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

  it('should apply serviceName when detectionMode is NON_ZERO_EXIT_CODE', () => {
    const serviceExitCodeStack = createTestStack('ServiceExitCodeStack');

    new EcsFargateTaskTerminationDetectionEventRule(serviceExitCodeStack, 'ServiceExitCodeRule', {
      clusterArn,
      serviceName: 'example-api',
      detectionMode: EcsFargateTaskTerminationDetectionMode.NON_ZERO_EXIT_CODE,
    });

    Template.fromStack(serviceExitCodeStack).hasResourceProperties('AWS::Events::Rule', {
      EventPattern: Match.objectEquals({
        'source': ['aws.ecs'],
        'detail-type': ['ECS Task State Change'],
        'detail': {
          clusterArn,
          launchType: ['FARGATE'],
          group: ['service:example-api'],
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

  const taskEvent = (detail: Record<string, unknown>): Record<string, unknown> => ({
    'source': 'aws.ecs',
    'detail-type': 'ECS Task State Change',
    'detail': {
      clusterArn,
      launchType: 'FARGATE',
      lastStatus: 'STOPPED',
      group: 'service:example-api',
      ...detail,
    },
  });

  it.each([
    {
      name: 'matches a non-zero container exit',
      pattern: 'default',
      event: taskEvent({
        containers: [{ name: 'app', exitCode: 1 }],
        stoppedReason: 'Essential container in task exited',
        stopCode: 'EssentialContainerExited',
      }),
      expectation: 'match',
    },
    {
      name: 'matches TaskFailedToStart without an exit code',
      pattern: 'default',
      event: taskEvent({
        stoppedReason: 'Task failed to start',
        stopCode: 'TaskFailedToStart',
      }),
      expectation: 'match',
    },
    {
      name: 'matches CannotPullContainerError without an exit code',
      pattern: 'default',
      event: taskEvent({
        stoppedReason: 'CannotPullContainerError: pull access denied',
      }),
      expectation: 'match',
    },
    {
      name: 'matches a Fargate Spot task that exits non-zero',
      pattern: 'default',
      event: taskEvent({
        capacityProviderName: 'FARGATE_SPOT',
        containers: [{ name: 'app', exitCode: 1 }],
        stoppedReason: 'Essential container in task exited',
        stopCode: 'EssentialContainerExited',
      }),
      expectation: 'match',
    },
    {
      name: 'ignores exit code 0',
      pattern: 'default',
      event: taskEvent({
        containers: [{ name: 'app', exitCode: 0 }],
        stoppedReason: 'Essential container in task exited',
        stopCode: 'EssentialContainerExited',
      }),
      expectation: 'miss',
    },
    {
      name: 'ignores scale-in with a non-zero exit',
      pattern: 'default',
      event: taskEvent({
        containers: [{ name: 'app', exitCode: 143 }],
        stoppedReason: 'Scaling activity initiated by (deployment ecs-svc/123)',
        stopCode: 'ServiceSchedulerInitiated',
      }),
      expectation: 'miss',
    },
    {
      name: 'ignores a user stop with a non-zero exit',
      pattern: 'default',
      event: taskEvent({
        containers: [{ name: 'app', exitCode: 143 }],
        stoppedReason: 'Task stopped by user',
        stopCode: 'UserInitiated',
      }),
      expectation: 'miss',
    },
    {
      name: 'ignores Fargate Spot reclaim',
      pattern: 'default',
      event: taskEvent({
        capacityProviderName: 'FARGATE_SPOT',
        containers: [{ name: 'app', exitCode: 143 }],
        stoppedReason: 'Your Spot Task was interrupted.',
        stopCode: 'SpotInterruption',
      }),
      expectation: 'miss',
    },
    {
      name: 'ignores an EC2 task',
      pattern: 'default',
      event: taskEvent({
        launchType: 'EC2',
        containers: [{ name: 'app', exitCode: 1 }],
        stoppedReason: 'Essential container in task exited',
      }),
      expectation: 'miss',
    },
    {
      name: 'ignores another cluster',
      pattern: 'default',
      event: taskEvent({
        clusterArn: 'arn:aws:ecs:us-east-1:123456789012:cluster/other',
        containers: [{ name: 'app', exitCode: 1 }],
        stoppedReason: 'Essential container in task exited',
      }),
      expectation: 'miss',
    },
    {
      name: 'matches the selected service',
      pattern: 'service',
      event: taskEvent({
        containers: [{ name: 'app', exitCode: 1 }],
        stoppedReason: 'Essential container in task exited',
      }),
      expectation: 'match',
    },
    {
      name: 'ignores another service',
      pattern: 'service',
      event: taskEvent({
        group: 'service:other',
        containers: [{ name: 'app', exitCode: 1 }],
        stoppedReason: 'Essential container in task exited',
      }),
      expectation: 'miss',
    },
  ])('$name', ({ pattern, event, expectation }) => {
    const eventPattern = pattern === 'default' ? defaultPattern : servicePattern;
    const matched = eventMatchesPattern(event, eventPattern);

    expect(matched).toBe(expectation === 'match');
  });

  it('should match the snapshot', () => {
    expect(template.toJSON()).toMatchSnapshot();
  });
});
