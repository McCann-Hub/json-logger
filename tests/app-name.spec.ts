import { expect } from 'chai';
import mock from 'mock-fs';
import path from 'path';
import Logger from '../src/index';

describe('Application Name Resolution', () => {
  process.setMaxListeners(0);

  afterEach(() => {
    // Restore the file system after each test
    mock.restore();
    delete process.env.LOGGER_APP_NAME;
  });

  it('retrieves the app name from package.json if it exists', () => {
    mock({
      'package.json': JSON.stringify({ name: 'AppFromPackage' }),
      // Recursively loads all node_modules
      node_modules: mock.load(path.resolve(__dirname, '../node_modules')),
    });

    const logger = Logger();
    expect(logger.defaultMeta.application).to.equal('AppFromPackage');
  });

  it('falls back to deno.json if package.json does not exist', () => {
    mock({
      'deno.json': JSON.stringify({ name: 'AppFromDeno' }),
    });

    const logger = Logger();
    expect(logger.defaultMeta.application).to.equal('AppFromDeno');
  });

  it('uses LOGGER_APP_NAME if neither package.json nor deno.json exists', () => {
    mock({});
    process.env.LOGGER_APP_NAME = 'AppFromEnv';

    const logger = Logger();
    expect(logger.defaultMeta.application).to.equal('AppFromEnv');
  });
});
