# json-logger

A configurable, secure logging module built on Winston for Node.js applications. This logger formats logs as JSON objects, supports custom log levels, sanitizes sensitive data, colorizes output, and provides structured JSON formatting. Ideal for multi-environment setups with security-focused logging.

## Features

* **Customizable log output levels based on NODE_ENV** to control which log levels are recorded in different environments
* **Colorized console output** for enhanced readability
* **JSON formatting** for structured logs, with pretty-print options
* **Sensitive data sanitization** to prevent plain-text logging of sensitive fields
* **Uncaught Exception & Rejection Handling** for robust error logging

## Installation

```bash
npm install @mccann-hub/json-logger
```

## Usage

The package ships ESM and CommonJS builds. From CommonJS, the logger factory is the `default` export:

```javascript
const Logger = require('@mccann-hub/json-logger').default;
```

### Basic Setup

Initialize the logger with default settings:

```javascript
import Logger from '@mccann-hub/json-logger';

const logger = Logger();

// Logging examples
logger.info('Informational message');
logger.error('An error occurred', { error: new Error('Sample error') });
```

### Configuration Options

### Application Name

The logger will attempt to retrieve the application name in the following order of precedence:

1) From package.json (if it exists), using the name field.
2) From deno.json (if it exists), using the name field.
3) From the LOGGER_APP_NAME environment variable.

Example for setting LOGGER_APP_NAME:

```bash
export LOGGER_APP_NAME="MyAppName"
```

#### Log Output Levels

The logger adjusts output levels based on NODE_ENV:

* **local / development:** Logs all levels (debug and higher).
* **local-test:** Logs only error level by default.
* **production:** Logs info, http, warn, and error levels only.

The default level can also be overridden by setting `WINSTON_LEVEL`:

```bash
export WINSTON_LEVEL=debug
```

#### Sensitive Data Sanitization

By default the logger redacts any field whose name contains `SECRET`, `PASSWORD`, `TOKEN`, `KEY`, `AUTHORIZATION`, `AUTH`, or `COOKIE`, ignoring case. Fields like `user_password`, `api_token`, `Authorization`, and `set-cookie` appear as `***REDACTED***` in the logs. String values are replaced, every string in an array value is replaced, including strings in nested arrays, and object values are searched for sensitive keys of their own.

The match is a substring check, so `AUTH` also redacts fields such as `author`.

Passing your own list replaces the defaults. To add keys instead, spread `DEFAULT_SENSITIVE_KEYS`:

```javascript
import Logger, { DEFAULT_SENSITIVE_KEYS } from '@mccann-hub/json-logger';

const logger = Logger(undefined, [...DEFAULT_SENSITIVE_KEYS, 'SSN']);
logger.info('User login', { password: 'secret123', ssn: '123-45-6789' });
```

The logger also reads the values of environment variables whose names match a sensitive key and scrubs those values from every logged string. It skips `true`, `false`, and numbers of up to five digits, so a flag like `AUTH_ENABLED=true` or a setting like `COOKIE_MAX_AGE=3600` doesn't redact every matching word or number in your logs. Numbers of six or more digits, such as a numeric API token, are still scrubbed.

#### Large arrays

The logger writes at most 100 items of any array, at any depth. When it drops items, it appends a string with the count, such as `[150 more items]`. Real data could contain the same text, so read it as a note for people scanning the log, not a field to parse. Under a sensitive key the count is redacted along with the other strings.
