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
    '@aws-sdk/client-eventbridge@^3.1160.0',
  ],
});

// Integration tests call the real EventBridge `TestEventPattern` API, so they
// need AWS credentials. Keep them out of `projen test` and the PR build.
const INTEG_TEST_DIR = 'test/integ';
const INTEG_TEST_TIMEOUT_MS = 60_000;
project.jest?.addIgnorePattern(`/${INTEG_TEST_DIR}/`);
project.addTask('integ', {
  description: 'Run integration tests against the real Amazon EventBridge (needs AWS credentials)',
  exec: [
    'jest',
    '--coverage=false',
    `--testPathPattern=${INTEG_TEST_DIR}`,
    '--testPathIgnorePatterns=/node_modules/',
    `--testTimeout=${INTEG_TEST_TIMEOUT_MS}`,
  ].join(' '),
  receiveArgs: true,
});

project.addPackageIgnore('/.devcontainer');
project.synth();