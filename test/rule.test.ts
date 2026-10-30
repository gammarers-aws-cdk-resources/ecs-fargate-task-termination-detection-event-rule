import { Match, Template } from 'aws-cdk-lib/assertions';
import * as events from 'aws-cdk-lib/aws-events';
import {
  DefaultExcludedStoppedReasonPrefixes,
  EcsFargateTaskTerminationDetectionEventRule,
  EcsFargateTaskTerminationDetectionMode,
} from '../src';
import { CLUSTER_ARN, SERVICE_NAME, TASK_DEFINITION_ARN, TASK_GROUP } from './fixtures/constants';
import { RULE_PROPS_CASES } from './fixtures/rule-props';
import { createStack, createTemplate } from './fixtures/synthesize';
import { TASK_EVENT_CASES } from './fixtures/task-events';
import { eventMatchesPattern, readEventPattern } from './match-event-pattern';

const SERVICE_GROUP = `service:${SERVICE_NAME}`;

/**
 * Builds the `stoppedReason` filter that excludes the given prefixes.
 *
 * @param prefixes - Prefixes the pattern should exclude.
 * @returns Expected `anything-but` prefix matcher.
 */
const stoppedReasonExclusion = (prefixes: string[]): Record<string, unknown> => ({
  'anything-but': { prefix: prefixes },
});

const DEFAULT_EXCLUDED_PREFIXES = [
  'Scaling activity initiated by',
  'Task stopped by user',
  'Your Spot Task was interrupted',
];

const EXIT_CODE_CONDITION = {
  containers: {
    exitCode: [{ 'anything-but': 0 }],
  },
};

const DEFAULT_NON_ZERO_EXIT_CODE_CONDITION = {
  ...EXIT_CODE_CONDITION,
  stoppedReason: [stoppedReasonExclusion(DEFAULT_EXCLUDED_PREFIXES)],
};

const STARTUP_FAILURE_CONDITIONS = [
  { stopCode: ['TaskFailedToStart'] },
  {
    stoppedReason: [
      { prefix: 'CannotPullContainerError' },
      { prefix: 'ResourceInitializationError' },
    ],
  },
];

const ALL_FAILURES_DETAIL = {
  $or: [DEFAULT_NON_ZERO_EXIT_CODE_CONDITION, ...STARTUP_FAILURE_CONDITIONS],
};

/**
 * Asserts the rule's event pattern is exactly the fixed ECS scope plus `detail`.
 *
 * The scope is `aws.ecs` / `ECS Task State Change`, the sample cluster,
 * `FARGATE`, and `STOPPED`. Each case passes only what differs from it.
 *
 * @param template - Template with one Events rule.
 * @param detail - Expected `detail` fields beyond the fixed scope.
 */
const expectEventPattern = (template: Template, detail: Record<string, unknown>): void => {
  template.hasResourceProperties('AWS::Events::Rule', {
    EventPattern: Match.objectEquals({
      'source': ['aws.ecs'],
      'detail-type': ['ECS Task State Change'],
      'detail': {
        clusterArn: [CLUSTER_ARN],
        launchType: ['FARGATE'],
        lastStatus: ['STOPPED'],
        ...detail,
      },
    }),
  });
};

