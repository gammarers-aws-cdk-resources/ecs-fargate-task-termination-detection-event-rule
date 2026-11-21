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
- Excludes user stops and Spot interruptions by `stopCode`, and scale-in by a `stoppedReason` prefix
- Uses those `stoppedReason` prefixes when an event has no `stopCode`
- Replaces or extends either exclusion list
- Replaces or extends the startup-failure `stoppedReason` prefixes used when `stopCode` is absent
- Limits matching to one or more ECS clusters and to `launchType` `FARGATE`
- Optionally limits that scope to services, a raw task group, or a task definition
- Defines its own `eventPattern` (`props.eventPattern` is not allowed)

## How it works

Create `EcsFargateTaskTerminationDetectionEventRule` with a cluster and add an EventBridge target, such as an SNS topic. Pass `cluster`, `clusterArn`, or `clusterArns`. When only `service` is set, the rule uses that service's cluster. The rule then receives `ECS Task State Change` events for those clusters when `launchType` is `FARGATE` and `lastStatus` is `STOPPED`. The default `detectionMode` is `ALL_FAILURES`.

EC2 and EXTERNAL tasks in the same cluster do not match. Fargate Spot tasks still match, because their `launchType` remains `FARGATE` (`capacityProviderName` is `FARGATE_SPOT`). On the non-zero exit branch, `stopCode` `UserInitiated` and `SpotInterruption` are excluded. Scale-in and rolling replacement stay excluded by the `stoppedReason` prefix `Scaling activity initiated by`, including when `stopCode` is `ServiceSchedulerInitiated`. An event with no `stopCode` uses the `stoppedReason` prefixes alone. A startup failure matches `stopCode` `TaskFailedToStart`. The startup `stoppedReason` prefixes match only when `stopCode` is absent.

### Matched

| Condition | Typical cause |
| --- | --- |
| Non-zero `containers.exitCode`, `stopCode` is not excluded, and `stoppedReason` does not start with an excluded prefix | Application crash, OOM, unhandled SIGKILL, health-check replacement |
| Non-zero `containers.exitCode`, no `stopCode`, and `stoppedReason` does not start with an excluded prefix | The same failures when the event omits `stopCode` |
| `stopCode` = `TaskFailedToStart` | Task never reached a running container |
| No `stopCode`, and `stoppedReason` starts with `CannotPullContainerError`, `ResourceInitializationError`, `CannotStartContainerError`, or `Task failed to start` | Image pull, ENI, secrets, or container start failure |

`NON_ZERO_EXIT_CODE` keeps the exit-code rows. `TASK_FAILED_TO_START` keeps the startup and pull rows.

### Excluded (default)

These operational stops are ignored on the non-zero `exitCode` branch. Startup-failure matching does not apply them.

`stopCode` is the primary filter and applies when the event has one.

| Stop code | Constant | Typical cause |
| --- | --- | --- |
| `UserInitiated` | `DefaultExcludedStopCodes.USER_INITIATED` | Console or API stop, including when `stoppedReason` uses different wording |
| `SpotInterruption` | `DefaultExcludedStopCodes.SPOT_INTERRUPTION` | Fargate Spot reclaim |

`ServiceSchedulerInitiated` is not in this set. ELB health-check replacement uses that code as well as scale-in. `TerminationNotice` is not in this set, so platform updates and host retirement still match. Add either value from `EcsTaskStopCode` to `excludedStopCodes` to exclude it. Excluding `ServiceSchedulerInitiated` also drops ELB health-check stops.

`stoppedReason` prefixes apply on the same branch, and they are the only operational-stop filter when `stopCode` is absent.

| Prefix | Constant | Typical cause |
| --- | --- | --- |
| `Scaling activity initiated by` | `DefaultExcludedStoppedReasonPrefixes.SCALING_ACTIVITY_INITIATED_BY` | Service scale-in and rolling deployment replacement (`Scaling activity initiated by (deployment ...)`) |
| `Task stopped by user` | `DefaultExcludedStoppedReasonPrefixes.TASK_STOPPED_BY_USER` | Console or API stop when `stopCode` is absent |
| `Your Spot Task was interrupted` | `DefaultExcludedStoppedReasonPrefixes.SPOT_TASK_INTERRUPTED` | Fargate Spot reclaim when `stopCode` is absent |

### Missed

