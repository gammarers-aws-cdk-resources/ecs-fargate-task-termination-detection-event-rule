# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### EcsFargateTaskTerminationDetectionEventRule <a name="EcsFargateTaskTerminationDetectionEventRule" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule"></a>

EventBridge rule that detects ECS/Fargate task terminations caused by unexpected failures, while excluding expected operational stops (scale-in, rolling deployment replacement, user-initiated stops, and Fargate Spot interruptions).

By default this matches both non-zero container exit codes and startup/pull
failures where `exitCode` is absent. Startup failures match `stopCode`
`TaskFailedToStart`, and {@link DefaultStartupFailureStoppedReasonPrefixes.ALL}
when `stopCode` is absent. Use {@link EcsFargateTaskTerminationDetectionMode}
to narrow the match if needed.

User-initiated stops and Fargate Spot interruptions are excluded by
`stopCode` ({@link DefaultExcludedStopCodes.ALL}). Scale-in stays excluded
by the `stoppedReason` prefix `Scaling activity initiated by`, including
when `stopCode` is `ServiceSchedulerInitiated`. Events that omit `stopCode`
use {@link DefaultExcludedStoppedReasonPrefixes.ALL}.

This rule defines its own `eventPattern` and does not accept `props.eventPattern`.
The pattern is scoped to the selected clusters and to `launchType` `FARGATE`.
Optional `serviceName`, `serviceNames`, `service`, `group`, `taskDefinitionArn`,
and `containerNames` narrow that scope further. `ignoredExitCodes` drops more
exit codes on the non-zero exit branch.

#### Initializers <a name="Initializers" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.Initializer"></a>

```typescript
import { EcsFargateTaskTerminationDetectionEventRule } from 'ecs-fargate-task-termination-detection-event-rule'

new EcsFargateTaskTerminationDetectionEventRule(scope: Construct, id: string, props: EcsFargateTaskTerminationDetectionEventRuleProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | - Parent construct. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.Initializer.parameter.id">id</a></code> | <code>string</code> | - Construct identifier. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.Initializer.parameter.props">props</a></code> | <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps">EcsFargateTaskTerminationDetectionEventRuleProps</a></code> | - Rule properties. |

---

##### `scope`<sup>Required</sup> <a name="scope" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

Parent construct.

---

##### `id`<sup>Required</sup> <a name="id" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.Initializer.parameter.id"></a>

- *Type:* string

Construct identifier.

---

##### `props`<sup>Required</sup> <a name="props" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.Initializer.parameter.props"></a>

- *Type:* <a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps">EcsFargateTaskTerminationDetectionEventRuleProps</a>

Rule properties.

Set `cluster`, `clusterArn`, `clusterArns`, or `service`.

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.with">with</a></code> | Applies one or more mixins to this construct. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.applyRemovalPolicy">applyRemovalPolicy</a></code> | Apply the given removal policy to this resource. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.addEventPattern">addEventPattern</a></code> | Adds an event pattern filter to this rule. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.addTarget">addTarget</a></code> | Adds a target to the rule. The abstract class RuleTarget can be extended to define new targets. |

---

##### `toString` <a name="toString" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `with` <a name="with" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.with"></a>

```typescript
public with(mixins: ...IMixin[]): IConstruct
```

Applies one or more mixins to this construct.

Mixins are applied in order. The list of constructs is captured at the
start of the call, so constructs added by a mixin will not be visited.
Use multiple `with()` calls if subsequent mixins should apply to added
constructs.

###### `mixins`<sup>Required</sup> <a name="mixins" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.with.parameter.mixins"></a>

- *Type:* ...constructs.IMixin[]

The mixins to apply.

---

##### `applyRemovalPolicy` <a name="applyRemovalPolicy" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.applyRemovalPolicy"></a>

```typescript
public applyRemovalPolicy(policy: RemovalPolicy): void
```

Apply the given removal policy to this resource.

The Removal Policy controls what happens to this resource when it stops
being managed by CloudFormation, either because you've removed it from the
CDK application or because you've made a change that requires the resource
to be replaced.

The resource can be deleted (`RemovalPolicy.DESTROY`), or left in your AWS
account for data recovery and cleanup later (`RemovalPolicy.RETAIN`).

###### `policy`<sup>Required</sup> <a name="policy" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.applyRemovalPolicy.parameter.policy"></a>

- *Type:* aws-cdk-lib.RemovalPolicy

---

##### `addEventPattern` <a name="addEventPattern" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.addEventPattern"></a>

```typescript
public addEventPattern(eventPattern?: EventPattern): void
```

Adds an event pattern filter to this rule.

If a pattern was already specified,
these values are merged into the existing pattern.

For example, if the rule already contains the pattern:

   {
     "resources": [ "r1" ],
     "detail": {
       "hello": [ 1 ]
     }
   }

And `addEventPattern` is called with the pattern:

   {
     "resources": [ "r2" ],
     "detail": {
       "foo": [ "bar" ]
     }
   }

The resulting event pattern will be:

   {
     "resources": [ "r1", "r2" ],
     "detail": {
       "hello": [ 1 ],
       "foo": [ "bar" ]
     }
   }

###### `eventPattern`<sup>Optional</sup> <a name="eventPattern" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.addEventPattern.parameter.eventPattern"></a>

- *Type:* aws-cdk-lib.aws_events.EventPattern

---

##### `addTarget` <a name="addTarget" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.addTarget"></a>

```typescript
public addTarget(target?: IRuleTarget): void
```

Adds a target to the rule. The abstract class RuleTarget can be extended to define new targets.

No-op if target is undefined.

###### `target`<sup>Optional</sup> <a name="target" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.addTarget.parameter.target"></a>

- *Type:* aws-cdk-lib.aws_events.IRuleTarget

---

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.isOwnedResource">isOwnedResource</a></code> | Returns true if the construct was created by CDK, and false otherwise. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.isResource">isResource</a></code> | Check whether the given construct is a Resource. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.fromEventRuleArn">fromEventRuleArn</a></code> | Import an existing EventBridge Rule provided an ARN. |

---

##### `isConstruct` <a name="isConstruct" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.isConstruct"></a>

```typescript
import { EcsFargateTaskTerminationDetectionEventRule } from 'ecs-fargate-task-termination-detection-event-rule'

