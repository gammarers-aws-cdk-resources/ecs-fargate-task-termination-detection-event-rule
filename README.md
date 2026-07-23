# ECS Fargate task termination detection event rule (AWS CDK V2)

[![GitHub](https://img.shields.io/github/license/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule?style=flat-square)](https://github.com/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/ecs-fargate-task-termination-detection-event-rule?style=flat-square)](https://www.npmjs.com/package/ecs-fargate-task-termination-detection-event-rule)
[![GitHub Workflow Status (branch)](https://img.shields.io/github/actions/workflow/status/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule/release.yml?branch=main&label=release&style=flat-square)](https://github.com/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule/actions/workflows/release.yml)
[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule?sort=semver&style=flat-square)](https://github.com/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule/releases)

[![View on Construct Hub](https://constructs.dev/badge?package=ecs-fargate-task-termination-detection-event-rule)](https://constructs.dev/packages/ecs-fargate-task-termination-detection-event-rule)

An AWS CDK construct that creates an Amazon EventBridge rule to detect ECS/Fargate task terminations caused by unexpected failures (non-zero exit codes and startup/pull failures), while excluding expected scaling events.

## Features

- Detects ECS task state changes where `lastStatus` is `STOPPED`
- By default, matches both non-zero container exit codes and startup/pull failures via EventBridge `$or`
  - Non-zero `containers.exitCode` (excluding expected scaling stop reasons)
  - `stopCode` = `TaskFailedToStart`
  - `stoppedReason` prefixes such as `CannotPullContainerError` and `ResourceInitializationError`
- Supports `detectionMode` to narrow matching to exit-code-only or startup-failure-only
- Scopes matching to a specific ECS cluster via `clusterArn`
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

```typescript
import {
  EcsFargateTaskTerminationDetectionEventRule,
  EcsFargateTaskTerminationDetectionMode,
} from 'ecs-fargate-task-termination-detection-event-rule';

const clusterArn = 'arn:aws:ecs:us-east-1:123456789012:cluster/example-app-cluster';

// Default: ALL_FAILURES (non-zero exitCode or startup/pull failures)
const rule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'EcsFargateTaskTerminationDetectionEventRule', {
  description: 'Detect unexpected ECS/Fargate task terminations.',
  clusterArn,
});

// Optional: narrow matching to non-zero exit codes only
const exitCodeOnlyRule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'ExitCodeOnlyRule', {
  clusterArn,
  detectionMode: EcsFargateTaskTerminationDetectionMode.NON_ZERO_EXIT_CODE,
});
```

## Options

- `clusterArn` (required): ARN of the ECS cluster to monitor
- `detectionMode` (optional): Failure matching strategy. Defaults to `EcsFargateTaskTerminationDetectionMode.ALL_FAILURES`
  - `ALL_FAILURES`: non-zero `exitCode` **or** startup/pull failures (`stopCode` = `TaskFailedToStart` / known `stoppedReason` prefixes)
  - `NON_ZERO_EXIT_CODE`: only non-zero container exit codes
  - `TASK_FAILED_TO_START`: only startup/pull failures
- Any other `RuleProps` options (for example `description`, `enabled`, `ruleName`, `targets`) can be provided as usual
- `eventPattern`: Not supported. This construct always defines its own `eventPattern` and will throw if you provide one

## Requirements

- Node.js `>= 20`
- AWS CDK `aws-cdk-lib` `^2.232.0`
- `constructs` `^10.5.1`

## License

This project is licensed under the Apache-2.0 License.
