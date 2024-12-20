// https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-winston-and-morgan-to-log-node-js-applications
// https://docs.splunk.com/Documentation/CIM/6.0.0/User/CIMFields
import winston from 'winston';
import process from 'node:process';
import { existsSync, readFileSync } from 'node:fs';
import sanitize from '@utils/sanitize';
// Define your severity levels.
// With them, You can create log files,
// see or hide levels based on the running ENV.
const levels = {
  error: 0,
  warn: 1,
  http: 2,
  info: 3,
  debug: 4,
};
// This method sets the current severity based on
// the current NODE_ENV
// show all the log levels if the server was run in development mode;
// otherwise, if it was run in production, show only info, http, warn and error messages.
const loggerLevel = (env: string) => {
  if (process.env.WINSTON_LEVEL) {
    return process.env.WINSTON_LEVEL;
  }
  switch (env) {
    case 'local-test':
      return 'error';
    case 'local':
    case 'dev':
    case 'development':
      return 'debug';
    default:
      return 'info';
  }
};
// Define different colors for each level.
// Colors make the log message more visible,
// adding the ability to focus or ignore messages.
const colors = {
  error: 'red',
  warn: 'yellow',
  http: 'magenta',
  info: 'green',
  debug: 'white',
};
// Tell winston that you want to link the colors
// defined above to the severity levels.
winston.addColors(colors);
// Customize the log format.
const format = (
  env: string,
  sensitiveKeys: string[],
  prettyPrintEnvs: string[] = ['local'],
) => {
  const sanitizeLogs = sanitize(sensitiveKeys);
  return winston.format.combine(
    // Make sure to write the stack when logging an error
    winston.format.errors({ stack: true }),
    // Add the message timestamp with the preferred format
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    // Sanitize the log values
    winston.format((info) => {
      const levelSym = Symbol.for('level');
      //const messageSym = Symbol.for('message');
      //const splatSym = Symbol.for('splat');
      const sanitizedInfo = sanitizeLogs(info);
      sanitizedInfo[levelSym] = info[levelSym];
      //sanitizedInfo[messageSym] = sanitizeLogs(info[messageSym])
      //sanitizedInfo[splatSym] = sanitizeLogs(info[splatSym])
      return sanitizedInfo;
    })(),
    // Define the JSON format for pretty print
    prettyPrintEnvs.includes(env)
      ? winston.format.json({ replacer: undefined, space: 2 })
      : winston.format.json(),
    // Tell Winston that the logs must be colored
    winston.format.colorize({ all: env === 'local' }),
  );
};
// Define which transports the logger must use to print out messages.
const defaultTransports = [
  // Use the console to print the messages
  new winston.transports.Console(),
  // Print all the error level messages inside the error.log file
  new winston.transports.File({
    filename: process.env.LOGGER_ERROR_PATH || './logs/error.log',
    level: 'error',
  }),
];
//
function getAppName() {
  let appName: string;
  if (existsSync('./package.json')) {
    appName = JSON.parse(readFileSync('./package.json', 'utf-8')).name;
  } else if (existsSync('./deno.json')) {
    appName = JSON.parse(readFileSync('./deno.json', 'utf-8')).name;
  } else {
    appName = process.env.LOGGER_APP_NAME ?? '';
  }
  return appName;
}
/**
 * Creates and returns a Winston logger instance with configurable settings.
 *
 * The logger supports:
 * - Customizable log levels based on the environment.
 * - JSON log output with optional pretty-printing.
 * - Sensitive data sanitization.
 * - Handling of uncaught exceptions and promise rejections.
 *
 * @param {winston.transport | winston.transport[]} [transports=[]] - Optional Winston transports for custom log outputs.
 * @param {string[]} [sensitiveKeys=['SECRET', 'PASSWORD', 'TOKEN', 'KEY']] - List of keys to redact from logs.
 * @param {string[]} [prettyPrintEnvs=['local']] - List of environments to pretty print logs.
 * @returns {winston.Logger} A configured Winston logger instance.
 */
export default function Logger(
  transports: winston.transport | winston.transport[] = defaultTransports,
  sensitiveKeys: string[] = ['SECRET', 'PASSWORD', 'TOKEN', 'KEY'],
  prettyPrintEnvs: string[] = ['local'],
): winston.Logger {
  const env = process.env.NODE_ENV || 'development';
  // Create the logger instance that has to be exported
  // and used to log messages.
  return winston.createLogger({
    level: loggerLevel(env),
    defaultMeta: {
      app: getAppName(),
      environment: env,
    },
    levels,
    format: format(env, sensitiveKeys, prettyPrintEnvs),
    transports,
    exceptionHandlers: transports,
    rejectionHandlers: transports,
    exitOnError: !['local', 'dev', 'development'].includes(env),
  });
}