EcsFargateTaskTerminationDetectionEventRule.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

##### `isOwnedResource` <a name="isOwnedResource" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.isOwnedResource"></a>

```typescript
import { EcsFargateTaskTerminationDetectionEventRule } from 'ecs-fargate-task-termination-detection-event-rule'

EcsFargateTaskTerminationDetectionEventRule.isOwnedResource(construct: IConstruct)
```

Returns true if the construct was created by CDK, and false otherwise.

###### `construct`<sup>Required</sup> <a name="construct" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.isOwnedResource.parameter.construct"></a>

- *Type:* constructs.IConstruct

---

##### `isResource` <a name="isResource" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.isResource"></a>

```typescript
import { EcsFargateTaskTerminationDetectionEventRule } from 'ecs-fargate-task-termination-detection-event-rule'

EcsFargateTaskTerminationDetectionEventRule.isResource(construct: IConstruct)
```

Check whether the given construct is a Resource.

###### `construct`<sup>Required</sup> <a name="construct" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.isResource.parameter.construct"></a>

- *Type:* constructs.IConstruct

---

##### `fromEventRuleArn` <a name="fromEventRuleArn" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.fromEventRuleArn"></a>

```typescript
import { EcsFargateTaskTerminationDetectionEventRule } from 'ecs-fargate-task-termination-detection-event-rule'

EcsFargateTaskTerminationDetectionEventRule.fromEventRuleArn(scope: Construct, id: string, eventRuleArn: string)
```

Import an existing EventBridge Rule provided an ARN.

###### `scope`<sup>Required</sup> <a name="scope" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.fromEventRuleArn.parameter.scope"></a>

- *Type:* constructs.Construct

The parent creating construct (usually `this`).

---

###### `id`<sup>Required</sup> <a name="id" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.fromEventRuleArn.parameter.id"></a>

- *Type:* string

The construct's name.

---

###### `eventRuleArn`<sup>Required</sup> <a name="eventRuleArn" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.fromEventRuleArn.parameter.eventRuleArn"></a>

- *Type:* string

Event Rule ARN (i.e. arn:aws:events:<region>:<account-id>:rule/MyScheduledRule).

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.property.env">env</a></code> | <code>aws-cdk-lib.interfaces.ResourceEnvironment</code> | The environment this resource belongs to. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.property.stack">stack</a></code> | <code>aws-cdk-lib.Stack</code> | The stack in which this resource is defined. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.property.ruleArn">ruleArn</a></code> | <code>string</code> | The value of the event rule Amazon Resource Name (ARN), such as arn:aws:events:us-east-2:123456789012:rule/example. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.property.ruleName">ruleName</a></code> | <code>string</code> | The name event rule. |

---

##### `node`<sup>Required</sup> <a name="node" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `env`<sup>Required</sup> <a name="env" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.property.env"></a>

```typescript
public readonly env: ResourceEnvironment;
```

- *Type:* aws-cdk-lib.interfaces.ResourceEnvironment

The environment this resource belongs to.

For resources that are created and managed in a Stack (those created by
creating new class instances like `new Role()`, `new Bucket()`, etc.), this
is always the same as the environment of the stack they belong to.

For referenced resources (those obtained from referencing methods like
`Role.fromRoleArn()`, `Bucket.fromBucketName()`, etc.), they might be
different than the stack they were imported into.

---

##### `stack`<sup>Required</sup> <a name="stack" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.property.stack"></a>

```typescript
public readonly stack: Stack;
```

- *Type:* aws-cdk-lib.Stack

The stack in which this resource is defined.

---

##### `ruleArn`<sup>Required</sup> <a name="ruleArn" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.property.ruleArn"></a>

```typescript
public readonly ruleArn: string;
```

- *Type:* string

The value of the event rule Amazon Resource Name (ARN), such as arn:aws:events:us-east-2:123456789012:rule/example.

---

##### `ruleName`<sup>Required</sup> <a name="ruleName" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.property.ruleName"></a>

```typescript
public readonly ruleName: string;
```

- *Type:* string

The name event rule.

---

#### Constants <a name="Constants" id="Constants"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.property.PROPERTY_INJECTION_ID">PROPERTY_INJECTION_ID</a></code> | <code>string</code> | Uniquely identifies this class. |

---

##### `PROPERTY_INJECTION_ID`<sup>Required</sup> <a name="PROPERTY_INJECTION_ID" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.property.PROPERTY_INJECTION_ID"></a>

```typescript
public readonly PROPERTY_INJECTION_ID: string;
```

- *Type:* string

Uniquely identifies this class.

---

## Structs <a name="Structs" id="Structs"></a>

### EcsFargateTaskTerminationDetectionEventRuleProps <a name="EcsFargateTaskTerminationDetectionEventRuleProps" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps"></a>

Properties for {@link EcsFargateTaskTerminationDetectionEventRule}.

Extends EventBridge {@link RuleProps}, except `eventPattern` which must not
be set (this construct always owns the pattern).

