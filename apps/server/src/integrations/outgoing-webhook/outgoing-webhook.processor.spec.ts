import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { QueueJob } from '../queue/constants';
import { OutgoingWebhookProcessor } from './outgoing-webhook.processor';
import { OutgoingWebhookService } from './outgoing-webhook.service';

describe('OutgoingWebhookProcessor', () => {
  const deliver = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => deliver.mockReset().mockResolvedValue(undefined));

  it('delivers valid outgoing webhook jobs', async () => {
    const processor = new OutgoingWebhookProcessor({
      deliver,
    } as unknown as OutgoingWebhookService);
    const data = {
      deliveryId: 'delivery-1',
      event: 'page.updated',
      occurredAt: '2026-08-30T12:00:00.000Z',
      workspaceId: 'workspace-1',
      pageId: 'page-1',
    };

    await processor.process({
      name: QueueJob.DELIVER_OUTGOING_WEBHOOK,
      data,
    } as Job<unknown>);

    expect(deliver).toHaveBeenCalledWith(data);
  });

  it('fails malformed persisted jobs without retrying them', async () => {
    const processor = new OutgoingWebhookProcessor({
      deliver,
    } as unknown as OutgoingWebhookService);

    await expect(
      processor.process({
        name: QueueJob.DELIVER_OUTGOING_WEBHOOK,
        data: {
          deliveryId: 'delivery-1',
          event: 'page.unknown',
          occurredAt: 'not-a-date',
          pageId: 'page-1',
        },
      } as Job<unknown>),
    ).rejects.toBeInstanceOf(UnrecoverableError);
    expect(deliver).not.toHaveBeenCalled();
  });

  it('fails unsupported queue jobs instead of acknowledging them', async () => {
    const processor = new OutgoingWebhookProcessor({
      deliver,
    } as unknown as OutgoingWebhookService);

    await expect(
      processor.process({ name: 'unknown-job', data: {} } as Job<unknown>),
    ).rejects.toThrow('Unsupported webhook job: unknown-job');
    expect(deliver).not.toHaveBeenCalled();
  });

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
