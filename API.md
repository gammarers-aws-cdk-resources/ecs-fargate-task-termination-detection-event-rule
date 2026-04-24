# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### EcsFargateTaskTerminationDetectionEventRule <a name="EcsFargateTaskTerminationDetectionEventRule" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule"></a>

EventBridge rule that detects ECS/Fargate task terminations caused by non-zero container exit codes, while excluding expected scaling events.

This rule defines its own `eventPattern` and does not accept `props.eventPattern`.
The pattern is scoped to the given `clusterArn`.

#### Initializers <a name="Initializers" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.Initializer"></a>

```typescript
import { EcsFargateTaskTerminationDetectionEventRule } from 'ecs-fargate-task-termination-detection-event-rule'

new EcsFargateTaskTerminationDetectionEventRule(scope: Construct, id: string, props: EcsFargateTaskTerminationDetectionEventRuleProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.Initializer.parameter.props">props</a></code> | <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps">EcsFargateTaskTerminationDetectionEventRuleProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRule.Initializer.parameter.props"></a>

- *Type:* <a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps">EcsFargateTaskTerminationDetectionEventRuleProps</a>

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
| <code><a href="#ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.clusterArn">clusterArn</a></code> | <code>string</code> | ARN of the ECS cluster to monitor. |

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

##### `clusterArn`<sup>Required</sup> <a name="clusterArn" id="ecs-fargate-task-termination-detection-event-rule.EcsFargateTaskTerminationDetectionEventRuleProps.property.clusterArn"></a>

```typescript
public readonly clusterArn: string;
```

- *Type:* string

ARN of the ECS cluster to monitor.

This is used to scope the EventBridge rule to task state changes emitted
by the specified cluster.

---



