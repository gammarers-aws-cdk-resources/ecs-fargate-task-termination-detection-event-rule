/**
 * Values shared by the unit tests, the integration tests, and the fixtures.
 */

/**
 * Account ID used for synthesized stacks and sample ARNs.
 */
export const TEST_ACCOUNT_ID = '123456789012';

/**
 * Region used for synthesized stacks and sample ARNs. Synthesis never calls AWS,
 * so this does not decide where the integration tests run.
 */
export const TEST_REGION = 'us-east-1';

/**
 * Cluster the sample rules are scoped to.
 */
export const CLUSTER_ARN = `arn:aws:ecs:${TEST_REGION}:${TEST_ACCOUNT_ID}:cluster/example-app-cluster`;

/**
 * Service name used by the `service` sample rule.
 */
export const SERVICE_NAME = 'example-api';

/**
 * Raw task group used by the sample rules that set `group`.
 */
export const TASK_GROUP = 'family:example-worker';

/**
 * Task definition used by the sample rules that set `taskDefinitionArn`.
 */
export const TASK_DEFINITION_ARN = `arn:aws:ecs:${TEST_REGION}:${TEST_ACCOUNT_ID}:task-definition/example-api:3`;
