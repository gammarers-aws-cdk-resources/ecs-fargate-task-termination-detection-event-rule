# ECS Fargate Task Termination Detection Event Rule (CDK v2)

[![npm version](https://img.shields.io/npm/v/ecs-fargate-task-termination-detection-event-rule?style=flat-square)](https://www.npmjs.com/package/ecs-fargate-task-termination-detection-event-rule)
[![license](https://img.shields.io/npm/l/ecs-fargate-task-termination-detection-event-rule?style=flat-square)](https://www.npmjs.com/package/ecs-fargate-task-termination-detection-event-rule)
[![Node.js](https://img.shields.io/node/v/ecs-fargate-task-termination-detection-event-rule?style=flat-square)](https://www.npmjs.com/package/ecs-fargate-task-termination-detection-event-rule)
[![build](https://img.shields.io/github/actions/workflow/status/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule/build.yml?label=build&style=flat-square)](https://github.com/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule/actions/workflows/build.yml)

[![View on Construct Hub](https://constructs.dev/badge?package=ecs-fargate-task-termination-detection-event-rule)](https://constructs.dev/packages/ecs-fargate-task-termination-detection-event-rule)

An AWS CDK construct that creates an Amazon EventBridge rule for unexpected ECS on Fargate task stops. It matches non-zero container exits and startup or image-pull failures, and it leaves out expected operational stops such as scale-in, rolling replacement, user-initiated stops, and Fargate Spot interruptions.

## Features

- Matches ECS task state changes whose `lastStatus` is `STOPPED`
- By default, matches both non-zero container exit codes and startup or image-pull failures
- Narrows matching to exit codes only, or to startup failures only, with `detectionMode`
- Replaces or extends the default operational-stop exclusions with `excludedStoppedReasonPrefixes`
- Limits matching to one ECS cluster and to `launchType` `FARGATE`
- Optionally limits that cluster to one service, raw task group, or task definition
- Defines its own `eventPattern` (`props.eventPattern` is not allowed)

## How it works

Create `EcsFargateTaskTerminationDetectionEventRule` with the cluster ARN and add an EventBridge target, such as an SNS topic. The rule then receives `ECS Task State Change` events for that cluster when `launchType` is `FARGATE` and `lastStatus` is `STOPPED`. The default `detectionMode` is `ALL_FAILURES`.

EC2 and EXTERNAL tasks in the same cluster do not match. Fargate Spot tasks still match, because their `launchType` remains `FARGATE` (`capacityProviderName` is `FARGATE_SPOT`). Spot reclaim is excluded on the non-zero exit-code branch by the default `stoppedReason` prefixes.

### Matched

| Condition | Typical cause |
| --- | --- |
| Non-zero `containers.exitCode`, and `stoppedReason` does not start with an excluded prefix | Application crash, OOM, unhandled SIGKILL, health-check replacement |
| `stopCode` = `TaskFailedToStart` | Task never reached a running container |
| `stoppedReason` starts with `CannotPullContainerError` or `ResourceInitializationError` | Image pull, ENI, or secrets init failure when `exitCode` is absent |

`NON_ZERO_EXIT_CODE` keeps only the first row. `TASK_FAILED_TO_START` keeps only the startup and pull rows.

### Excluded (default)

These operational stops are ignored on the non-zero `exitCode` branch. Startup-failure matching does not apply these exclusions.

| Prefix | Constant | Typical cause |
| --- | --- | --- |
| `Scaling activity initiated by` | `DefaultExcludedStoppedReasonPrefixes.SCALING_ACTIVITY_INITIATED_BY` | Service scale-in and rolling deployment replacement (`Scaling activity initiated by (deployment ...)`) |
| `Task stopped by user` | `DefaultExcludedStoppedReasonPrefixes.TASK_STOPPED_BY_USER` | Console or API stop (`stopCode` = `UserInitiated`) |
| `Your Spot Task was interrupted` | `DefaultExcludedStoppedReasonPrefixes.SPOT_TASK_INTERRUPTED` | Fargate Spot reclaim (`stopCode` = `SpotInterruption`) |

### Missed

- Startup and pull failures in `NON_ZERO_EXIT_CODE` mode. `CannotPullContainerError`, `ResourceInitializationError`, and `TaskFailedToStart` usually have no `containers.exitCode`, so they are dropped unless you use `ALL_FAILURES` (default) or `TASK_FAILED_TO_START`.
- Other startup errors without `TaskFailedToStart`. `stoppedReason` values that do not start with the two known prefixes (for example some `CannotStartContainerError` or timeout messages) are not matched.
- Exit code `0`. A successful container exit is never treated as a failure.
- Other clusters, non-Fargate launch types, or `lastStatus` other than `STOPPED`.
- Other services, groups, or task definitions when `serviceName`, `group`, or `taskDefinitionArn` is set. `taskDefinitionArn` is an exact match, including the revision when the event has one.
- Operational stops with no exit code. Spot, user, and scale-in events that never set `containers.exitCode` do not match the exit-code branch, and they are not startup failures.

### Limits

- Exit `137` is SIGKILL. That can be an OOM kill (`OutOfMemoryError` in `stoppedReason` or `containers.reason`) or a force-kill after `stopTimeout` when the process ignored SIGTERM. EventBridge only sees a non-zero `exitCode`, so this rule cannot tell those cases apart. Inspect the event payload or CloudWatch memory metrics in the target.
- Exit `143` (SIGTERM) and other non-zero exits from stops outside the excluded prefix list (for example some Fargate task-retirement or platform-update reasons) still match. Extend `excludedStoppedReasonPrefixes` when those events are noise.
- Health-check replacements (`Task failed ELB health checks`, container health checks) are treated as failures when they produce a non-zero `exitCode`. They are not in the default exclusion set.

## Installation

### npm

```bash
npm install ecs-fargate-task-termination-detection-event-rule
```

### yarn

```bash
yarn add ecs-fargate-task-termination-detection-event-rule
```

### pnpm

```bash
pnpm add ecs-fargate-task-termination-detection-event-rule
```

## Usage

Send unexpected task-termination events to an SNS topic:

```typescript
import { App, Stack } from 'aws-cdk-lib';
import { SnsTopic } from 'aws-cdk-lib/aws-events-targets';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EcsFargateTaskTerminationDetectionEventRule } from 'ecs-fargate-task-termination-detection-event-rule';

const app = new App();
const stack = new Stack(app, 'ExampleStack');

const clusterArn = 'arn:aws:ecs:us-east-1:123456789012:cluster/example-app-cluster';
const alertTopic = new Topic(stack, 'TaskFailureAlertTopic');

const rule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'EcsFargateTaskTerminationDetectionEventRule', {
  description: 'Detect unexpected ECS/Fargate task terminations.',
  clusterArn,
});
rule.addTarget(new SnsTopic(alertTopic));
```

You can also pass `targets` in the constructor (`RuleProps`) instead of calling `addTarget`.

Common customizations:

```typescript
import {
  DefaultExcludedStoppedReasonPrefixes,
  EcsFargateTaskTerminationDetectionEventRule,
  EcsFargateTaskTerminationDetectionMode,
} from 'ecs-fargate-task-termination-detection-event-rule';

// Watch one Fargate service and one task definition revision
const serviceRule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'ServiceScopedRule', {
  clusterArn,
  serviceName: 'example-api',
  taskDefinitionArn: 'arn:aws:ecs:us-east-1:123456789012:task-definition/example-api:3',
});
serviceRule.addTarget(new SnsTopic(alertTopic));

// Match non-zero exit codes only
const exitCodeOnlyRule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'ExitCodeOnlyRule', {
  clusterArn,
  detectionMode: EcsFargateTaskTerminationDetectionMode.NON_ZERO_EXIT_CODE,
});

// Replace the default excluded stoppedReason prefixes
const replacedExclusionsRule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'ReplacedExclusionsRule', {
  clusterArn,
  excludedStoppedReasonPrefixes: [
    'Scaling activity initiated by',
    'Task stopped by user',
  ],
});

// Extend the default excluded stoppedReason prefixes
const extendedExclusionsRule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'ExtendedExclusionsRule', {
  clusterArn,
  excludedStoppedReasonPrefixes: [
    ...DefaultExcludedStoppedReasonPrefixes.ALL,
    'Task stopped due to a platform version update',
  ],
});
```

## Options

| Property | Required | Default | Description |
| --- | --- | --- | --- |
| `clusterArn` | Yes | | ARN of the ECS cluster to monitor. Matching is always limited to `launchType` `FARGATE` in that cluster. |
| `serviceName` | No | | ECS service name. Matched as `detail.group` = `service:${serviceName}`. Do not include the `service:` prefix. Cannot be set together with `group`. |
| `group` | No | | Raw ECS task group, matched exactly against `detail.group`. Use this for a non-service group. Cannot be set together with `serviceName`. |
| `taskDefinitionArn` | No | | Task definition ARN, matched exactly against `detail.taskDefinitionArn`, including the revision when the event has one. |
| `detectionMode` | No | `EcsFargateTaskTerminationDetectionMode.ALL_FAILURES` | `ALL_FAILURES` matches a non-zero `exitCode` or a startup or pull failure. `NON_ZERO_EXIT_CODE` matches only non-zero container exit codes. `TASK_FAILED_TO_START` matches only startup or pull failures. |
| `excludedStoppedReasonPrefixes` | No | `DefaultExcludedStoppedReasonPrefixes.ALL` | `stoppedReason` prefixes excluded from non-zero exit-code matching. Pass a new array to replace the default set, spread `DefaultExcludedStoppedReasonPrefixes.ALL` to extend it, or pass `[]` to disable exclusion. Applies only to the non-zero `exitCode` branch. |
| Other `RuleProps` | No | | For example `description`, `enabled`, `ruleName`, and `targets`. |
| `eventPattern` | | | Not supported. The construct always defines its own `eventPattern` and throws if one is provided. |

## API

See [API.md](API.md).

## Requirements

- Node.js `>= 20.0.0`
- AWS CDK `aws-cdk-lib` `^2.232.0`
- `constructs` `^10.5.1`

## License

This project is licensed under the Apache-2.0 License.