#### Initializer <a name="Initializer" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.Initializer"></a>

```typescript
import { EcsFargateTaskTerminationDetectionEventRuleProps } from 'ecs-fargate-task-termination-detection-event-rule'

const ecsFargateTaskTerminationDetectionEventRuleProps: EcsFargateTaskTerminationDetectionEventRuleProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.crossStackScope">crossStackScope</a></code> | <code>constructs.Construct</code> | The scope to use if the source of the rule and its target are in different Stacks (but in the same account & region). |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.description">description</a></code> | <code>string</code> | A description of the rule's purpose. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.eventPattern">eventPattern</a></code> | <code>aws-cdk-lib.aws_events.EventPattern</code> | Additional restrictions for the event to route to the specified target. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.ruleName">ruleName</a></code> | <code>string</code> | A name for the rule. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.enabled">enabled</a></code> | <code>boolean</code> | Indicates whether the rule is enabled. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.eventBus">eventBus</a></code> | <code>aws-cdk-lib.aws_events.IEventBus</code> | The event bus to associate with this rule. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.role">role</a></code> | <code>aws-cdk-lib.interfaces.aws_iam.IRoleRef</code> | The role that is used for target invocation. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.schedule">schedule</a></code> | <code>aws-cdk-lib.aws_events.Schedule</code> | The schedule or rate (frequency) that determines when EventBridge runs the rule. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.targets">targets</a></code> | <code>aws-cdk-lib.aws_events.IRuleTarget[]</code> | Targets to invoke when this rule matches an event. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.cluster">cluster</a></code> | <code>aws-cdk-lib.aws_ecs.ICluster</code> | ECS cluster to monitor. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.clusterArn">clusterArn</a></code> | <code>string</code> | ARN of one ECS cluster to monitor. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.clusterArns">clusterArns</a></code> | <code>string[]</code> | ARNs of the ECS clusters to monitor. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.containerNames">containerNames</a></code> | <code>string[]</code> | Container names to monitor. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.detectionMode">detectionMode</a></code> | <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionMode">EcsFargateTaskTerminationDetectionMode</a></code> | How task failures are matched in the EventBridge event pattern. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.excludedStopCodes">excludedStopCodes</a></code> | <code>string[]</code> | `stopCode` values excluded from non-zero exit-code matching. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.excludedStoppedReasonPrefixes">excludedStoppedReasonPrefixes</a></code> | <code>string[]</code> | `stoppedReason` prefixes excluded from non-zero exit-code matching via EventBridge `anything-but` prefix matching. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.group">group</a></code> | <code>string</code> | Raw ECS task group used to narrow matching. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.ignoredExitCodes">ignoredExitCodes</a></code> | <code>number[]</code> | Container exit codes to ignore, in addition to the successful code `0`. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.service">service</a></code> | <code>aws-cdk-lib.aws_ecs.IBaseService</code> | ECS service to monitor. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.serviceName">serviceName</a></code> | <code>string</code> | ECS service name used to narrow matching to one service. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.serviceNames">serviceNames</a></code> | <code>string[]</code> | ECS service names used to narrow matching to those services. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.startupFailureStoppedReasonPrefixes">startupFailureStoppedReasonPrefixes</a></code> | <code>string[]</code> | `stoppedReason` prefixes that match a startup failure when the event has no `stopCode`. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.taskDefinitionArn">taskDefinitionArn</a></code> | <code>string</code> | Task definition ARN used to narrow matching. |

---

##### `crossStackScope`<sup>Optional</sup> <a name="crossStackScope" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.crossStackScope"></a>

```typescript
public readonly crossStackScope: Construct;
```

- *Type:* constructs.Construct
- *Default:* none (the main scope will be used, even for cross-stack Events)

The scope to use if the source of the rule and its target are in different Stacks (but in the same account & region).

This helps dealing with cycles that often arise in these situations.

---

##### `description`<sup>Optional</sup> <a name="description" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.description"></a>

```typescript
public readonly description: string;
```

- *Type:* string
- *Default:* No description

A description of the rule's purpose.

---

##### `eventPattern`<sup>Optional</sup> <a name="eventPattern" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.eventPattern"></a>

```typescript
public readonly eventPattern: EventPattern;
```

- *Type:* aws-cdk-lib.aws_events.EventPattern
- *Default:* No additional filtering based on an event pattern.

Additional restrictions for the event to route to the specified target.

The method that generates the rule probably imposes some type of event
filtering. The filtering implied by what you pass here is added
on top of that filtering.

> [https://docs.aws.amazon.com/eventbridge/latest/userguide/eventbridge-and-event-patterns.html](https://docs.aws.amazon.com/eventbridge/latest/userguide/eventbridge-and-event-patterns.html)

---

##### `ruleName`<sup>Optional</sup> <a name="ruleName" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.ruleName"></a>

```typescript
public readonly ruleName: string;
```

- *Type:* string
- *Default:* AWS CloudFormation generates a unique physical ID.

A name for the rule.

---

##### `enabled`<sup>Optional</sup> <a name="enabled" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.enabled"></a>

```typescript
public readonly enabled: boolean;
```

- *Type:* boolean
- *Default:* true

Indicates whether the rule is enabled.

---

##### `eventBus`<sup>Optional</sup> <a name="eventBus" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.eventBus"></a>

```typescript
public readonly eventBus: IEventBus;
```

- *Type:* aws-cdk-lib.aws_events.IEventBus
- *Default:* The default event bus.

The event bus to associate with this rule.

---

##### `role`<sup>Optional</sup> <a name="role" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.role"></a>

```typescript
public readonly role: IRoleRef;
```

- *Type:* aws-cdk-lib.interfaces.aws_iam.IRoleRef
- *Default:* No role associated

The role that is used for target invocation.

Must be assumable by principal `events.amazonaws.com`.

---

##### `schedule`<sup>Optional</sup> <a name="schedule" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.schedule"></a>

```typescript
public readonly schedule: Schedule;
```

- *Type:* aws-cdk-lib.aws_events.Schedule
- *Default:* None.

The schedule or rate (frequency) that determines when EventBridge runs the rule.

You must specify this property, the `eventPattern` property, or both.

For more information, see Schedule Expression Syntax for
Rules in the Amazon EventBridge User Guide.

> [https://docs.aws.amazon.com/eventbridge/latest/userguide/scheduled-events.html](https://docs.aws.amazon.com/eventbridge/latest/userguide/scheduled-events.html)

---

##### `targets`<sup>Optional</sup> <a name="targets" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.targets"></a>

```typescript
public readonly targets: IRuleTarget[];
```

- *Type:* aws-cdk-lib.aws_events.IRuleTarget[]
- *Default:* No targets.

Targets to invoke when this rule matches an event.

Input will be the full matched event. If you wish to specify custom
target input, use `addTarget(target[, inputOptions])`.

---

##### `cluster`<sup>Optional</sup> <a name="cluster" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.cluster"></a>

```typescript
public readonly cluster: ICluster;
```

- *Type:* aws-cdk-lib.aws_ecs.ICluster

ECS cluster to monitor.

The rule uses `cluster.clusterArn`. A cluster created in the same stack
stays a CloudFormation token until deploy.

Set this, {@link EcsFargateTaskTerminationDetectionEventRuleProps.clusterArn},
or {@link EcsFargateTaskTerminationDetectionEventRuleProps.clusterArns}.
When {@link EcsFargateTaskTerminationDetectionEventRuleProps.service} is set
and none of those are set, the service's cluster is used.

The rule matches only tasks whose `launchType` is `FARGATE`. EC2 and
EXTERNAL tasks in the same cluster are ignored. Fargate Spot tasks stay in
scope because their `launchType` remains `FARGATE`.

---

##### `clusterArn`<sup>Optional</sup> <a name="clusterArn" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.clusterArn"></a>

```typescript
public readonly clusterArn: string;
```

- *Type:* string

ARN of one ECS cluster to monitor.

Set this, {@link EcsFargateTaskTerminationDetectionEventRuleProps.cluster},
or {@link EcsFargateTaskTerminationDetectionEventRuleProps.clusterArns}.
When {@link EcsFargateTaskTerminationDetectionEventRuleProps.service} is set
and none of those are set, the service's cluster is used.
The value is placed in the pattern as given, including a CloudFormation token.
An empty string is kept as given.

---

##### `clusterArns`<sup>Optional</sup> <a name="clusterArns" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.clusterArns"></a>

```typescript
public readonly clusterArns: string[];
```

- *Type:* string[]

ARNs of the ECS clusters to monitor.

Each ARN is an alternative match. The list must contain at least one ARN
and must not contain an empty string.
Set this, {@link EcsFargateTaskTerminationDetectionEventRuleProps.cluster},
or {@link EcsFargateTaskTerminationDetectionEventRuleProps.clusterArn}.
When {@link EcsFargateTaskTerminationDetectionEventRuleProps.service} is set
and none of those are set, the service's cluster is used.

---

##### `containerNames`<sup>Optional</sup> <a name="containerNames" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.containerNames"></a>

```typescript
public readonly containerNames: string[];
```

- *Type:* string[]

Container names to monitor.

The rule matches when one of these containers satisfies the failure
condition. Other containers in the task are ignored. Applies to both the
non-zero exit branch and the startup-failure branch. Omit to match any
container. The list must not be empty or contain an empty string.

---

##### `detectionMode`<sup>Optional</sup> <a name="detectionMode" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.detectionMode"></a>

```typescript
public readonly detectionMode: EcsFargateTaskTerminationDetectionMode;
```

- *Type:* <a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionMode">EcsFargateTaskTerminationDetectionMode</a>
- *Default:* EcsFargateTaskTerminationDetectionMode.ALL_FAILURES

How task failures are matched in the EventBridge event pattern.

---

##### `excludedStopCodes`<sup>Optional</sup> <a name="excludedStopCodes" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.excludedStopCodes"></a>

```typescript
public readonly excludedStopCodes: string[];
```

- *Type:* string[]
- *Default:* DefaultExcludedStopCodes.ALL

`stopCode` values excluded from non-zero exit-code matching.

This is the primary operational-stop filter. It applies when the event
has a `stopCode`. Events with no `stopCode` use
{@link EcsFargateTaskTerminationDetectionEventRuleProps.excludedStoppedReasonPrefixes}
instead. Those prefixes also apply when `stopCode` is present.

Applies only to the non-zero `exitCode` branch. Startup-failure matching
is unchanged.

Pass a new array to replace the default set. To extend defaults, spread
{@link DefaultExcludedStopCodes.ALL} and append {@link EcsTaskStopCode} values.
`ALL` is frozen. Mutating it throws.
Pass an empty array to disable `stopCode` exclusion.

---

##### `excludedStoppedReasonPrefixes`<sup>Optional</sup> <a name="excludedStoppedReasonPrefixes" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.excludedStoppedReasonPrefixes"></a>

```typescript
public readonly excludedStoppedReasonPrefixes: string[];
```

- *Type:* string[]
- *Default:* DefaultExcludedStoppedReasonPrefixes.ALL

`stoppedReason` prefixes excluded from non-zero exit-code matching via EventBridge `anything-but` prefix matching.

Auxiliary filter on the non-zero `exitCode` branch. It runs both when
`stopCode` is present and when `stopCode` is absent. Use it for operational
stops that share a `stopCode` with real failures, such as scale-in.
Startup-failure matching is unchanged.

Pass a new array to replace the default set. To extend defaults, spread
{@link DefaultExcludedStoppedReasonPrefixes.ALL} and append prefixes.
`ALL` is frozen. Mutating it throws.
Pass an empty array to disable prefix exclusion.

---

##### `group`<sup>Optional</sup> <a name="group" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.group"></a>

```typescript
public readonly group: string;
```

- *Type:* string

Raw ECS task group used to narrow matching.

Matched exactly against `detail.group`. Use this for a non-service task
group. For an ECS service, use `serviceName`, `serviceNames`, or `service`.
Must not be empty.

Cannot be set together with `serviceName`, `serviceNames`, or `service`.

---

##### `ignoredExitCodes`<sup>Optional</sup> <a name="ignoredExitCodes" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.ignoredExitCodes"></a>

```typescript
public readonly ignoredExitCodes: number[];
```

- *Type:* number[]
- *Default:* only exit code 0 is ignored

Container exit codes to ignore, in addition to the successful code `0`.

Applies only to non-zero exit matching. For example, `143` drops SIGTERM
exits that are not already excluded by `stopCode` or `stoppedReason`.
Startup-failure matching is unchanged. `0` is always ignored.
Values must be integers. Duplicates are dropped.

---

##### `service`<sup>Optional</sup> <a name="service" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.service"></a>

```typescript
public readonly service: IBaseService;
```

- *Type:* aws-cdk-lib.aws_ecs.IBaseService

ECS service to monitor.

The rule matches `detail.group` equal to `service:${service.serviceName}`.
When `cluster`, `clusterArn`, and `clusterArns` are all omitted, it also
uses `service.cluster`. When a cluster input is set as well, that input
selects the cluster and this property only selects the service name.
`service.serviceName` must not be empty.

Cannot be set together with `serviceName`, `serviceNames`, or `group`.

---

##### `serviceName`<sup>Optional</sup> <a name="serviceName" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.serviceName"></a>

```typescript
public readonly serviceName: string;
```

- *Type:* string

ECS service name used to narrow matching to one service.

Matched as `detail.group` equal to `service:${serviceName}`. Omit to
match every Fargate task in the selected clusters. Pass the service name
only, without the `service:` prefix. Must not be empty.

Cannot be set together with `serviceNames`, `service`, or `group`.

---

##### `serviceNames`<sup>Optional</sup> <a name="serviceNames" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.serviceNames"></a>

```typescript
public readonly serviceNames: string[];
```

- *Type:* string[]

ECS service names used to narrow matching to those services.

Each name is matched as `detail.group` equal to `service:${name}`. Any
listed service matches. Pass service names only, without the `service:` prefix.
The list must not be empty or contain an empty string.

Cannot be set together with `serviceName`, `service`, or `group`.

---

##### `startupFailureStoppedReasonPrefixes`<sup>Optional</sup> <a name="startupFailureStoppedReasonPrefixes" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.startupFailureStoppedReasonPrefixes"></a>

```typescript
public readonly startupFailureStoppedReasonPrefixes: string[];
```

- *Type:* string[]
- *Default:* DefaultStartupFailureStoppedReasonPrefixes.ALL

`stoppedReason` prefixes that match a startup failure when the event has no `stopCode`.

`stopCode` `TaskFailedToStart` always matches in
{@link EcsFargateTaskTerminationDetectionMode.TASK_FAILED_TO_START} and
{@link EcsFargateTaskTerminationDetectionMode.ALL_FAILURES}, and does not
use this list.

Pass a new array to replace the default set. To extend defaults, spread
{@link DefaultStartupFailureStoppedReasonPrefixes.ALL}.
`ALL` is frozen. Mutating it throws.
Pass an empty array to match startup failures only by `stopCode` `TaskFailedToStart`.

---

##### `taskDefinitionArn`<sup>Optional</sup> <a name="taskDefinitionArn" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.taskDefinitionArn"></a>

```typescript
public readonly taskDefinitionArn: string;
```

- *Type:* string

Task definition ARN used to narrow matching.

Matched exactly against `detail.taskDefinitionArn`. Include the revision
when events carry one
(`arn:aws:ecs:region:account:task-definition/family:revision`).
Must not be empty.

---

## Classes <a name="Classes" id="Classes"></a>

### DefaultExcludedStopCodes <a name="DefaultExcludedStopCodes" id="ecs-fargate-task-termination-detection-event-rule.DefaultExcludedStopCodes"></a>

Default `stopCode` values excluded from non-zero exit-code matching.

`ServiceSchedulerInitiated` is omitted because ELB health-check replacement
uses that code as well as scale-in. Scale-in stays excluded by
{@link DefaultExcludedStoppedReasonPrefixes.SCALING_ACTIVITY_INITIATED_BY}.
`TerminationNotice` is omitted so platform updates and host retirement still match.

Override via {@link EcsFargateTaskTerminationDetectionEventRuleProps.excludedStopCodes}.
To extend this set, spread {@link DefaultExcludedStopCodes.ALL} and append
{@link EcsTaskStopCode} values. `ALL` is frozen. Mutating it throws.

#### Initializers <a name="Initializers" id="ecs-fargate-task-termination-detection-event-rule.DefaultExcludedStopCodes.Initializer"></a>

```typescript
import { DefaultExcludedStopCodes } from 'ecs-fargate-task-termination-detection-event-rule'

