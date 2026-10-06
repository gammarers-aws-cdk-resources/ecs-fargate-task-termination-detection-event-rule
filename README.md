# ECS Fargate task termination detection event rule (AWS CDK V2)

[![GitHub](https://img.shields.io/github/license/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule?style=flat-square)](https://github.com/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/ecs-fargate-task-termination-detection-event-rule?style=flat-square)](https://www.npmjs.com/package/ecs-fargate-task-termination-detection-event-rule)
[![GitHub Workflow Status (branch)](https://img.shields.io/github/actions/workflow/status/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule/release.yml?branch=main&label=release&style=flat-square)](https://github.com/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule/actions/workflows/release.yml)
[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule?sort=semver&style=flat-square)](https://github.com/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule/releases)

[![View on Construct Hub](https://constructs.dev/badge?package=ecs-fargate-task-termination-detection-event-rule)](https://constructs.dev/packages/ecs-fargate-task-termination-detection-event-rule)

An AWS CDK construct that creates an Amazon EventBridge rule to detect ECS/Fargate task terminations caused by unexpected failures (non-zero exit codes and startup/pull failures), while excluding expected operational stops (scale-in, rolling deployment replacement, user-initiated stops, and Fargate Spot interruptions).

## Features

- Detects ECS task state changes where `lastStatus` is `STOPPED`
- By default, matches both non-zero container exit codes and startup/pull failures via EventBridge `$or`
  - Non-zero `containers.exitCode` (excluding expected operational `stoppedReason` prefixes)
  - `stopCode` = `TaskFailedToStart`
  - `stoppedReason` prefixes such as `CannotPullContainerError` and `ResourceInitializationError`
- Supports `detectionMode` to narrow matching to exit-code-only or startup-failure-only
- Supports `excludedStoppedReasonPrefixes` to replace or extend the default operational-stop exclusions
- Scopes matching to a specific ECS cluster via `clusterArn`, and always to `launchType` `FARGATE`
- Optionally narrows that cluster to one service (`serviceName`), raw task group (`group`), or task definition (`taskDefinitionArn`)
- Owns its own `eventPattern` (`props.eventPattern` is not allowed)

## Installation

### TypeScript

**npm**

```shell
npm install ecs-fargate-task-termination-detection-event-rule
```

**yarn**

```shell
yarn add ecs-fargate-task-termination-detection-event-rule
```

## Usage

Send unexpected task-termination events to an SNS topic (or any other EventBridge target):

```typescript
import { Topic } from 'aws-cdk-lib/aws-sns';
import { SnsTopic } from 'aws-cdk-lib/aws-events-targets';
import {
  DefaultExcludedStoppedReasonPrefixes,
  EcsFargateTaskTerminationDetectionEventRule,
  EcsFargateTaskTerminationDetectionMode,
} from 'ecs-fargate-task-termination-detection-event-rule';

const clusterArn = 'arn:aws:ecs:us-east-1:123456789012:cluster/example-app-cluster';
const alertTopic = new Topic(stack, 'TaskFailureAlertTopic');

const rule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'EcsFargateTaskTerminationDetectionEventRule', {
  description: 'Detect unexpected ECS/Fargate task terminations.',
  clusterArn,
});
rule.addTarget(new SnsTopic(alertTopic));

// Optional: watch one Fargate service and one task definition revision
const serviceRule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'ServiceScopedRule', {
  clusterArn,
  serviceName: 'example-api',
  taskDefinitionArn: 'arn:aws:ecs:us-east-1:123456789012:task-definition/example-api:3',
});
serviceRule.addTarget(new SnsTopic(alertTopic));

// Optional: narrow matching to non-zero exit codes only
const exitCodeOnlyRule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'ExitCodeOnlyRule', {
  clusterArn,
  detectionMode: EcsFargateTaskTerminationDetectionMode.NON_ZERO_EXIT_CODE,
});

// Optional: replace the default excluded stoppedReason prefixes
const replacedExclusionsRule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'ReplacedExclusionsRule', {
  clusterArn,
  excludedStoppedReasonPrefixes: [
    'Scaling activity initiated by',
    'Task stopped by user',
  ],
});

// Optional: extend the default excluded stoppedReason prefixes
const extendedExclusionsRule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'ExtendedExclusionsRule', {
  clusterArn,
  excludedStoppedReasonPrefixes: [
    ...DefaultExcludedStoppedReasonPrefixes.ALL,
    'Task stopped due to a platform version update',
  ],
});
```

You can also pass `targets` in the constructor (`RuleProps`) instead of calling `addTarget`.

## Detection scope

The rule matches `ECS Task State Change` events for the given `clusterArn` where `launchType` is `FARGATE` and `lastStatus` is `STOPPED`. Default `detectionMode` is `ALL_FAILURES`. EC2 and EXTERNAL tasks in the same cluster do not match. Fargate Spot tasks still match, because their `launchType` remains `FARGATE` (`capacityProviderName` is `FARGATE_SPOT`). Spot reclaim is excluded on the non-zero exit-code branch by the default `stoppedReason` prefixes.

### Matched

| Condition | Typical cause |
| --- | --- |
| Non-zero `containers.exitCode`, and `stoppedReason` does not start with an excluded prefix | Application crash, OOM, unhandled SIGKILL, health-check replacement |
| `stopCode` = `TaskFailedToStart` | Task never reached a running container |
| `stoppedReason` starts with `CannotPullContainerError` or `ResourceInitializationError` | Image pull / ENI / secrets init failure when `exitCode` is absent |

`NON_ZERO_EXIT_CODE` keeps only the first row. `TASK_FAILED_TO_START` keeps only the startup/pull rows.

### Excluded (default)

These operational stops are ignored on the non-zero `exitCode` branch (see [Default excluded `stoppedReason` prefixes](#default-excluded-stoppedreason-prefixes)):

- Service scale-in and rolling deployment replacement (`Scaling activity initiated by`)
- Console/API stop (`Task stopped by user`)
- Fargate Spot reclaim (`Your Spot Task was interrupted`)

Startup-failure matching does not apply these exclusions.

### Missed (false negatives)

- **Startup/pull failures in `NON_ZERO_EXIT_CODE` mode**: `CannotPullContainerError`, `ResourceInitializationError`, and `TaskFailedToStart` usually have no `containers.exitCode`, so they are dropped unless you use `ALL_FAILURES` (default) or `TASK_FAILED_TO_START`.
- **Other startup errors without `TaskFailedToStart`**: `stoppedReason` values that do not start with the two known prefixes (for example some `CannotStartContainerError` / timeout messages) are not matched.
- **Exit code `0`**: successful container exit is never treated as a failure.
- **Other clusters, non-Fargate launch types, or `lastStatus` other than `STOPPED`**: the pattern is scoped to one cluster, to `launchType` `FARGATE`, and to `STOPPED` only.
- **Other services, groups, or task definitions**: when `serviceName`, `group`, or `taskDefinitionArn` is set, events outside that identity do not match. `taskDefinitionArn` is an exact match, including the revision when the event has one.
- **Operational stops with no exit code**: Spot / user / scale-in events that never set `containers.exitCode` do not match the exit-code branch (and are not startup failures). That is intentional.

### False positives and limits

- **Exit `137` is not OOM-specific.** `137` means SIGKILL. That can be an OOM kill (`OutOfMemoryError` in `stoppedReason` / `containers.reason`) **or** a force-kill after `stopTimeout` when the process ignored SIGTERM. EventBridge only sees a non-zero `exitCode`, so this rule **cannot distinguish OOM from other SIGKILL**. Inspect the event payload or CloudWatch memory metrics in the target (Lambda, logs, and so on).
- **Exit `143` (SIGTERM)** and other non-zero exits from stops that are **not** in the excluded prefix list (for example some Fargate task-retirement / platform-update reasons) will still fire. Extend `excludedStoppedReasonPrefixes` if those are noise.
- **Health-check replacements** (`Task failed ELB health checks`, container health checks) are treated as failures when they produce a non-zero `exitCode`. They are not in the default exclusion set.

## Options

- `clusterArn` (required): ARN of the ECS cluster to monitor. Matching is always limited to `launchType` `FARGATE` inside that cluster
- `serviceName` (optional): ECS service name. Matched as `detail.group` = `service:${serviceName}`. Do not include the `service:` prefix. Cannot be set together with `group`
- `group` (optional): Raw ECS task group, matched exactly against `detail.group`. Use this for a non-service group. For a service, use `serviceName`. Cannot be set together with `serviceName`
- `taskDefinitionArn` (optional): Task definition ARN, matched exactly against `detail.taskDefinitionArn`. Include the revision when events carry one (`.../family:revision`)
- `detectionMode` (optional): Failure matching strategy. Defaults to `EcsFargateTaskTerminationDetectionMode.ALL_FAILURES`
  - `ALL_FAILURES`: non-zero `exitCode` **or** startup/pull failures (`stopCode` = `TaskFailedToStart` / known `stoppedReason` prefixes)
  - `NON_ZERO_EXIT_CODE`: only non-zero container exit codes
  - `TASK_FAILED_TO_START`: only startup/pull failures
- `excludedStoppedReasonPrefixes` (optional): `stoppedReason` prefixes excluded from non-zero exit-code matching. Defaults to `DefaultExcludedStoppedReasonPrefixes.ALL`. Pass a new array to replace the default set, spread `DefaultExcludedStoppedReasonPrefixes.ALL` to extend it, or pass `[]` to disable exclusion. Applies only to the non-zero `exitCode` branch
- Any other `RuleProps` options (for example `description`, `enabled`, `ruleName`, `targets`) can be provided as usual
- `eventPattern`: Not supported. This construct always defines its own `eventPattern` and will throw if you provide one

## Default excluded `stoppedReason` prefixes

Non-zero `exitCode` matching uses EventBridge `anything-but` prefix matching to ignore expected operational stops. The default set (`DefaultExcludedStoppedReasonPrefixes.ALL`) is:

| Prefix | Constant | Typical cause |
| --- | --- | --- |
| `Scaling activity initiated by` | `DefaultExcludedStoppedReasonPrefixes.SCALING_ACTIVITY_INITIATED_BY` | Service scale-in and rolling deployment replacement (`Scaling activity initiated by (deployment ...)`) |
| `Task stopped by user` | `DefaultExcludedStoppedReasonPrefixes.TASK_STOPPED_BY_USER` | Console/API stop (`stopCode` = `UserInitiated`) |
| `Your Spot Task was interrupted` | `DefaultExcludedStoppedReasonPrefixes.SPOT_TASK_INTERRUPTED` | Fargate Spot reclaim (`stopCode` = `SpotInterruption`) |

## Requirements

- Node.js `>= 20`
- AWS CDK `aws-cdk-lib` `^2.232.0`
- `constructs` `^10.5.1`

## License

This project is licensed under the Apache-2.0 License.
