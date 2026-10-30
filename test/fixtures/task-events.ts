/**
 * ECS task state change events shared by the unit tests and the integration
 * tests, so both check the same cases.
 */

/**
 * Cluster the sample rules are scoped to.
 */
export const CLUSTER_ARN = 'arn:aws:ecs:us-east-1:123456789012:cluster/example-app-cluster';

/**
 * Service name used by the `service` sample rule.
 */
export const SERVICE_NAME = 'example-api';

/**
 * Sample rule an event is checked against.
 *
 * - `default`: every Fargate task in {@link CLUSTER_ARN}.
 * - `service`: only the service named {@link SERVICE_NAME}.
 */
export type SampleRule = 'default' | 'service';

/**
 * Whether the rule should match the event.
 */
export type Expectation = 'match' | 'miss';

/**
 * One event and whether a sample rule should match it.
 */
export interface TaskEventCase {
  readonly name: string;
  readonly rule: SampleRule;
  readonly event: Record<string, unknown>;
  readonly expectation: Expectation;
}

/**
 * Builds an ECS task state change event for a stopped Fargate task in
 * {@link CLUSTER_ARN}.
 *
 * @param detail - Fields merged over the default `detail`.
 * @returns Event without the EventBridge envelope fields (`id`, `time`, ...).
 */
const taskEvent = (detail: Record<string, unknown>): Record<string, unknown> => ({
  'source': 'aws.ecs',
  'detail-type': 'ECS Task State Change',
  'detail': {
    clusterArn: CLUSTER_ARN,
    launchType: 'FARGATE',
    lastStatus: 'STOPPED',
    group: `service:${SERVICE_NAME}`,
    ...detail,
  },
});

/**
 * Events with the expected result for each sample rule.
 */
export const TASK_EVENT_CASES: TaskEventCase[] = [
  {
    name: 'matches a non-zero container exit',
    rule: 'default',
    event: taskEvent({
      containers: [{ name: 'app', exitCode: 1 }],
      stoppedReason: 'Essential container in task exited',
      stopCode: 'EssentialContainerExited',
    }),
    expectation: 'match',
  },
  {
    name: 'matches TaskFailedToStart without an exit code',
    rule: 'default',
    event: taskEvent({
      stoppedReason: 'Task failed to start',
      stopCode: 'TaskFailedToStart',
    }),
    expectation: 'match',
  },
  {
    name: 'matches CannotPullContainerError without an exit code',
    rule: 'default',
    event: taskEvent({
      stoppedReason: 'CannotPullContainerError: pull access denied',
    }),
    expectation: 'match',
  },
  {
    name: 'matches a Fargate Spot task that exits non-zero',
    rule: 'default',
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
    rule: 'default',
    event: taskEvent({
      containers: [{ name: 'app', exitCode: 0 }],
      stoppedReason: 'Essential container in task exited',
      stopCode: 'EssentialContainerExited',
    }),
    expectation: 'miss',
  },
  {
    name: 'ignores scale-in with a non-zero exit',
    rule: 'default',
    event: taskEvent({
      containers: [{ name: 'app', exitCode: 143 }],
      stoppedReason: 'Scaling activity initiated by (deployment ecs-svc/123)',
      stopCode: 'ServiceSchedulerInitiated',
    }),
    expectation: 'miss',
  },
  {
    name: 'ignores a user stop with a non-zero exit',
    rule: 'default',
    event: taskEvent({
      containers: [{ name: 'app', exitCode: 143 }],
      stoppedReason: 'Task stopped by user',
      stopCode: 'UserInitiated',
    }),
    expectation: 'miss',
  },
  {
    name: 'ignores Fargate Spot reclaim',
    rule: 'default',
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
    rule: 'default',
    event: taskEvent({
      launchType: 'EC2',
      containers: [{ name: 'app', exitCode: 1 }],
      stoppedReason: 'Essential container in task exited',
    }),
    expectation: 'miss',
  },
  {
    name: 'ignores another cluster',
    rule: 'default',
    event: taskEvent({
      clusterArn: 'arn:aws:ecs:us-east-1:123456789012:cluster/other',
      containers: [{ name: 'app', exitCode: 1 }],
      stoppedReason: 'Essential container in task exited',
    }),
    expectation: 'miss',
  },
  {
    name: 'matches the selected service',
    rule: 'service',
    event: taskEvent({
      containers: [{ name: 'app', exitCode: 1 }],
      stoppedReason: 'Essential container in task exited',
    }),
    expectation: 'match',
  },
  {
    name: 'ignores another service',
    rule: 'service',
    event: taskEvent({
      group: 'service:other',
      containers: [{ name: 'app', exitCode: 1 }],
      stoppedReason: 'Essential container in task exited',
    }),
    expectation: 'miss',
  },
];
