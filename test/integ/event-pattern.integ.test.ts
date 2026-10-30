/**
 * Integration tests against the real Amazon EventBridge.
 *
 * Each pattern is synthesized by the construct and sent to the
 * `TestEventPattern` API. EventBridge validates the pattern and reports
 * whether a sample event matches it, so no rule or other resource is created.
 *
 * Run with `npx projen integ`. It needs AWS credentials that allow
 * `events:TestEventPattern`. The SDK resolves the region from `AWS_REGION`,
 * `AWS_DEFAULT_REGION`, or the shared AWS config file.
 */
import { EventBridgeClient, TestEventPatternCommand } from '@aws-sdk/client-eventbridge';
import { CLUSTER_ARN, SERVICE_NAME, TEST_ACCOUNT_ID, TEST_REGION } from '../fixtures/constants';
import { RULE_PROPS_CASES } from '../fixtures/rule-props';
import { createTemplate } from '../fixtures/synthesize';
import { TASK_EVENT_CASES } from '../fixtures/task-events';
import { eventMatchesPattern, readEventPattern } from '../match-event-pattern';

/**
 * Exception name EventBridge returns for a pattern it rejects.
 */
const INVALID_EVENT_PATTERN_EXCEPTION = 'InvalidEventPatternException';

/**
 * Total attempts per `send()`, including the first. The SDK retries throttling
 * and transient failures, so the tests add no retry of their own.
 */
const MAX_ATTEMPTS = 3;

/**
 * Time allowed to open a connection, in milliseconds.
 */
const CONNECTION_TIMEOUT_MS = 5_000;

/**
 * Time allowed for one `send()` to finish, in milliseconds.
 */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Envelope fields `TestEventPattern` requires on every event.
 * The values do not affect matching.
 */
const EVENT_ENVELOPE = {
  id: '00000000-0000-0000-0000-000000000000',
  account: TEST_ACCOUNT_ID,
  time: '2026-01-01T00:00:00Z',
  region: TEST_REGION,
  resources: [],
};

// The region is not set here, so the SDK resolves it from the environment.
const client = new EventBridgeClient({
  maxAttempts: MAX_ATTEMPTS,
  requestHandler: {
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    requestTimeout: REQUEST_TIMEOUT_MS,
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

const sampleRulePatterns = {
  default: readEventPattern(createTemplate().toJSON()),
  service: readEventPattern(createTemplate({ serviceName: SERVICE_NAME }).toJSON()),
};

describe('EventBridge TestEventPattern', () => {
  describe('pattern validity', () => {
    it.each(RULE_PROPS_CASES)('accepts the pattern for $name', async ({ props }) => {
      const pattern = readEventPattern(createTemplate(props).toJSON());

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
