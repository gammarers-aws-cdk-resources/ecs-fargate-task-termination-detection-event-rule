/**
 * Subset of EventBridge pattern matching used by this construct's rule.
 *
 * Covers exact values, arrays (any element), `prefix`, `anything-but`,
 * `anything-but` prefix lists, nested objects, and one `$or`.
 *
 * Like EventBridge, every leaf value in the pattern must be an array. A bare
 * primitive makes the matcher throw.
 */

/**
 * Content filter key that matches every value except the given one.
 */
const ANYTHING_BUT_FILTER = 'anything-but';

/**
 * Content filter key that matches a string prefix.
 */
const PREFIX_FILTER = 'prefix';

/**
 * Key that matches when any one of its branches matches.
 */
const OR_OPERATOR = '$or';

/**
 * Keys that mark an object as a content filter instead of a nested pattern.
 */
const FILTER_KEYS = new Set([PREFIX_FILTER, ANYTHING_BUT_FILTER]);

/**
 * Returns whether `value` is a plain object (not `null` and not an array).
 *
 * @param value - Value to check.
 * @returns `true` when `value` is a plain object.
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Returns whether `value` is a content filter such as `{ prefix: 'a' }`.
 *
 * @param value - Pattern object to check.
 * @returns `true` when every key is a content filter key.
 */
const isFilter = (value: Record<string, unknown>): boolean => {
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => FILTER_KEYS.has(key));
};

/**
 * Reads `value` as a list of strings.
 *
 * @param value - Value to read.
 * @returns The strings, or `undefined` when `value` is not an array of strings.
 */
const readStringList = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      return undefined;
    }
    strings.push(item);
  }

  return strings;
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
  const prefixes = isRecord(matcher) ? readStringList(matcher[PREFIX_FILTER]) : undefined;
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
  if (ANYTHING_BUT_FILTER in filter) {
    return matchesAnythingBut(eventValue, filter[ANYTHING_BUT_FILTER]);
  }

  const prefix = filter[PREFIX_FILTER];
  return typeof prefix === 'string'
    && typeof eventValue === 'string'
    && eventValue.startsWith(prefix);
};

/**
 * Returns whether the object `eventValue` satisfies every field of `pattern`,
 * and one `$or` branch when `pattern` has one.
 *
 * @param eventValue - Value taken from the event. Anything but a plain object never matches.
 * @param pattern - Object pattern, possibly with a `$or` key.
 * @returns `true` when all fields and one `$or` branch match.
 * @throws Error if a leaf value in `pattern` is not an array.
 */
const matchesObjectFields = (eventValue: unknown, pattern: Record<string, unknown>): boolean => {
  if (!isRecord(eventValue)) {
    return false;
  }

  const fieldsMatch = Object.entries(pattern).every(([key, fieldPattern]) => {
    if (key === OR_OPERATOR) {
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

  if (!(OR_OPERATOR in pattern)) {
    return true;
  }

  const branches = pattern[OR_OPERATOR];
  if (!Array.isArray(branches)) {
    return false;
  }

  return branches.some((branch) => isRecord(branch) && matchesObjectFields(eventValue, branch));
};

/**
 * Returns whether `eventValue`, or any element when it is an array, satisfies
 * the object `pattern`.
 *
 * @param eventValue - Value taken from the event.
 * @param pattern - Object pattern.
 * @returns `true` when at least one candidate matches.
 * @throws Error if a leaf value in `pattern` is not an array.
 */
const matchesObject = (eventValue: unknown, pattern: Record<string, unknown>): boolean => {
  const candidates = Array.isArray(eventValue) ? eventValue : [eventValue];
  return candidates.some((candidate) => matchesObjectFields(candidate, pattern));
};

/**
 * Returns whether `eventValue` satisfies one element of a pattern array.
 *
 * An element is an exact primitive value, a content filter, or (for nested
 * event fields) an object pattern. A nested array is not valid in EventBridge.
 *
 * @param eventValue - Value taken from the event.
 * @param item - One element of a pattern array.
 * @returns `true` when the element matches.
 * @throws Error if `item` is an array.
 */
const matchesArrayItem = (eventValue: unknown, item: unknown): boolean => {
  if (Array.isArray(item)) {
    throw new Error('Event pattern must not contain a nested array.');
  }

  if (isRecord(item) && isFilter(item)) {
    return matchesFilter(eventValue, item);
  }

  if (isRecord(item)) {
    return matchesObject(eventValue, item);
  }

  return eventValue === item;
};

/**
 * Returns whether `eventValue` satisfies a pattern value.
 *
 * EventBridge requires every leaf value to be an array, so a bare primitive is
 * rejected instead of being compared.
 *
 * @param eventValue - Value taken from the event.
 * @param pattern - Pattern value for the field.
 * @returns `true` when the value matches.
 * @throws Error if `pattern` is a leaf value that is not an array.
 */
const matchesValue = (eventValue: unknown, pattern: unknown): boolean => {
  if (Array.isArray(pattern)) {
    return pattern.some((item) => matchesArrayItem(eventValue, item));
  }

  if (isRecord(pattern)) {
    return matchesObject(eventValue, pattern);
  }

  throw new Error('Event pattern leaf values must be arrays.');
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
 * @throws Error if a leaf value in `pattern` is not an array.
 */
export const eventMatchesPattern = (event: unknown, pattern: Record<string, unknown>): boolean => {
  return matchesObject(event, pattern);
};
