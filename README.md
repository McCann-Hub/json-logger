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

Sanitize sensitive fields by specifying keys to redact:

```javascript
const logger = Logger(undefined, ['SECRET', 'PASSWORD', 'TOKEN']);
logger.info('User login', { password: 'secret123', token: 'abc' });
```

Fields like `user_password` and `api_token` will appear as `***REDACTED***` in the logs.
