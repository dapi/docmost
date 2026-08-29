import { Logger } from '@nestjs/common';
import { OutgoingWebhookProcessor } from './outgoing-webhook.processor';
import { OutgoingWebhookService } from './outgoing-webhook.service';

describe('OutgoingWebhookProcessor', () => {
  it('logs worker failures that do not have an associated job', () => {
    const processor = new OutgoingWebhookProcessor(
      {} as OutgoingWebhookService,
    );
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    expect(() =>
      processor.onFailed(undefined, new Error('worker connection failed')),
    ).not.toThrow();
    expect(warn).toHaveBeenCalledWith(
      'Outgoing webhook unknown failed: worker connection failed',
    );

    warn.mockRestore();
  });
});
