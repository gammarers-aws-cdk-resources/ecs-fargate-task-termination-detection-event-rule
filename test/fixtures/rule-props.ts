import { SERVICE_NAME, TASK_DEFINITION_ARN, TASK_GROUP } from './constants';
import {
  DefaultExcludedStoppedReasonPrefixes,
  EcsFargateTaskTerminationDetectionEventRuleProps,
  EcsFargateTaskTerminationDetectionMode,
} from '../../src';

/**
 * Rule props other than `clusterArn`, which every sample rule fixes.
 */
export type RuleSampleProps = Omit<EcsFargateTaskTerminationDetectionEventRuleProps, 'clusterArn'>;

/**
 * One representative combination of public props.
 */
export interface RulePropsCase {
  readonly name: string;
  readonly props: RuleSampleProps;
}

/**
 * Representative combinations of public props. The unit tests snapshot each one
 * and the integration tests check that EventBridge accepts each one.
 */
export const RULE_PROPS_CASES: RulePropsCase[] = [
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
  { name: 'group', props: { group: TASK_GROUP } },
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
