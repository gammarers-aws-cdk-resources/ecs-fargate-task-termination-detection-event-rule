import { eventMatchesPattern, readEventPattern } from './match-event-pattern';

describe('event pattern matching guards', () => {
  it('does not treat a non-array anything-but prefix list as prefixes', () => {
    const matched = eventMatchesPattern(
      { reason: 'CannotPullContainerError: denied' },
      { reason: [{ 'anything-but': { prefix: 'CannotPullContainerError' } }] },
    );

    expect(matched).toBe(true);
  });

  it('does not treat a mixed anything-but prefix list as prefixes', () => {
    const matched = eventMatchesPattern(
      { reason: 'CannotPullContainerError: denied' },
      { reason: [{ 'anything-but': { prefix: ['CannotPullContainerError', 1] } }] },
    );

    expect(matched).toBe(true);
  });

  it('does not match a non-object event against field patterns', () => {
    expect(eventMatchesPattern('aws.ecs', { source: ['aws.ecs'] })).toBe(false);
  });

  it('does not match when $or is not an array', () => {
    const matched = eventMatchesPattern(
      { source: 'aws.ecs' },
      { source: ['aws.ecs'], $or: 'stopCode' },
    );

    expect(matched).toBe(false);
  });

  it('does not match when an $or branch is not an object', () => {
    const matched = eventMatchesPattern(
      { source: 'aws.ecs' },
      { source: ['aws.ecs'], $or: ['stopCode'] },
    );

    expect(matched).toBe(false);
  });

  it('throws when the template has no resources', () => {
    expect(() => readEventPattern({})).toThrow('Expected a CloudFormation template.');
  });

  it('throws when the template contains no Events rule', () => {
    expect(() => {
      readEventPattern({
        Resources: {
          Bucket: { Type: 'AWS::S3::Bucket' },
        },
      });
    }).toThrow('Expected exactly one EventBridge rule pattern.');
  });

  it('throws when the template does not contain exactly one rule pattern', () => {
    expect(() => {
      readEventPattern({
        Resources: {
          Rule: {
            Type: 'AWS::Events::Rule',
            Properties: {},
          },
        },
      });
    }).toThrow('Expected exactly one EventBridge rule pattern.');
  });
});