new DefaultExcludedStopCodes()
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |

---




#### Constants <a name="Constants" id="Constants"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.DefaultExcludedStopCodes.property.ALL">ALL</a></code> | <code>string[]</code> | All default stop codes, in a stable order. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.DefaultExcludedStopCodes.property.SPOT_INTERRUPTION">SPOT_INTERRUPTION</a></code> | <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsTaskStopCode">EcsTaskStopCode</a></code> | Fargate Spot reclaim. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.DefaultExcludedStopCodes.property.USER_INITIATED">USER_INITIATED</a></code> | <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsTaskStopCode">EcsTaskStopCode</a></code> | Console or API stop. |

---

##### `ALL`<sup>Required</sup> <a name="ALL" id="ecs-fargate-task-termination-detection-event-rule.DefaultExcludedStopCodes.property.ALL"></a>

```typescript
public readonly ALL: string[];
```

- *Type:* string[]

All default stop codes, in a stable order.

Contains {@link DefaultExcludedStopCodes.USER_INITIATED} and
{@link DefaultExcludedStopCodes.SPOT_INTERRUPTION}.
The array is frozen. Spread it to extend the set. Mutating it throws,
so the library default cannot be changed.
`Object.freeze` is readonly, and jsii rejects a getter named `ALL`.
The cast keeps `ALL` assignable to `string[]`.