- Startup and pull failures in `NON_ZERO_EXIT_CODE` mode. `CannotPullContainerError`, `ResourceInitializationError`, and `TaskFailedToStart` usually have no `containers.exitCode`, so they are dropped unless you use `ALL_FAILURES` (default) or `TASK_FAILED_TO_START`.
- Startup errors that have neither `stopCode` `TaskFailedToStart` nor one of the default `stoppedReason` prefixes. A startup-like `stoppedReason` paired with a different `stopCode` is not treated as a startup failure.
- Exit code `0`. A successful container exit is never treated as a failure.
- Other clusters, non-Fargate launch types, or `lastStatus` other than `STOPPED`.
- Other services, groups, or task definitions when `serviceName`, `serviceNames`, `service`, `group`, or `taskDefinitionArn` is set. `taskDefinitionArn` is an exact match, including the revision when the event has one.
- Operational stops with no exit code. Spot, user, and scale-in events that never set `containers.exitCode` do not match the exit-code branch, and they are not startup failures.

### Limits

- Exit `137` is SIGKILL. That can be an OOM kill (`OutOfMemoryError` in `stoppedReason` or `containers.reason`) or a force-kill after `stopTimeout` when the process ignored SIGTERM. EventBridge only sees a non-zero `exitCode`, so this rule cannot tell those cases apart. Inspect the event payload or CloudWatch memory metrics in the target.
- Exit `143` (SIGTERM) and `TerminationNotice` (task retirement or a platform update) still match. Extend `excludedStopCodes` or `excludedStoppedReasonPrefixes` when those events are noise.
- Health-check replacements (`Task failed ELB health checks`, container health checks) are treated as failures when they produce a non-zero `exitCode`. They are not in the default exclusion set. Adding `EcsTaskStopCode.SERVICE_SCHEDULER_INITIATED` to `excludedStopCodes` excludes them together with scale-in.

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

### Minimal deployable app

Add the rule to a stack and send unexpected task-termination events to an SNS topic. This is a complete CDK app entry you can deploy as-is.

```typescript
import { App, Stack } from 'aws-cdk-lib';
import { SnsTopic } from 'aws-cdk-lib/aws-events-targets';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EcsFargateTaskTerminationDetectionEventRule } from 'ecs-fargate-task-termination-detection-event-rule';

const app = new App();

const stack = new Stack(app, 'ExampleStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

const clusterArn = 'arn:aws:ecs:us-east-1:123456789012:cluster/example-app-cluster';
const alertTopic = new Topic(stack, 'TaskFailureAlertTopic');

const rule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'EcsFargateTaskTerminationDetectionEventRule', {
  description: 'Detect unexpected ECS/Fargate task terminations.',
  clusterArn,
});
rule.addTarget(new SnsTopic(alertTopic));

app.synth();
```

Deploy checklist:

1. Install this package and its peers (`aws-cdk-lib`, `constructs`) in your CDK app.
2. Replace `clusterArn` with the ARN of your cluster. Deploy the stack to the same account and Region as that cluster, because ECS events are delivered in the Region where the tasks run.
3. From the CDK app, run `npx cdk deploy ExampleStack`.

You can also pass `targets` in the constructor (`RuleProps`) instead of calling `addTarget`.

### Common customizations

