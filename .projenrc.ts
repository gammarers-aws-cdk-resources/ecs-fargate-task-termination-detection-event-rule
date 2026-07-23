import { awscdk, javascript, github } from 'projen';
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'yicr',
  authorAddress: 'yicr@users.noreply.github.com',
  cdkVersion: '2.232.0',
  defaultReleaseBranch: 'main',
  typescriptVersion: '6.0.x',
  jsiiVersion: '6.0.x',
  name: 'ecs-fargate-task-termination-detection-event-rule',
  packageManager: javascript.NodePackageManager.NPM,
  description: 'An AWS CDK construct that creates an Amazon EventBridge rule to detect ECS/Fargate task terminations caused by unexpected failures (non-zero exit codes and startup/pull failures), while excluding expected scaling events.',
  keywords: ['aws', 'cdk', 'aws-cdk', 'event', 'rule', 'ecs', 'fargate'],
  projenrcTs: true,
  releaseToNpm: true,
  npmTrustedPublishing: true,
  repositoryUrl: 'https://github.com/gammarers-aws-cdk-resources/ecs-fargate-task-termination-detection-event-rule.git',
  npmAccess: javascript.NpmAccess.PUBLIC,
  minNodeVersion: '20.0.0',
  workflowNodeVersion: '24.x',
  depsUpgradeOptions: {
    workflowOptions: {
      labels: ['auto-approve', 'auto-merge'],
      schedule: javascript.UpgradeDependenciesSchedule.WEEKLY,
    },
  },
  githubOptions: {
    projenCredentials: github.GithubCredentials.fromApp({
      permissions: {
        pullRequests: github.workflows.AppPermission.WRITE,
        contents: github.workflows.AppPermission.WRITE,
        workflows: github.workflows.AppPermission.WRITE,
      },
    }),
  },
  autoApproveOptions: {
    allowedUsernames: [
      'gammarers-projen-upgrade-bot[bot]',
      'yicr',
    ],
  },
});
project.addPackageIgnore('/.devcontainer');
project.synth();