---

##### `SPOT_INTERRUPTION`<sup>Required</sup> <a name="SPOT_INTERRUPTION" id="ecs-fargate-task-termination-detection-event-rule.DefaultExcludedStopCodes.property.SPOT_INTERRUPTION"></a>

```typescript
public readonly SPOT_INTERRUPTION: EcsTaskStopCode;
```

- *Type:* <a href="#ecs-fargate-task-termination-detection-event-rule.EcsTaskStopCode">EcsTaskStopCode</a>

Fargate Spot reclaim.

---

##### `USER_INITIATED`<sup>Required</sup> <a name="USER_INITIATED" id="ecs-fargate-task-termination-detection-event-rule.DefaultExcludedStopCodes.property.USER_INITIATED"></a>

```typescript
public readonly USER_INITIATED: EcsTaskStopCode;
```

- *Type:* <a href="#ecs-fargate-task-termination-detection-event-rule.EcsTaskStopCode">EcsTaskStopCode</a>

Console or API stop.

---

### DefaultExcludedStoppedReasonPrefixes <a name="DefaultExcludedStoppedReasonPrefixes" id="ecs-fargate-task-termination-detection-event-rule.DefaultExcludedStoppedReasonPrefixes"></a>

Default `stoppedReason` prefixes treated as expected operational stops (not unexpected failures) and excluded from non-zero exit-code matching.

