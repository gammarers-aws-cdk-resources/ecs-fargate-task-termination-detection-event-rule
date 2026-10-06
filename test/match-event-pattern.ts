/**
 * Subset of EventBridge pattern matching used by this construct's rule.
 *
 * Covers exact values, arrays (any element), `prefix`, `anything-but`,
 * `anything-but` prefix lists, nested objects, and one `$or`.
 */

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const FILTER_KEYS = new Set(['prefix', 'anything-but']);

const isFilter = (value: Record<string, unknown>): boolean => {
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => FILTER_KEYS.has(key));
};

const readStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const prefixes: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      return undefined;
    }
    prefixes.push(item);
  }

  return prefixes;
};

/**
 * Returns whether `eventValue` fails an `anything-but` matcher.
 *
 * A `{ prefix }` matcher excludes strings that start with any listed prefix.
 * Any other matcher excludes an exact value.
 *
 * @param eventValue - Value taken from the event.
 * @param matcher - EventBridge `anything-but` payload.
 * @returns `true` when the value is not excluded.
 */
const matchesAnythingBut = (eventValue: unknown, matcher: unknown): boolean => {
  const prefixes = isRecord(matcher) ? readStringArray(matcher.prefix) : undefined;
  if (prefixes) {
    return typeof eventValue === 'string' && prefixes.every((prefix) => !eventValue.startsWith(prefix));
  }

  return eventValue !== matcher;
};

/**
 * Returns whether `eventValue` satisfies one content filter.
 *
 * @param eventValue - Value taken from the event.
 * @param filter - `prefix` or `anything-but` filter object.
 * @returns `true` when the filter matches.
 */
const matchesFilter = (eventValue: unknown, filter: Record<string, unknown>): boolean => {
  if ('anything-but' in filter) {
    return matchesAnythingBut(eventValue, filter['anything-but']);
  }

  return typeof filter.prefix === 'string'
    && typeof eventValue === 'string'
    && eventValue.startsWith(filter.prefix);
};

const matchesObjectFields = (eventValue: unknown, pattern: Record<string, unknown>): boolean => {
  if (!isRecord(eventValue)) {
    return false;
  }

  const fieldsMatch = Object.entries(pattern).every(([key, fieldPattern]) => {
    if (key === '$or') {
      return true;
    }
    if (!(key in eventValue)) {
      return false;
    }
    return matchesValue(eventValue[key], fieldPattern);
  });
  if (!fieldsMatch) {
    return false;
  }

  if (!('$or' in pattern)) {
    return true;
  }

  const branches = pattern.$or;
  if (!Array.isArray(branches)) {
    return false;
  }

  return branches.some((branch) => isRecord(branch) && matchesObjectFields(eventValue, branch));
};

const matchesObject = (eventValue: unknown, pattern: Record<string, unknown>): boolean => {
  const candidates = Array.isArray(eventValue) ? eventValue : [eventValue];
  return candidates.some((candidate) => matchesObjectFields(candidate, pattern));
};

const matchesValue = (eventValue: unknown, pattern: unknown): boolean => {
  if (Array.isArray(pattern)) {
    return pattern.some((item) => matchesValue(eventValue, item));
  }

  if (isRecord(pattern) && isFilter(pattern)) {
    return matchesFilter(eventValue, pattern);
  }

  if (isRecord(pattern)) {
    return matchesObject(eventValue, pattern);
  }

  return eventValue === pattern;
};

/**
 * Reads the EventBridge pattern from a synthesized template with one rule.
 *
 * @param template - `Template.toJSON()` output.
 * @returns The rule's `EventPattern`.
 * @throws Error when the template does not contain exactly one Events rule.
 */
export const readEventPattern = (template: unknown): Record<string, unknown> => {
  if (!isRecord(template) || !isRecord(template.Resources)) {
    throw new Error('Expected a CloudFormation template.');
  }

  const rules = Object.values(template.Resources).filter((resource) => {
    return isRecord(resource) && resource.Type === 'AWS::Events::Rule';
  });
  const rule = rules.length === 1 ? rules[0] : undefined;
  if (!isRecord(rule) || !isRecord(rule.Properties) || !isRecord(rule.Properties.EventPattern)) {
    throw new Error('Expected exactly one EventBridge rule pattern.');
  }

  return rule.Properties.EventPattern;
};

/**
 * Returns whether `event` would match `pattern` under the subset above.
 *
 * @param event - ECS task state change event.
 * @param pattern - Synthesized EventBridge event pattern.
 * @returns `true` when the event matches.
 */
export const eventMatchesPattern = (event: unknown, pattern: Record<string, unknown>): boolean => {
  return matchesObject(event, pattern);
};
