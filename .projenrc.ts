import { ProjenCdkConstructLibrary } from '@gammarers/projen-projects';
const project = new ProjenCdkConstructLibrary({
  cdkVersion: '2.232.0',
  name: 'ecs-fargate-task-termination-detection-event-rule',
  description: 'An AWS CDK construct that creates an Amazon EventBridge rule to detect ECS/Fargate task terminations caused by unexpected failures (non-zero exit codes and startup/pull failures), while excluding expected operational stops.',
  keywords: ['aws', 'cdk', 'aws-cdk', 'event', 'rule', 'ecs', 'fargate'],
  releaseToNpm: true,
  npmTrustedPublishing: true,
  repositoryUrl: 'https://github.com/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule.git',
  devDeps: [
    '@gammarers/projen-projects@^0.5.1',
  ],
});
project.addPackageIgnore('/.devcontainer');
project.synth();