This is the auxiliary filter. It applies together with
{@link DefaultExcludedStopCodes} when `stopCode` is present, and it is the
only operational-stop filter when `stopCode` is absent.

Override via {@link EcsFargateTaskTerminationDetectionEventRuleProps.excludedStoppedReasonPrefixes}.
To extend this set, spread {@link DefaultExcludedStoppedReasonPrefixes.ALL}
and append extra prefixes. `ALL` is frozen. Mutating it throws.

#### Initializers <a name="Initializers" id="ecs-fargate-task-termination-detection-event-rule.DefaultExcludedStoppedReasonPrefixes.Initializer"></a>

```typescript
import { DefaultExcludedStoppedReasonPrefixes } from 'ecs-fargate-task-termination-detection-event-rule'

new DefaultExcludedStoppedReasonPrefixes()
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |

---




#### Constants <a name="Constants" id="Constants"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.DefaultExcludedStoppedReasonPrefixes.property.ALL">ALL</a></code> | <code>string[]</code> | All default prefixes, in a stable order. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.DefaultExcludedStoppedReasonPrefixes.property.SCALING_ACTIVITY_INITIATED_BY">SCALING_ACTIVITY_INITIATED_BY</a></code> | <code>string</code> | Service scale-in and rolling deployment replacement (`Scaling activity initiated by (deployment ...)`). |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.DefaultExcludedStoppedReasonPrefixes.property.SPOT_TASK_INTERRUPTED">SPOT_TASK_INTERRUPTED</a></code> | <code>string</code> | Fargate Spot reclaim (`stopCode` = `SpotInterruption`). |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.DefaultExcludedStoppedReasonPrefixes.property.TASK_STOPPED_BY_USER">TASK_STOPPED_BY_USER</a></code> | <code>string</code> | Console/API stop (`stopCode` = `UserInitiated`). |

---

##### `ALL`<sup>Required</sup> <a name="ALL" id="ecs-fargate-task-termination-detection-event-rule.DefaultExcludedStoppedReasonPrefixes.property.ALL"></a>

```typescript
public readonly ALL: string[];
```

- *Type:* string[]

All default prefixes, in a stable order.

Contains {@link DefaultExcludedStoppedReasonPrefixes.SCALING_ACTIVITY_INITIATED_BY},
{@link DefaultExcludedStoppedReasonPrefixes.TASK_STOPPED_BY_USER}, and
{@link DefaultExcludedStoppedReasonPrefixes.SPOT_TASK_INTERRUPTED}.
The array is frozen. Spread it to extend the set. Mutating it throws,
so the library default cannot be changed.
`Object.freeze` is readonly, and jsii rejects a getter named `ALL`.
The cast keeps `ALL` assignable to `string[]`.

---

##### `SCALING_ACTIVITY_INITIATED_BY`<sup>Required</sup> <a name="SCALING_ACTIVITY_INITIATED_BY" id="ecs-fargate-task-termination-detection-event-rule.DefaultExcludedStoppedReasonPrefixes.property.SCALING_ACTIVITY_INITIATED_BY"></a>

```typescript
public readonly SCALING_ACTIVITY_INITIATED_BY: string;
```

- *Type:* string

Service scale-in and rolling deployment replacement (`Scaling activity initiated by (deployment ...)`).

---

##### `SPOT_TASK_INTERRUPTED`<sup>Required</sup> <a name="SPOT_TASK_INTERRUPTED" id="ecs-fargate-task-termination-detection-event-rule.DefaultExcludedStoppedReasonPrefixes.property.SPOT_TASK_INTERRUPTED"></a>

```typescript
public readonly SPOT_TASK_INTERRUPTED: string;
```

- *Type:* string

Fargate Spot reclaim (`stopCode` = `SpotInterruption`).

---

##### `TASK_STOPPED_BY_USER`<sup>Required</sup> <a name="TASK_STOPPED_BY_USER" id="ecs-fargate-task-termination-detection-event-rule.DefaultExcludedStoppedReasonPrefixes.property.TASK_STOPPED_BY_USER"></a>

```typescript
public readonly TASK_STOPPED_BY_USER: string;
```

- *Type:* string

Console/API stop (`stopCode` = `UserInitiated`).

---

### DefaultStartupFailureStoppedReasonPrefixes <a name="DefaultStartupFailureStoppedReasonPrefixes" id="ecs-fargate-task-termination-detection-event-rule.DefaultStartupFailureStoppedReasonPrefixes"></a>

Default `stoppedReason` prefixes that match a startup failure when `stopCode` is absent.

`stopCode` `TaskFailedToStart` is matched separately and does not use this list.

Override via {@link EcsFargateTaskTerminationDetectionEventRuleProps.startupFailureStoppedReasonPrefixes}.
To extend this set, spread {@link DefaultStartupFailureStoppedReasonPrefixes.ALL}.
`ALL` is frozen. Mutating it throws.

#### Initializers <a name="Initializers" id="ecs-fargate-task-termination-detection-event-rule.DefaultStartupFailureStoppedReasonPrefixes.Initializer"></a>

```typescript
import { DefaultStartupFailureStoppedReasonPrefixes } from 'ecs-fargate-task-termination-detection-event-rule'

