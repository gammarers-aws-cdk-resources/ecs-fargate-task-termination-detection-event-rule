# ECS Fargate task termination detection event rule (AWS CDK V2)

[![GitHub](https://img.shields.io/github/license/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule?style=flat-square)](https://github.com/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/ecs-fargate-task-termination-detection-event-rule?style=flat-square)](https://www.npmjs.com/package/ecs-fargate-task-termination-detection-event-rule)
[![GitHub Workflow Status (branch)](https://img.shields.io/github/actions/workflow/status/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule/release.yml?branch=main&label=release&style=flat-square)](https://github.com/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule/actions/workflows/release.yml)
[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule?sort=semver&style=flat-square)](https://github.com/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule/releases)

[![View on Construct Hub](https://constructs.dev/badge?package=ecs-fargate-task-termination-detection-event-rule)](https://constructs.dev/packages/ecs-fargate-task-termination-detection-event-rule)

An AWS CDK construct that creates an Amazon EventBridge rule to detect ECS/Fargate task terminations with non-zero container exit codes, while excluding expected scaling events.

## Features

- Detects ECS task state changes where `lastStatus` is `STOPPED`
- Filters for non-zero container exit codes
- Excludes common, expected scaling stop reasons

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
import { EcsFargateTaskTerminationDetectionEventRule } from 'ecs-fargate-task-termination-detection-event-rule';

const clusterArn = 'arn:aws:ecs:us-east-1:123456789012:cluster/example-app-cluster';

const rule = new EcsFargateTaskTerminationDetectionEventRule(stack, 'EcsFargateTaskTerminationDetectionEventRule', {
  description: 'example event rule.',
  clusterArn,
});

```

## Options

- `clusterArn` (required): ARN of the ECS cluster to monitor
- `eventPattern`: Not supported. This construct defines its own `eventPattern` and will throw if you provide one.

## Requirements

- Node.js `>= 20`
- AWS CDK `aws-cdk-lib` v2
- `constructs` v10

## License

This project is licensed under the (Apache-2.0) License.
