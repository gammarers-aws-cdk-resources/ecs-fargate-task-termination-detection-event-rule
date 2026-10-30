import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CLUSTER_ARN, TEST_ACCOUNT_ID, TEST_REGION } from './constants';
import {
  EcsFargateTaskTerminationDetectionEventRule,
  EcsFargateTaskTerminationDetectionEventRuleProps,
} from '../../src';

/**
 * Creates an empty stack in the test account and region.
 *
 * @returns A stack in a new app.
 */
export const createStack = (): Stack => {
  return new Stack(new App(), 'TestStack', {
    env: { account: TEST_ACCOUNT_ID, region: TEST_REGION },
  });
};

/**
 * Synthesizes one rule in a new stack.
 *
 * @param props - Rule props. `clusterArn` defaults to {@link CLUSTER_ARN}.
 * @returns Template of the stack that holds the rule.
 * @throws Error if the construct rejects `props`.
 */
export const createTemplate = (
  props: Partial<EcsFargateTaskTerminationDetectionEventRuleProps> = {},
): Template => {
  const stack = createStack();
  new EcsFargateTaskTerminationDetectionEventRule(stack, 'Rule', {
    clusterArn: CLUSTER_ARN,
    ...props,
  });

  return Template.fromStack(stack);
};
