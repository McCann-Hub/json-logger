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
  [key: string]: LogValue;
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

  return (info: LogObject) => {
    if (info === undefined) return undefined;

    // Otherwise sanitize the object recursively
    const sanitizedInfo = JSON.parse(JSON.stringify(info));
    recursiveSanitize(sanitizedInfo);

    return sanitizedInfo;
  };
};
