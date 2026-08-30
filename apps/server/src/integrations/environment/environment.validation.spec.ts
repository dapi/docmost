import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { EnvironmentVariables } from './environment.validation';

const baseConfig = {
  DATABASE_URL: 'postgres://localhost/docmost',
  REDIS_URL: 'redis://localhost:6379',
  APP_SECRET: 'test-secret-with-at-least-thirty-two-characters',
};

describe('EnvironmentVariables', () => {
  it('accepts a supported outgoing webhook event list', () => {
    const config = plainToInstance(EnvironmentVariables, {
      ...baseConfig,
      OUTGOING_WEBHOOK_EVENTS: 'page.created, page.updated,page.deleted',
    });

    const errors = validateSync(config);

    expect(
      errors.find((error) => error.property === 'OUTGOING_WEBHOOK_EVENTS'),
    ).toBeUndefined();
  });

  it('rejects unknown outgoing webhook events', () => {
    const config = plainToInstance(EnvironmentVariables, {
      ...baseConfig,
      OUTGOING_WEBHOOK_EVENTS: 'page.created,page.typo',
    });

    const errors = validateSync(config);

    expect(
      errors.find((error) => error.property === 'OUTGOING_WEBHOOK_EVENTS')
        ?.constraints?.matches,
    ).toContain('comma-separated list of supported page events');
  });

  it.each(['example.com/webhook', 'https://user:password@example.com/webhook'])(
    'rejects an unusable outgoing webhook URL: %s',
    (url) => {
      const config = plainToInstance(EnvironmentVariables, {
        ...baseConfig,
        OUTGOING_WEBHOOK_URL: url,
        OUTGOING_WEBHOOK_SECRET:
          'webhook-secret-with-at-least-thirty-two-characters',
      });

      const errors = validateSync(config);

      expect(
        errors.find((error) => error.property === 'OUTGOING_WEBHOOK_URL'),
      ).toBeDefined();
    },
  );

  it('accepts an explicit local HTTP webhook URL', () => {
    const config = plainToInstance(EnvironmentVariables, {
      ...baseConfig,
      OUTGOING_WEBHOOK_URL: 'http://localhost:1933/webhook',
      OUTGOING_WEBHOOK_SECRET:
        'webhook-secret-with-at-least-thirty-two-characters',
    });

    const errors = validateSync(config);

    expect(
      errors.find((error) => error.property.startsWith('OUTGOING_WEBHOOK_')),
    ).toBeUndefined();
  });

  it('rejects the documented outgoing webhook secret placeholder', () => {
    const config = plainToInstance(EnvironmentVariables, {
      ...baseConfig,
      OUTGOING_WEBHOOK_URL: 'http://localhost:1933/webhook',
      OUTGOING_WEBHOOK_SECRET: 'replace-with-at-least-32-random-characters',
    });

    const errors = validateSync(config);

    expect(
      errors.find((error) => error.property === 'OUTGOING_WEBHOOK_SECRET'),
    ).toBeDefined();
  });
});
