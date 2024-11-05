import { expect } from 'chai';
import winston from 'winston';
import { Writable } from 'stream';
import Logger from '../src/index';

describe('Logger Constructor', () => {
  let output: string;
  let stream: Writable;
  let transport: winston.transport;

  beforeEach(() => {
    process.env.NODE_ENV = 'local-test';
    output = '';

    stream = new Writable({
      write(chunk, encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });

    transport = new winston.transports.Stream({ stream });
  });

  it('writes logs in valid JSON', () => {
    const logger = Logger(transport);
    logger.error('test message', { hello: 'world' });

    const logEvents = output.trim().split('\n');
    expect(JSON.parse(logEvents[0]).message).to.equal('test message');
  });

  it('includes the call stack for errors in the JSON log', () => {
    const logger = Logger(transport);
    logger.error(new Error('test message'));

    const logEvents = output.trim().split('\n');
    const logObject = JSON.parse(logEvents[0]);
    expect(logObject.message).to.equal('test message');
    expect(logObject.stack).to.not.equal(undefined);
  });
  
  it('logs debug in dev', () => {
    process.env.NODE_ENV = 'development';
    const logger = Logger(transport);
    logger.debug('debug message');

    const logEvents = output.trim().split('\n');
    expect(logEvents.length).to.be.greaterThan(0);

    const logObject = JSON.parse(logEvents[0]);
    expect(logObject.level).to.equal('debug');
  });

  it('does not log debug in prod', () => {
    process.env.NODE_ENV = 'production';
    const logger = Logger(transport);
    logger.debug('should not appear');

    expect(output.trim()).to.equal('');
  });

  it('applies colorization in the local environment', () => {
    process.env.NODE_ENV = 'local';
    const logger = Logger(transport);
    logger.info('colored log');
  
    expect(output).to.include('\x1B['); // ANSI escape sequence for colors
  });

  it('does not apply colorization in production', () => {
    process.env.NODE_ENV = 'production';
    const logger = Logger(transport);
    logger.info('uncolored log');
  
    expect(output).to.not.include('\x1B[');
  });

  it('applies pretty print formatting in specified environments', () => {
    const logger = Logger(transport, undefined, ['local-test']);
    logger.error('test message');
  
    const logEvents = output.trim();
    expect(logEvents).to.include('  '); // Check for spaces (pretty print)
  });

});
