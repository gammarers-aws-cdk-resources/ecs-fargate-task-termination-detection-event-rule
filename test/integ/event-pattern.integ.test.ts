/**
 * Integration tests against the real Amazon EventBridge.
 *
 * Each pattern is synthesized by the construct and sent to the
 * `TestEventPattern` API. EventBridge validates the pattern and reports
 * whether a sample event matches it, so no rule or other resource is created.
 *
 * Run with `npx projen integ`. It needs AWS credentials that allow
 * `events:TestEventPattern`. The region comes from `AWS_REGION` or
 * `AWS_DEFAULT_REGION`, and falls back to `us-east-1`.
 */
import { EventBridgeClient, TestEventPatternCommand } from '@aws-sdk/client-eventbridge';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
  DefaultExcludedStoppedReasonPrefixes,
  EcsFargateTaskTerminationDetectionEventRule,
  EcsFargateTaskTerminationDetectionEventRuleProps,
  EcsFargateTaskTerminationDetectionMode,
} from '../../src';
import {
  CLUSTER_ARN,
  SERVICE_NAME,
  SampleRule,
  TASK_EVENT_CASES,
} from '../fixtures/task-events';
import { eventMatchesPattern, readEventPattern } from '../match-event-pattern';

/**
 * Region used when neither `AWS_REGION` nor `AWS_DEFAULT_REGION` is set.
 * `TestEventPattern` is a regional API, so the tests fix a region only here.
 */
const FALLBACK_REGION = 'us-east-1';

/**
 * Exception name EventBridge returns for a pattern it rejects.
 */
const INVALID_EVENT_PATTERN_EXCEPTION = 'InvalidEventPatternException';

/**
 * Envelope fields `TestEventPattern` requires on every event.
 * The values do not affect matching.
 */
const EVENT_ENVELOPE = {
  id: '00000000-0000-0000-0000-000000000000',
  account: '123456789012',
  time: '2026-01-01T00:00:00Z',
  region: 'us-east-1',
  resources: [],
};

/**
 * Resolves the region the tests call EventBridge in.
 *
 * @returns Region from the environment, or {@link FALLBACK_REGION}.
 */
const resolveRegion = (): string => {
  return process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? FALLBACK_REGION;
};

// Throttling and transient failures are retried by the SDK (`maxAttempts`),
// so the tests add no retry of their own.
const client = new EventBridgeClient({
  region: resolveRegion(),
  maxAttempts: 3,
  requestHandler: {
    connectionTimeout: 5_000,
    requestTimeout: 30_000,
  },
});

/**
 * Asks EventBridge whether `event` matches `pattern`.
 *
 * @param pattern - EventBridge event pattern.
 * @param event - Event without the envelope fields.
 * @returns `true` when EventBridge reports a match.
 * @throws Error from the SDK, including `InvalidEventPatternException` when
 *   EventBridge rejects the pattern.
 */
const matchesOnEventBridge = async (
  pattern: Record<string, unknown>,
  event: Record<string, unknown>,
): Promise<boolean> => {
  const output = await client.send(new TestEventPatternCommand({
    EventPattern: JSON.stringify(pattern),
    Event: JSON.stringify({ ...EVENT_ENVELOPE, ...event }),
  }));

  return output.Result === true;
};

/**
 * Synthesizes the rule and reads its event pattern.
 *
 * @param props - Rule props other than `clusterArn`.
 * @returns Event pattern the construct puts in the template.
 */
const synthesizePattern = (
  props: Omit<EcsFargateTaskTerminationDetectionEventRuleProps, 'clusterArn'>,
): Record<string, unknown> => {
  const stack = new Stack(new App(), 'IntegStack', {
    env: { account: '123456789012', region: 'us-east-1' },
  });
  new EcsFargateTaskTerminationDetectionEventRule(stack, 'Rule', {
    clusterArn: CLUSTER_ARN,
    ...props,
  });

  return readEventPattern(Template.fromStack(stack).toJSON());
};

const sampleRulePatterns: Record<SampleRule, Record<string, unknown>> = {
  default: synthesizePattern({}),
  service: synthesizePattern({ serviceName: SERVICE_NAME }),
};

const TASK_DEFINITION_ARN = 'arn:aws:ecs:us-east-1:123456789012:task-definition/example-worker:1';

const validPatternCases: Array<{
  name: string;
  props: Omit<EcsFargateTaskTerminationDetectionEventRuleProps, 'clusterArn'>;
}> = [
  { name: 'defaults', props: {} },
  {
    name: 'NON_ZERO_EXIT_CODE',
    props: { detectionMode: EcsFargateTaskTerminationDetectionMode.NON_ZERO_EXIT_CODE },
  },
  {
    name: 'TASK_FAILED_TO_START',
    props: { detectionMode: EcsFargateTaskTerminationDetectionMode.TASK_FAILED_TO_START },
  },
  {
    name: 'ALL_FAILURES',
    props: { detectionMode: EcsFargateTaskTerminationDetectionMode.ALL_FAILURES },
  },
  { name: 'serviceName', props: { serviceName: SERVICE_NAME } },
  { name: 'group', props: { group: 'family:example-worker' } },
  { name: 'taskDefinitionArn', props: { taskDefinitionArn: TASK_DEFINITION_ARN } },
  {
    name: 'serviceName and taskDefinitionArn',
    props: { serviceName: SERVICE_NAME, taskDefinitionArn: TASK_DEFINITION_ARN },
  },
  { name: 'no excluded stoppedReason prefixes', props: { excludedStoppedReasonPrefixes: [] } },
  {
    name: 'extended excluded stoppedReason prefixes',
    props: {
      excludedStoppedReasonPrefixes: [...DefaultExcludedStoppedReasonPrefixes.ALL, 'Custom reason'],
    },
  },
];

describe('EventBridge TestEventPattern', () => {
  describe('pattern validity', () => {
    it.each(validPatternCases)('accepts the pattern for $name', async ({ props }) => {
      const pattern = synthesizePattern(props);

      await expect(matchesOnEventBridge(pattern, TASK_EVENT_CASES[0].event))
        .resolves.toEqual(expect.any(Boolean));
    });

    // Guards the original bug: a leaf value must be an array.
    it('rejects a leaf value that is not an array', async () => {
      const pattern = { detail: { clusterArn: CLUSTER_ARN } };

      await expect(matchesOnEventBridge(pattern, TASK_EVENT_CASES[0].event))
        .rejects.toMatchObject({ name: INVALID_EVENT_PATTERN_EXCEPTION });
    });
  });

  describe('match results', () => {
    it.each(TASK_EVENT_CASES)('$name', async ({ rule, event, expectation }) => {
      const pattern = sampleRulePatterns[rule];

      const matchedOnEventBridge = await matchesOnEventBridge(pattern, event);

      expect(matchedOnEventBridge).toBe(expectation === 'match');
      // The unit tests rely on this matcher, so it must agree with EventBridge.
      expect(eventMatchesPattern(event, pattern)).toBe(matchedOnEventBridge);
    });
  });
});
