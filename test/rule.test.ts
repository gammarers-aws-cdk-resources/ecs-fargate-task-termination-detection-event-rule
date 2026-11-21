import { Match, Template } from 'aws-cdk-lib/assertions';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import {
  Cluster,
  ContainerImage,
  FargateService,
  FargateTaskDefinition,
  type IBaseService,
  type ICluster,
} from 'aws-cdk-lib/aws-ecs';
import * as events from 'aws-cdk-lib/aws-events';
import {
  DefaultExcludedStopCodes,
  DefaultExcludedStoppedReasonPrefixes,
  DefaultStartupFailureStoppedReasonPrefixes,
  EcsFargateTaskTerminationDetectionEventRule,
  EcsFargateTaskTerminationDetectionMode,
  EcsTaskStopCode,
} from '../src';
import { CLUSTER_ARN, OTHER_CLUSTER_ARN, SERVICE_NAME, TASK_DEFINITION_ARN, TASK_GROUP } from './fixtures/constants';
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

const DEFAULT_EXCLUDED_STOP_CODES = [
  DefaultExcludedStopCodes.USER_INITIATED,
  DefaultExcludedStopCodes.SPOT_INTERRUPTION,
];

const EXIT_CODE_CONDITION = {
  containers: {
    exitCode: [{ 'anything-but': 0 }],
  },
};

const stopCodeExclusion = (codes: string[]): Record<string, unknown> => ({
  'anything-but': codes,
});

/**
 * Builds the non-zero exit branches for the given exclusions.
 *
 * @param prefixes - Prefixes excluded from both branches.
 * @param stopCodes - Stop codes excluded when the event has a `stopCode`.
 * @returns One branch when `stopCodes` is empty, otherwise the present and absent branches.
 */
const exitBranches = (
  prefixes: string[],
  stopCodes: string[] = DEFAULT_EXCLUDED_STOP_CODES,
): Record<string, unknown>[] => {
  const stoppedReason = prefixes.length === 0
    ? {}
    : { stoppedReason: [stoppedReasonExclusion(prefixes)] };
  const withStopCode = {
    ...EXIT_CODE_CONDITION,
    ...stoppedReason,
  };
  if (stopCodes.length === 0) {
    return [withStopCode];
  }
  return [
    { ...withStopCode, stopCode: [stopCodeExclusion(stopCodes)] },
    { ...EXIT_CODE_CONDITION, stopCode: [{ exists: false }], ...stoppedReason },
  ];
};

const DEFAULT_NON_ZERO_EXIT_CODE_CONDITION = {
  $or: exitBranches(DEFAULT_EXCLUDED_PREFIXES),
};

const DEFAULT_STARTUP_PREFIXES = [
  DefaultStartupFailureStoppedReasonPrefixes.CANNOT_PULL_CONTAINER_ERROR,
  DefaultStartupFailureStoppedReasonPrefixes.RESOURCE_INITIALIZATION_ERROR,
  DefaultStartupFailureStoppedReasonPrefixes.CANNOT_START_CONTAINER_ERROR,
  DefaultStartupFailureStoppedReasonPrefixes.TASK_FAILED_TO_START,
];

/**
 * Builds the startup-failure branches for the given prefixes.
 *
 * @param prefixes - Prefixes matched when `stopCode` is absent.
 * @returns One branch when `prefixes` is empty, otherwise the stop-code and prefix branches.
 */
const startupBranches = (prefixes: string[] = DEFAULT_STARTUP_PREFIXES): Record<string, unknown>[] => {
  const withStopCode = { stopCode: [EcsTaskStopCode.TASK_FAILED_TO_START] };
  if (prefixes.length === 0) {
    return [withStopCode];
  }
  return [
    withStopCode,
    {
      stopCode: [{ exists: false }],
      stoppedReason: prefixes.map((prefix) => ({ prefix })),
    },
  ];
};

const STARTUP_FAILURE_CONDITIONS = startupBranches();

const ALL_FAILURES_DETAIL = {
  $or: [...exitBranches(DEFAULT_EXCLUDED_PREFIXES), ...STARTUP_FAILURE_CONDITIONS],
};

