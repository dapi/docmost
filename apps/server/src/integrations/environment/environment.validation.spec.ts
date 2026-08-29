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
});