new DefaultStartupFailureStoppedReasonPrefixes()
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |

---




#### Constants <a name="Constants" id="Constants"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.DefaultStartupFailureStoppedReasonPrefixes.property.ALL">ALL</a></code> | <code>string[]</code> | All default startup-failure prefixes, in a stable order. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.DefaultStartupFailureStoppedReasonPrefixes.property.CANNOT_PULL_CONTAINER_ERROR">CANNOT_PULL_CONTAINER_ERROR</a></code> | <code>string</code> | Image pull failure. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.DefaultStartupFailureStoppedReasonPrefixes.property.CANNOT_START_CONTAINER_ERROR">CANNOT_START_CONTAINER_ERROR</a></code> | <code>string</code> | Container runtime failed to start the container. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.DefaultStartupFailureStoppedReasonPrefixes.property.RESOURCE_INITIALIZATION_ERROR">RESOURCE_INITIALIZATION_ERROR</a></code> | <code>string</code> | ENI or secrets initialization failure. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.DefaultStartupFailureStoppedReasonPrefixes.property.TASK_FAILED_TO_START">TASK_FAILED_TO_START</a></code> | <code>string</code> | Generic "task failed to start" wording used when `stopCode` was not set. |

---

##### `ALL`<sup>Required</sup> <a name="ALL" id="ecs-fargate-task-termination-detection-event-rule.DefaultStartupFailureStoppedReasonPrefixes.property.ALL"></a>

```typescript
public readonly ALL: string[];
```

- *Type:* string[]

All default startup-failure prefixes, in a stable order.

Contains {@link DefaultStartupFailureStoppedReasonPrefixes.CANNOT_PULL_CONTAINER_ERROR},
{@link DefaultStartupFailureStoppedReasonPrefixes.RESOURCE_INITIALIZATION_ERROR},
{@link DefaultStartupFailureStoppedReasonPrefixes.CANNOT_START_CONTAINER_ERROR}, and
{@link DefaultStartupFailureStoppedReasonPrefixes.TASK_FAILED_TO_START}.
The array is frozen. Spread it to extend the set. Mutating it throws,
so the library default cannot be changed.
`Object.freeze` is readonly, and jsii rejects a getter named `ALL`.
The cast keeps `ALL` assignable to `string[]`.

---

##### `CANNOT_PULL_CONTAINER_ERROR`<sup>Required</sup> <a name="CANNOT_PULL_CONTAINER_ERROR" id="ecs-fargate-task-termination-detection-event-rule.DefaultStartupFailureStoppedReasonPrefixes.property.CANNOT_PULL_CONTAINER_ERROR"></a>

```typescript
public readonly CANNOT_PULL_CONTAINER_ERROR: string;
```

- *Type:* string

Image pull failure.

---

##### `CANNOT_START_CONTAINER_ERROR`<sup>Required</sup> <a name="CANNOT_START_CONTAINER_ERROR" id="ecs-fargate-task-termination-detection-event-rule.DefaultStartupFailureStoppedReasonPrefixes.property.CANNOT_START_CONTAINER_ERROR"></a>

```typescript
public readonly CANNOT_START_CONTAINER_ERROR: string;
```

- *Type:* string

Container runtime failed to start the container.

---

##### `RESOURCE_INITIALIZATION_ERROR`<sup>Required</sup> <a name="RESOURCE_INITIALIZATION_ERROR" id="ecs-fargate-task-termination-detection-event-rule.DefaultStartupFailureStoppedReasonPrefixes.property.RESOURCE_INITIALIZATION_ERROR"></a>

