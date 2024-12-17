import process from 'node:process';

type LogValue =
  | string
  | number
  | boolean
  | LogObject
  | Array<LogValue>
  | null
  | undefined;

/**
 * Represents a generic log object where key-value pairs are logged.
 * @typedef {Object} LogObject
 * @property {string | number | boolean | LogObject | Array<LogValue> | null | undefined} [key]
 */
export interface LogObject {
  [key: string | symbol]: LogValue;
}

// Helper function to safely stringify circular objects
//function safeStringify(obj: LogObject) {
//  const seen = new WeakSet();
//  return JSON.stringify(obj, (_key, value) => {
//    if (typeof value === 'object' && value !== null) {
//      if (seen.has(value)) return '[Circular]';
//      seen.add(value);
//    }
//    return value;
//  });
//}

/*
 * while structuredClone works well for many use cases in which JSON.stringify has trouble,
 * it can still fail with objects that contain complex circular references.
 *
 * using this over safeStringify
 * - Maintains non-JSON types
 * - Produces an actual deep-cloned object that can be manipulated
 * - Slightly faster for large objects due to no intermediate string creation
 */
export function safeDeepClone(obj: LogValue, seen = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj;

  if (seen.has(obj)) return '[Circular]'; // Handle circular references

  /*
   * WeakMap pairs each seen object with its corresponding clone ({ original -> clone } mapping).
   * This ensures consistency when a reference to the same object appears multiple times in the original structure.
   */
  const cloned = Array.isArray(obj) ? [] : {} as LogObject;
  seen.set(obj, cloned);

  if (Array.isArray(obj)) {
    obj.forEach((item) => {
      (cloned as LogValue[]).push(safeDeepClone(item, seen));
    });
  } else {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // safety check to see if the specific property is the object's own property,
        // or inherited through the prototype chain
        (cloned as LogObject)[key] = safeDeepClone(obj[key], seen);
      }
    }
  }

  return cloned;
}

/**
 * Returns a function that sanitizes sensitive fields in a log object.
 *
 * The sanitizer will:
 * - Redact values of keys matching the provided `sensitiveKeys`.
 * - Ensure sensitive data is replaced with `***REDACTED***` in logs.
 *
 * @param {string[]} sensitiveKeys - List of keys to redact from logs.
 * @returns {(info: LogObject) => LogObject} A function to sanitize log objects.
 */
export default (
  sensitiveKeys: string[] = ['SECRET', 'PASSWORD', 'TOKEN', 'KEY'],
) => {
  // find sensitive values from environment variables based on partial matches
  const sensitiveValues: string[] = Object.keys(process.env)
    .filter((envKey) =>
      sensitiveKeys.some((sensitive) =>
        envKey.toUpperCase().includes(sensitive)
      )
    )
    .map((envKey) => process.env[envKey] || '');

  // Helper function to sanitize strings containing sensitive values
  const sanitizeString = (str: string): string => {
    let sanitizedStr = str;
    sensitiveValues.forEach((value) => {
      if (value) {
        const escapedValue = value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'); // Escape special characters
        sanitizedStr = sanitizedStr.replace(
          new RegExp(escapedValue, 'g'),
          '***REDACTED***',
        );
      }
    });
    return sanitizedStr;
  };

  const recursiveSanitize = (obj: LogObject | Array<LogValue>) => {
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (item === undefined || item === null) {
          return;
        } else if (typeof item === 'string') {
          obj[index] = sanitizeString(item);
        } else if (Array.isArray(item) || typeof item === 'object') {
          recursiveSanitize(item);
        }
      });
    } else {
      for (const key in obj) {
        if (obj[key] === undefined || obj[key] === null) {
          continue;
        }

        if (typeof obj[key] === 'string') {
          if (
            sensitiveKeys.some((sensitive) =>
              key.toUpperCase().includes(sensitive)
            )
          ) {
            obj[key] = '***REDACTED***';
          } else {
            obj[key] = sanitizeString(obj[key]);
          }
        } else if (Array.isArray(obj[key]) || typeof obj[key] === 'object') {
          recursiveSanitize(obj[key] as LogObject);
        }
      }
    }
  };

  // Helper function to implement structuredClone with fallback logic
  //const deepCopy = (obj: LogObject) => {
  //  if (typeof structuredClone === 'function') {
  //    return structuredClone(obj);
  //  }
  //  return JSON.parse(safeStringify(obj));
  //};

  return (info: LogObject) => {
    if (info === undefined) return info;

    // Otherwise sanitize the object recursively
    const sanitizedInfo = safeDeepClone(info) as LogObject;
    recursiveSanitize(sanitizedInfo);

    return sanitizedInfo as (LogObject & { level: string; message: string });
  };
};