describe('EcsFargateTaskTerminationDetectionEventRule', () => {
  it('should be a Rule', () => {
    const rule = new EcsFargateTaskTerminationDetectionEventRule(createStack(), 'Rule', {
      ruleName: 'example-event-rule',
      description: 'example event rule.',
      clusterArn: CLUSTER_ARN,
    });

    expect(rule).toBeInstanceOf(events.Rule);
  });

  it('should match all failures by default (non-zero exitCode or startup failure)', () => {
    expectEventPattern(createTemplate(), ALL_FAILURES_DETAIL);
  });

  it('should document the default excluded stoppedReason prefixes', () => {
    expect(DefaultExcludedStoppedReasonPrefixes.ALL).toEqual([
      DefaultExcludedStoppedReasonPrefixes.SCALING_ACTIVITY_INITIATED_BY,
      DefaultExcludedStoppedReasonPrefixes.TASK_STOPPED_BY_USER,
      DefaultExcludedStoppedReasonPrefixes.SPOT_TASK_INTERRUPTED,
    ]);
    expect(DefaultExcludedStoppedReasonPrefixes.ALL).toEqual(DEFAULT_EXCLUDED_PREFIXES);
  });

  describe('detectionMode', () => {
    it.each([
      {
        name: 'NON_ZERO_EXIT_CODE',
        detectionMode: EcsFargateTaskTerminationDetectionMode.NON_ZERO_EXIT_CODE,
        detail: DEFAULT_NON_ZERO_EXIT_CODE_CONDITION,
      },
      {
        name: 'TASK_FAILED_TO_START',
        detectionMode: EcsFargateTaskTerminationDetectionMode.TASK_FAILED_TO_START,
        detail: { $or: STARTUP_FAILURE_CONDITIONS },
      },
      {
        name: 'ALL_FAILURES',
        detectionMode: EcsFargateTaskTerminationDetectionMode.ALL_FAILURES,
        detail: ALL_FAILURES_DETAIL,
      },
    ])('should match the $name conditions', ({ detectionMode, detail }) => {
      expectEventPattern(createTemplate({ detectionMode }), detail);
    });

    it('should throw when detectionMode is unsupported', () => {
      expect(() => {
        // The enum only allows supported modes, so the cast reaches the guard at runtime.
        createTemplate({ detectionMode: 'UNSUPPORTED' as EcsFargateTaskTerminationDetectionMode });
      }).toThrow('Unsupported detectionMode: UNSUPPORTED');
    });
  });

  describe('excludedStoppedReasonPrefixes', () => {
    it.each([
      {
        name: 'replace the default prefixes',
        props: { excludedStoppedReasonPrefixes: ['Task stopped by user'] },
        detail: {
          $or: [
            { ...EXIT_CODE_CONDITION, stoppedReason: [stoppedReasonExclusion(['Task stopped by user'])] },
            ...STARTUP_FAILURE_CONDITIONS,
          ],
        },
      },
      {
        name: 'extend the default prefixes when the default set is spread',
        props: {
          excludedStoppedReasonPrefixes: [
            ...DefaultExcludedStoppedReasonPrefixes.ALL,
            'Task stopped due to a platform version update',
          ],
        },
        detail: {
          $or: [
            {
              ...EXIT_CODE_CONDITION,
              stoppedReason: [
                stoppedReasonExclusion([...DEFAULT_EXCLUDED_PREFIXES, 'Task stopped due to a platform version update']),
              ],
            },
            ...STARTUP_FAILURE_CONDITIONS,
          ],
        },
      },
      {
        name: 'omit the stoppedReason exclusion when the array is empty',
        props: {
          detectionMode: EcsFargateTaskTerminationDetectionMode.NON_ZERO_EXIT_CODE,
          excludedStoppedReasonPrefixes: [],
        },
        detail: EXIT_CODE_CONDITION,
      },
    ])('should $name', ({ props, detail }) => {
      expectEventPattern(createTemplate(props), detail);
    });

    it('should throw when it contains an empty string', () => {
      expect(() => {
        createTemplate({ excludedStoppedReasonPrefixes: ['Scaling activity initiated by', ''] });
      }).toThrow('excludedStoppedReasonPrefixes must not contain empty strings.');
    });
  });

  describe('scope filters', () => {
    it.each([
      {
        name: 'serviceName',
        props: { serviceName: SERVICE_NAME },
        detail: { group: [SERVICE_GROUP], ...ALL_FAILURES_DETAIL },
      },
      {
        name: 'group',
        props: { group: TASK_GROUP },
        detail: { group: [TASK_GROUP], ...ALL_FAILURES_DETAIL },
      },
      {
        name: 'taskDefinitionArn',
        props: { taskDefinitionArn: TASK_DEFINITION_ARN },
        detail: { taskDefinitionArn: [TASK_DEFINITION_ARN], ...ALL_FAILURES_DETAIL },
      },
      {
        name: 'serviceName and taskDefinitionArn',
        props: { serviceName: SERVICE_NAME, taskDefinitionArn: TASK_DEFINITION_ARN },
        detail: { group: [SERVICE_GROUP], taskDefinitionArn: [TASK_DEFINITION_ARN], ...ALL_FAILURES_DETAIL },
      },
      {
        name: 'group and taskDefinitionArn',
        props: { group: TASK_GROUP, taskDefinitionArn: TASK_DEFINITION_ARN },
        detail: { group: [TASK_GROUP], taskDefinitionArn: [TASK_DEFINITION_ARN], ...ALL_FAILURES_DETAIL },
      },
      {
        name: 'serviceName with NON_ZERO_EXIT_CODE',
        props: {
          serviceName: SERVICE_NAME,
          detectionMode: EcsFargateTaskTerminationDetectionMode.NON_ZERO_EXIT_CODE,
        },
        detail: { group: [SERVICE_GROUP], ...DEFAULT_NON_ZERO_EXIT_CODE_CONDITION },
      },
      {
        name: 'serviceName with a custom stoppedReason exclusion',
        props: { serviceName: SERVICE_NAME, excludedStoppedReasonPrefixes: ['Task stopped by user'] },
        detail: {
          group: [SERVICE_GROUP],
          $or: [
            { ...EXIT_CODE_CONDITION, stoppedReason: [stoppedReasonExclusion(['Task stopped by user'])] },
            ...STARTUP_FAILURE_CONDITIONS,
          ],
        },
      },
    ])('should narrow matching with $name', ({ props, detail }) => {
      expectEventPattern(createTemplate(props), detail);
    });

    it('should throw when serviceName and group are both set', () => {
      expect(() => {
        createTemplate({ serviceName: SERVICE_NAME, group: SERVICE_GROUP });
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
        createTemplate(scopeProps);
      }).toThrow(`${propertyName} must not be empty.`);
    });

    it('should throw when serviceName includes the service: prefix', () => {
      expect(() => {
        createTemplate({ serviceName: SERVICE_GROUP });
      }).toThrow(
        'serviceName must be the ECS service name without the "service:" prefix. Use group to match a raw task group.',
      );
    });
  });

  describe('values that are kept as given', () => {
    it.each([
      {
        name: 'an empty clusterArn',
        props: { clusterArn: '' },
        detail: { clusterArn: [''] },
      },
      {
        name: 'a non-ARN clusterArn',
        props: { clusterArn: 'not-an-arn' },
        detail: { clusterArn: ['not-an-arn'] },
      },
      {
        name: 'a non-ARN taskDefinitionArn',
        props: { taskDefinitionArn: 'not-a-task-definition' },
        detail: { taskDefinitionArn: ['not-a-task-definition'] },
      },
    ])('should keep $name in the event pattern', ({ props, detail }) => {
      createTemplate(props).hasResourceProperties('AWS::Events::Rule', {
        EventPattern: Match.objectLike({ detail }),
      });
    });
  });

  it('should throw when eventPattern is provided', () => {
    expect(() => {
      createTemplate({
        ruleName: 'ecs-task-termination-detection-event-rule',
        eventPattern: {
          source: ['aws.ecs'],
          detailType: ['ECS Task State Change'],
        },
      });
    }).toThrow('eventPattern is not allowed to be set for EcsFargateTaskTerminationDetectionEventRule.');
  });

  describe('event matching', () => {
    const patterns = {
      default: readEventPattern(createTemplate().toJSON()),
      service: readEventPattern(createTemplate({ serviceName: SERVICE_NAME }).toJSON()),
    };

    it.each(TASK_EVENT_CASES)('$name', ({ rule, event, expectation }) => {
      const matched = eventMatchesPattern(event, patterns[rule]);

      expect(matched).toBe(expectation === 'match');
    });
  });

  describe('snapshots', () => {
    it.each(RULE_PROPS_CASES)('should match the snapshot for $name', ({ props }) => {
      expect(createTemplate(props).toJSON()).toMatchSnapshot();
    });
  });
});