```typescript
public readonly RESOURCE_INITIALIZATION_ERROR: string;
```

- *Type:* string

ENI or secrets initialization failure.

---

##### `TASK_FAILED_TO_START`<sup>Required</sup> <a name="TASK_FAILED_TO_START" id="ecs-fargate-task-termination-detection-event-rule.DefaultStartupFailureStoppedReasonPrefixes.property.TASK_FAILED_TO_START"></a>

```typescript
public readonly TASK_FAILED_TO_START: string;
```

- *Type:* string

Generic "task failed to start" wording used when `stopCode` was not set.

---


## Enums <a name="Enums" id="Enums"></a>

### EcsFargateTaskTerminationDetectionMode <a name="EcsFargateTaskTerminationDetectionMode" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionMode"></a>

How {@link EcsFargateTaskTerminationDetectionEventRule} matches ECS/Fargate task failure events in its EventBridge pattern.

#### Members <a name="Members" id="Members"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionMode.NON_ZERO_EXIT_CODE">NON_ZERO_EXIT_CODE</a></code> | Detect only container exits with a non-zero `exitCode`, ignoring codes in `ignoredExitCodes`. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionMode.TASK_FAILED_TO_START">TASK_FAILED_TO_START</a></code> | Detect only tasks that failed to start. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionMode.ALL_FAILURES">ALL_FAILURES</a></code> | Detect both non-zero exit codes and startup/pull failures (`TaskFailedToStart` / known `stoppedReason` prefixes). |

---

##### `NON_ZERO_EXIT_CODE` <a name="NON_ZERO_EXIT_CODE" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionMode.NON_ZERO_EXIT_CODE"></a>

Detect only container exits with a non-zero `exitCode`, ignoring codes in `ignoredExitCodes`.

Does not match startup failures where `containers.exitCode` is absent.

---


##### `TASK_FAILED_TO_START` <a name="TASK_FAILED_TO_START" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionMode.TASK_FAILED_TO_START"></a>

Detect only tasks that failed to start.

Matched via `stopCode` `TaskFailedToStart`. When `stopCode` is absent,
known startup-failure `stoppedReason` prefixes match instead.

---


##### `ALL_FAILURES` <a name="ALL_FAILURES" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionMode.ALL_FAILURES"></a>

Detect both non-zero exit codes and startup/pull failures (`TaskFailedToStart` / known `stoppedReason` prefixes).

This is the default {@link EcsFargateTaskTerminationDetectionEventRuleProps.detectionMode}.

---


### EcsTaskStopCode <a name="EcsTaskStopCode" id="ecs-fargate-task-termination-detection-event-rule.EcsTaskStopCode"></a>

ECS task `stopCode` values published on `ECS Task State Change`.

These strings are the stable codes ECS writes.

#### Members <a name="Members" id="Members"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsTaskStopCode.TASK_FAILED_TO_START">TASK_FAILED_TO_START</a></code> | The task never reached a running container. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsTaskStopCode.ESSENTIAL_CONTAINER_EXITED">ESSENTIAL_CONTAINER_EXITED</a></code> | An essential container exited. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsTaskStopCode.USER_INITIATED">USER_INITIATED</a></code> | A user or API call stopped the task. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsTaskStopCode.SERVICE_SCHEDULER_INITIATED">SERVICE_SCHEDULER_INITIATED</a></code> | The service scheduler stopped the task. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsTaskStopCode.SPOT_INTERRUPTION">SPOT_INTERRUPTION</a></code> | Fargate Spot reclaimed the task. |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsTaskStopCode.TERMINATION_NOTICE">TERMINATION_NOTICE</a></code> | The infrastructure asked the task to stop, such as host retirement or a platform update. |

---

##### `TASK_FAILED_TO_START` <a name="TASK_FAILED_TO_START" id="ecs-fargate-task-termination-detection-event-rule.EcsTaskStopCode.TASK_FAILED_TO_START"></a>

The task never reached a running container.

---


##### `ESSENTIAL_CONTAINER_EXITED` <a name="ESSENTIAL_CONTAINER_EXITED" id="ecs-fargate-task-termination-detection-event-rule.EcsTaskStopCode.ESSENTIAL_CONTAINER_EXITED"></a>

An essential container exited.

---


##### `USER_INITIATED` <a name="USER_INITIATED" id="ecs-fargate-task-termination-detection-event-rule.EcsTaskStopCode.USER_INITIATED"></a>

A user or API call stopped the task.

---


##### `SERVICE_SCHEDULER_INITIATED` <a name="SERVICE_SCHEDULER_INITIATED" id="ecs-fargate-task-termination-detection-event-rule.EcsTaskStopCode.SERVICE_SCHEDULER_INITIATED"></a>

The service scheduler stopped the task.

Scale-in, rolling replacement, and ELB health-check replacement share this
code. It is not part of {@link DefaultExcludedStopCodes.ALL}.

---


##### `SPOT_INTERRUPTION` <a name="SPOT_INTERRUPTION" id="ecs-fargate-task-termination-detection-event-rule.EcsTaskStopCode.SPOT_INTERRUPTION"></a>

Fargate Spot reclaimed the task.

---


##### `TERMINATION_NOTICE` <a name="TERMINATION_NOTICE" id="ecs-fargate-task-termination-detection-event-rule.EcsTaskStopCode.TERMINATION_NOTICE"></a>

The infrastructure asked the task to stop, such as host retirement or a platform update.

Not part of {@link DefaultExcludedStopCodes.ALL}.

---