```typescript
import { Cluster } from 'aws-cdk-lib/aws-ecs';
import {
  DefaultExcludedStopCodes,
  DefaultExcludedStoppedReasonPrefixes,
  DefaultStartupFailureStoppedReasonPrefixes,
  EcsFargateTaskTerminationDetectionEventRule,
  EcsFargateTaskTerminationDetectionMode,
  EcsTaskStopCode,
} from 'ecs-fargate-task-termination-detection-event-rule';

// Watch two clusters and two services
const multiServiceRule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'MultiServiceRule', {
  clusterArns: [
    clusterArn,
    'arn:aws:ecs:us-east-1:123456789012:cluster/other',
  ],
  serviceNames: ['example-api', 'example-worker'],
});
multiServiceRule.addTarget(new SnsTopic(alertTopic));

// An existing cluster can be imported. A cluster created in this stack can be passed the same way.
const importedCluster = Cluster.fromClusterArn(stack, 'ImportedCluster', clusterArn);
const clusterRule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'ClusterRule', {
  cluster: importedCluster,
});

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

// Extend the default excluded stop codes.
// SERVICE_SCHEDULER_INITIATED also drops ELB health-check replacement.
const extendedStopCodesRule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'ExtendedStopCodesRule', {
  clusterArn,
  excludedStopCodes: [
    ...DefaultExcludedStopCodes.ALL,
    EcsTaskStopCode.TERMINATION_NOTICE,
  ],
});

// Replace the default excluded stoppedReason prefixes
const replacedExclusionsRule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'ReplacedExclusionsRule', {
  clusterArn,
  excludedStoppedReasonPrefixes: [
    'Scaling activity initiated by',
    'Task stopped by user',
  ],
});

// Extend the startup-failure prefixes used when stopCode is absent
const extendedStartupRule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'ExtendedStartupRule', {
  clusterArn,
  startupFailureStoppedReasonPrefixes: [
    ...DefaultStartupFailureStoppedReasonPrefixes.ALL,
    'Custom startup failure',
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

Set one of `cluster`, `clusterArn`, or `clusterArns`. When `service` is set and none of those are set, the rule uses `service.cluster`.

| Property | Required | Default | Description |
| --- | --- | --- | --- |
| `cluster` | No | | `ecs.ICluster` to monitor. A cluster created in the same stack stays a CloudFormation token. Cannot be set together with `clusterArn` or `clusterArns`. |
| `clusterArn` | No | | ARN of one ECS cluster. The value is placed in the pattern as given, including an empty string. Cannot be set together with `cluster` or `clusterArns`. |
| `clusterArns` | No | | ARNs of the ECS clusters to monitor. Any listed ARN matches. Must not be empty or contain an empty string. Cannot be set together with `cluster` or `clusterArn`. |
| `serviceName` | No | | ECS service name. Matched as `detail.group` = `service:${serviceName}`. Do not include the `service:` prefix. Must not be empty. Cannot be set together with `serviceNames`, `service`, or `group`. |
| `serviceNames` | No | | ECS service names. Each is matched as `detail.group` = `service:${name}`. Any listed service matches. Must not be empty, contain an empty string, or include the `service:` prefix. Cannot be set together with `serviceName`, `service`, or `group`. |
| `service` | No | | `ecs.IBaseService` to monitor. Matched as `detail.group` = `service:${service.serviceName}`. When no cluster property is set, `service.cluster` selects the cluster. Cannot be set together with `serviceName`, `serviceNames`, or `group`. |
| `group` | No | | Raw ECS task group, matched exactly against `detail.group`. Use this for a non-service group. Must not be empty. Cannot be set together with `serviceName`, `serviceNames`, or `service`. |
| `taskDefinitionArn` | No | | Task definition ARN, matched exactly against `detail.taskDefinitionArn`, including the revision when the event has one. Must not be empty. |
| `detectionMode` | No | `EcsFargateTaskTerminationDetectionMode.ALL_FAILURES` | `ALL_FAILURES` matches a non-zero `exitCode` or a startup failure. `NON_ZERO_EXIT_CODE` matches only non-zero container exit codes. `TASK_FAILED_TO_START` matches `stopCode` `TaskFailedToStart`, and the startup `stoppedReason` prefixes when `stopCode` is absent. |
| `excludedStopCodes` | No | `DefaultExcludedStopCodes.ALL` | `stopCode` values excluded from non-zero exit-code matching when the event has a `stopCode`. The default is `UserInitiated` and `SpotInterruption`. Pass a new array to replace the default set, spread `DefaultExcludedStopCodes.ALL` and append `EcsTaskStopCode` values to extend it, or pass `[]` to disable this filter. Must not contain empty strings. |
| `excludedStoppedReasonPrefixes` | No | `DefaultExcludedStoppedReasonPrefixes.ALL` | `stoppedReason` prefixes excluded from non-zero exit-code matching. Applied together with `excludedStopCodes` when `stopCode` is present, and alone when `stopCode` is absent. Pass a new array to replace the default set, spread `DefaultExcludedStoppedReasonPrefixes.ALL` to extend it, or pass `[]` to disable prefix exclusion. Must not contain empty strings. |
| `startupFailureStoppedReasonPrefixes` | No | `DefaultStartupFailureStoppedReasonPrefixes.ALL` | `stoppedReason` prefixes that match a startup failure when `stopCode` is absent. The default includes `CannotPullContainerError`, `ResourceInitializationError`, `CannotStartContainerError`, and `Task failed to start`. `stopCode` `TaskFailedToStart` matches even when this list is empty. Spread `DefaultStartupFailureStoppedReasonPrefixes.ALL` to extend it. Must not contain empty strings. |
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