/**
 * Builds a service double that exposes only the fields this construct reads.
 *
 * @param clusterArn - Cluster ARN the service reports.
 * @param serviceName - Service name the service reports.
 * @returns A partial service cast to the construct's input type.
 */
const serviceDouble = (clusterArn: string, serviceName: string): IBaseService => {
  return {
    serviceName,
    cluster: { clusterArn },
  } as IBaseService;
};

/**
 * Reads `detail` from the one Events rule in `template`.
 *
 * @param template - Template with one Events rule.
 * @returns The rule's `detail` pattern, including CloudFormation intrinsics.
 * @throws Error when the template has no event detail.
 */
const readDetail = (template: Template): Record<string, unknown> => {
  const pattern = readEventPattern(template.toJSON());
  const detail = pattern.detail;
  if (typeof detail !== 'object' || detail === null || Array.isArray(detail)) {
    throw new Error('Expected event detail.');
  }

  return detail as Record<string, unknown>;
};

/**
 * Asserts the rule's event pattern is exactly the fixed ECS scope plus `detail`.
 *
 * The scope is `aws.ecs` / `ECS Task State Change`, the sample cluster,
 * `FARGATE`, and `STOPPED`. Each case passes only what differs from it.
 *
 * @param template - Template with one Events rule.
 * @param detail - Expected `detail` fields beyond the fixed scope.
 * @param clusterArns - Cluster ARNs in the pattern. Defaults to the sample cluster.
 */
