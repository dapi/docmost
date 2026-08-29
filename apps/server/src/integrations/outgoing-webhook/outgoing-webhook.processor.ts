import { Logger, OnModuleDestroy } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QueueJob, QueueName } from '../queue/constants';
import { IOutgoingWebhookJob } from '../queue/constants/queue.interface';
import { OutgoingWebhookService } from './outgoing-webhook.service';

@Processor(QueueName.WEBHOOK_QUEUE)
export class OutgoingWebhookProcessor
  extends WorkerHost
  implements OnModuleDestroy
{
  private readonly logger = new Logger(OutgoingWebhookProcessor.name);

  constructor(private readonly webhookService: OutgoingWebhookService) {
    super();
  }

  async process(job: Job<IOutgoingWebhookJob>): Promise<void> {
    if (job.name !== QueueJob.DELIVER_OUTGOING_WEBHOOK) return;
    await this.webhookService.deliver(job.data);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<IOutgoingWebhookJob> | undefined, error: Error) {
    const deliveryId = job?.data?.deliveryId ?? job?.id ?? 'unknown';
    const reason = job?.failedReason ?? error.message;
    this.logger.warn(`Outgoing webhook ${deliveryId} failed: ${reason}`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) await this.worker.close();
  }
}
