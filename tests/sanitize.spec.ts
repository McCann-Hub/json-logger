import { expect } from 'chai';
import sanitize, { LogObject } from '@utils/sanitize';

describe('Logger Sanitization', function () {
  let sanitizeLogs = sanitize();

  beforeEach(function () {
    // Mock environment variables for sensitive values
    process.env.API_PASSWORD = 'supersecretpassword';
    process.env.API_TOKEN = 'sensitive-token';
    process.env.SPECIAL_API_TOKEN = ')LCK@GB?4y1fcMw8';

    sanitizeLogs = sanitize();
  });

  afterEach(function () {
    // Clean up mocked environment variables after each test
    delete process.env.API_PASSWORD;
    delete process.env.API_TOKEN;
  });

  it('should redact sensitive fields', function () {
    const logInfo = {
      SECRET_KEY: 'supersecret',
      API_TOKEN: 'abc123',
      message: 'A regular log message',
    };

    const sanitizedInfo = sanitizeLogs(logInfo);

    // Sensitive fields should be redacted
    expect(sanitizedInfo.SECRET_KEY).to.equal('***REDACTED***');
    expect(sanitizedInfo.API_TOKEN).to.equal('***REDACTED***');

    // Non-sensitive fields should remain unchanged
    expect(sanitizedInfo.message).to.equal('A regular log message');
  });

  it('should not modify non-sensitive fields', function () {
    const logInfo = {
      username: 'testuser',
      email: 'test@example.com',
      message: 'User login attempt',
    };

    const sanitizedInfo = sanitizeLogs(logInfo);

    // Non-sensitive fields should remain unchanged
    expect(sanitizedInfo.username).to.equal('testuser');
    expect(sanitizedInfo.email).to.equal('test@example.com');
    expect(sanitizedInfo.message).to.equal('User login attempt');
  });

  it('should sanitize sensitive environment variable values in a log message', function () {
    const logInfo = {
      message: `Here is my API Password: ${process.env.API_PASSWORD}`,
    };
    const sanitizedInfo = sanitizeLogs(logInfo);

    // Ensure that the sensitive value is redacted in the log message
    expect(sanitizedInfo.message).to.equal(
      'Here is my API Password: ***REDACTED***'
    );
  });

  it('should handle special characters in sensitive values', function () {
    const logInfo = {
      message: `Here is my Special API Token: ${process.env.SPECIAL_API_TOKEN}`,
    };
    const sanitizedInfo = sanitizeLogs(logInfo);

    // Ensure that the sensitive value is redacted in the log message
    expect(sanitizedInfo.message).to.equal(
      'Here is my Special API Token: ***REDACTED***'
    );
  });

  it('should sanitize multiple sensitive environment variables in a log message', function () {
    const logInfo = {
      message: `Password: ${process.env.API_PASSWORD}, Token: ${process.env.API_TOKEN}`,
    };
    const sanitizedInfo = sanitizeLogs(logInfo);

    // Ensure that both sensitive values are redacted
    expect(sanitizedInfo.message).to.equal(
      'Password: ***REDACTED***, Token: ***REDACTED***'
    );
  });

  it('should sanitize sensitive values in an array', function () {
    const logInfo = {
      messages: [
        'User logged in',
        `Password: ${process.env.API_PASSWORD}`,
        `Token: ${process.env.API_TOKEN}`,
        'Action successful',
      ],
    };

    const sanitizedInfo = sanitizeLogs(logInfo);

    // Ensure that sensitive values in the array are redacted
    expect(sanitizedInfo.messages).to.deep.equal([
      'User logged in',
      'Password: ***REDACTED***',
      'Token: ***REDACTED***',
      'Action successful',
    ]);
  });

  it('should sanitize sensitive fields and values inside nested objects and arrays', function () {
    const logInfo = {
      user: {
        username: 'testuser',
        password: 'mypassword',
      },
      session: {
        accessToken: 'xyz-token',
        details: [
          {
            apiKey: '12345',
            secret: 'someSecret',
          },
          `Sensitive Token: ${process.env.API_TOKEN}`,
        ],
      },
    };

    const sanitizedInfo = sanitizeLogs(logInfo);

    // Sensitive fields in nested objects should be redacted
    expect((sanitizedInfo.user as LogObject)?.password).to.equal(
      '***REDACTED***'
    );
    expect(
      (
        (
          (sanitizedInfo.session as LogObject)?.details as LogObject
        )?.[0] as LogObject
      )?.apiKey
    ).to.equal('***REDACTED***');
    expect(
      (
        (
          (sanitizedInfo.session as LogObject)?.details as LogObject
        )?.[0] as LogObject
      )?.secret
    ).to.equal('***REDACTED***');
    expect(
      (
        (sanitizedInfo.session as LogObject)?.details as LogObject
      )?.[1] as LogObject
    ).to.equal('Sensitive Token: ***REDACTED***');
    expect((sanitizedInfo.session as LogObject)?.accessToken).to.equal(
      '***REDACTED***'
    );

    // Non-sensitive fields should remain unchanged
    expect((sanitizedInfo.user as LogObject)?.username).to.equal('testuser');
  });

  it('should return the same object when no sensitive fields are present', function () {
    const logInfo = {
      userId: 1,
      action: 'login',
      status: 'success',
    };

    const sanitizedInfo = sanitizeLogs(logInfo);

    // Since no sensitive fields are present, object should remain unchanged
    expect(sanitizedInfo).to.deep.equal(logInfo);
  });

  it('should not sanitize sensitive fields that are not strings', function () {
    const logInfo = {
      password: {
        username: 'foobar',
        token: 'hello there',
      },
    };

    const sanitizedInfo = sanitizeLogs(logInfo);

    // Sensitive fields in nested objects should be redacted
    expect((sanitizedInfo.password as LogObject)?.token).to.equal(
      '***REDACTED***'
    );

    // Non-sensitive fields should remain unchanged
    expect((sanitizedInfo.password as LogObject)?.username).to.equal('foobar');
  });

  it('should handle empty logs gracefully', function () {
    const logInfo = {};

    const sanitizedInfo = sanitizeLogs(logInfo);

    // Empty logs should remain unchanged
    expect(sanitizedInfo).to.deep.equal({});
  });

  it('should handle null and undefined values without crashing', function () {
    const logInfo = {
      user: null,
      token: undefined,
      message: 'Log with null and undefined values',
    };

    const sanitizedInfo = sanitizeLogs(logInfo);

    // Ensure null and undefined values are handled without crashing
    expect(sanitizedInfo.user).to.be.equal(null);
    expect(sanitizedInfo.token).to.be.equal(undefined);
    expect(sanitizedInfo.message).to.equal(
      'Log with null and undefined values'
    );
  });
});