const expectEventPattern = (
  template: Template,
  detail: Record<string, unknown>,
  clusterArns: string[] = [CLUSTER_ARN],
): void => {
  template.hasResourceProperties('AWS::Events::Rule', {
    EventPattern: Match.objectEquals({
      'source': ['aws.ecs'],
      'detail-type': ['ECS Task State Change'],
      'detail': {
        clusterArn: clusterArns,
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

  it('should document the default exclusion lists', () => {
    expect(DefaultExcludedStoppedReasonPrefixes.ALL).toEqual([
      DefaultExcludedStoppedReasonPrefixes.SCALING_ACTIVITY_INITIATED_BY,
      DefaultExcludedStoppedReasonPrefixes.TASK_STOPPED_BY_USER,
      DefaultExcludedStoppedReasonPrefixes.SPOT_TASK_INTERRUPTED,
    ]);
    expect(DefaultExcludedStoppedReasonPrefixes.ALL).toEqual(DEFAULT_EXCLUDED_PREFIXES);
    expect(DefaultExcludedStopCodes.ALL).toEqual([
      EcsTaskStopCode.USER_INITIATED,
      EcsTaskStopCode.SPOT_INTERRUPTION,
    ]);
    expect(DefaultStartupFailureStoppedReasonPrefixes.ALL).toEqual(DEFAULT_STARTUP_PREFIXES);
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
            ...exitBranches(['Task stopped by user']),
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
            ...exitBranches([...DEFAULT_EXCLUDED_PREFIXES, 'Task stopped due to a platform version update']),
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
        detail: { $or: exitBranches([]) },
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
            ...exitBranches(['Task stopped by user']),
            ...STARTUP_FAILURE_CONDITIONS,
          ],
        },
      },
    ])('should narrow matching with $name', ({ props, detail }) => {
      expectEventPattern(createTemplate(props), detail);
    });

    it.each([
      { serviceName: SERVICE_NAME, group: TASK_GROUP },
      { serviceName: SERVICE_NAME, serviceNames: [SERVICE_NAME] },
      { serviceNames: [SERVICE_NAME], group: TASK_GROUP },
      { service: serviceDouble(CLUSTER_ARN, SERVICE_NAME), serviceName: SERVICE_NAME },
    ])('should throw when more than one service selector is set', (props) => {
      expect(() => {
        createTemplate(props);
      }).toThrow('Set only one of serviceName, serviceNames, service, or group.');
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

  describe('excludedStopCodes', () => {
    it.each([
      {
        name: 'replace the default stop codes',
        props: { excludedStopCodes: [EcsTaskStopCode.USER_INITIATED] },
        detail: {
          $or: [
            ...exitBranches(DEFAULT_EXCLUDED_PREFIXES, [EcsTaskStopCode.USER_INITIATED]),
            ...STARTUP_FAILURE_CONDITIONS,
          ],
        },
      },
      {
        name: 'extend the default stop codes',
        props: {
          excludedStopCodes: [...DefaultExcludedStopCodes.ALL, EcsTaskStopCode.TERMINATION_NOTICE],
        },
        detail: {
          $or: [
            ...exitBranches(DEFAULT_EXCLUDED_PREFIXES, [
              ...DEFAULT_EXCLUDED_STOP_CODES,
              EcsTaskStopCode.TERMINATION_NOTICE,
            ]),
            ...STARTUP_FAILURE_CONDITIONS,
          ],
        },
      },
      {
        name: 'omit the stopCode exclusion when the array is empty',
        props: {
          detectionMode: EcsFargateTaskTerminationDetectionMode.NON_ZERO_EXIT_CODE,
          excludedStopCodes: [],
        },
        detail: exitBranches(DEFAULT_EXCLUDED_PREFIXES, [])[0],
      },
    ])('should $name', ({ props, detail }) => {
      expectEventPattern(createTemplate(props), detail);
    });

    it('should throw when it contains an empty string', () => {
      expect(() => {
        createTemplate({ excludedStopCodes: [EcsTaskStopCode.USER_INITIATED, ''] });
      }).toThrow('excludedStopCodes must not contain empty strings.');
    });
  });

  describe('startupFailureStoppedReasonPrefixes', () => {
    it.each([
      {
        name: 'replace the default prefixes',
        props: {
          detectionMode: EcsFargateTaskTerminationDetectionMode.TASK_FAILED_TO_START,
          startupFailureStoppedReasonPrefixes: ['CannotStartContainerError'],
        },
        detail: { $or: startupBranches(['CannotStartContainerError']) },
      },
      {
        name: 'extend the default prefixes',
        props: {
          detectionMode: EcsFargateTaskTerminationDetectionMode.TASK_FAILED_TO_START,
          startupFailureStoppedReasonPrefixes: [
            ...DefaultStartupFailureStoppedReasonPrefixes.ALL,
            'Custom startup failure',
          ],
        },
        detail: {
          $or: startupBranches([...DEFAULT_STARTUP_PREFIXES, 'Custom startup failure']),
        },
      },
      {
        name: 'match only TaskFailedToStart when the array is empty',
        props: {
          detectionMode: EcsFargateTaskTerminationDetectionMode.TASK_FAILED_TO_START,
          startupFailureStoppedReasonPrefixes: [],
        },
        detail: startupBranches([])[0],
      },
    ])('should $name', ({ props, detail }) => {
      expectEventPattern(createTemplate(props), detail);
    });

    it('should throw when it contains an empty string', () => {
      expect(() => {
        createTemplate({ startupFailureStoppedReasonPrefixes: ['CannotPullContainerError', ''] });
      }).toThrow('startupFailureStoppedReasonPrefixes must not contain empty strings.');
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

  describe('cluster selection', () => {
    it('should match every ARN in clusterArns', () => {
      expectEventPattern(
        createTemplate({ clusterArns: [CLUSTER_ARN, OTHER_CLUSTER_ARN] }),
        ALL_FAILURES_DETAIL,
        [CLUSTER_ARN, OTHER_CLUSTER_ARN],
      );
    });

    it('should keep a cluster created in the same stack as a token', () => {
      const stack = createStack();
      const vpc = Vpc.fromVpcAttributes(stack, 'Vpc', {
        vpcId: 'vpc-0123456789abcdef0',
        availabilityZones: ['us-east-1a', 'us-east-1b'],
        publicSubnetIds: ['subnet-11111111', 'subnet-22222222'],
      });
      const cluster = new Cluster(stack, 'Cluster', { vpc });
      new EcsFargateTaskTerminationDetectionEventRule(stack, 'Rule', { cluster });

      const detail = readDetail(Template.fromStack(stack));
      expect(detail.clusterArn).toEqual([
        { 'Fn::GetAtt': [expect.any(String), 'Arn'] },
      ]);
    });

    it('should use the service cluster when no cluster prop is set', () => {
      const service = serviceDouble(CLUSTER_ARN, SERVICE_NAME);
      expectEventPattern(createTemplate({ service }), {
        group: [SERVICE_GROUP],
        ...ALL_FAILURES_DETAIL,
      });
    });

    it('should keep an explicit cluster when service is also set', () => {
      const service = serviceDouble(OTHER_CLUSTER_ARN, SERVICE_NAME);
      expectEventPattern(createTemplate({ clusterArn: CLUSTER_ARN, service }), {
        group: [SERVICE_GROUP],
        ...ALL_FAILURES_DETAIL,
      });
    });

    it('should throw when no cluster source is set', () => {
      expect(() => {
        new EcsFargateTaskTerminationDetectionEventRule(createStack(), 'Rule', {});
      }).toThrow('Set cluster, clusterArn, clusterArns, or service.');
    });

    it.each([
      { cluster: { clusterArn: CLUSTER_ARN } as ICluster, clusterArn: CLUSTER_ARN },
      { clusterArn: CLUSTER_ARN, clusterArns: [CLUSTER_ARN] },
      { cluster: { clusterArn: CLUSTER_ARN } as ICluster, clusterArns: [CLUSTER_ARN] },
    ])('should throw when more than one cluster source is set', (props) => {
      expect(() => {
        new EcsFargateTaskTerminationDetectionEventRule(createStack(), 'Rule', props);
      }).toThrow('Set only one of cluster, clusterArn, or clusterArns.');
    });

    it.each([
      { clusterArns: [] },
      { clusterArns: [''] },
      { clusterArns: [CLUSTER_ARN, ''] },
    ])('should throw when clusterArns is empty', (props) => {
      expect(() => {
        createTemplate(props);
      }).toThrow(/clusterArns must not be empty|clusterArns must not contain empty strings/);
    });
  });

  describe('service selection', () => {
    it('should match every name in serviceNames', () => {
      expectEventPattern(createTemplate({ serviceNames: [SERVICE_NAME, 'example-worker'] }), {
        group: [SERVICE_GROUP, 'service:example-worker'],
        ...ALL_FAILURES_DETAIL,
      });
    });

    it('should keep a service created in the same stack as a token', () => {
      const stack = createStack();
      const vpc = Vpc.fromVpcAttributes(stack, 'Vpc', {
        vpcId: 'vpc-0123456789abcdef0',
        availabilityZones: ['us-east-1a', 'us-east-1b'],
        publicSubnetIds: ['subnet-11111111', 'subnet-22222222'],
      });
      const cluster = new Cluster(stack, 'Cluster', { vpc });
      const taskDefinition = new FargateTaskDefinition(stack, 'TaskDefinition');
      taskDefinition.addContainer('app', {
        image: ContainerImage.fromRegistry('public.ecr.aws/docker/library/busybox:stable'),
      });
      const service = new FargateService(stack, 'Service', {
        cluster,
        taskDefinition,
        assignPublicIp: true,
        vpcSubnets: { subnetType: SubnetType.PUBLIC },
      });
      new EcsFargateTaskTerminationDetectionEventRule(stack, 'Rule', { service });

      const detail = readDetail(Template.fromStack(stack));
      expect(detail.clusterArn).toEqual([
        { 'Fn::GetAtt': [expect.any(String), 'Arn'] },
      ]);
      expect(detail.group).toEqual([
        {
          'Fn::Join': ['', ['service:', { 'Fn::GetAtt': [expect.any(String), 'Name'] }]],
        },
      ]);
    });

    it.each([
      { serviceNames: [] },
      { serviceNames: [''] },
      { serviceNames: [SERVICE_NAME, ''] },
    ])('should throw when serviceNames is empty', (props) => {
      expect(() => {
        createTemplate(props);
      }).toThrow(/serviceNames must not be empty|serviceNames must not contain empty strings/);
    });

    it('should throw when serviceNames includes the service: prefix', () => {
      expect(() => {
        createTemplate({ serviceNames: [SERVICE_NAME, SERVICE_GROUP] });
      }).toThrow(
        'serviceNames must be the ECS service name without the "service:" prefix. Use group to match a raw task group.',
      );
    });

    it('should throw when service.serviceName is empty', () => {
      expect(() => {
        createTemplate({ service: serviceDouble(CLUSTER_ARN, '') });
      }).toThrow('service.serviceName must not be empty.');
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
