import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { EventName } from '../../common/events/event.contants';
import { EnvironmentService } from '../environment/environment.service';
import { QueueJob, QueueName } from '../queue/constants';
import {
  OutgoingWebhookEvent,
  OutgoingWebhookJob,
} from './outgoing-webhook.types';

interface PageEvent {
  pageIds: string[];
  workspaceId: string;
}

// Database events are best-effort until their BullMQ insertion completes.
// Nest logs subscriber errors; webhook consumers must periodically reconcile
// source state to recover an event lost before durable queue insertion.
const pageEventOptions = { suppressErrors: true } as const;
const enqueueBatchSize = 100;

@Injectable()
export class OutgoingWebhookListener {
  constructor(
    private readonly environmentService: EnvironmentService,
    @InjectQueue(QueueName.WEBHOOK_QUEUE) private readonly webhookQueue: Queue,
  ) {}

  @OnEvent(EventName.PAGE_CREATED, pageEventOptions)
  handleCreated(event: PageEvent) {
    return this.enqueue('page.created', event);
  }

  @OnEvent(EventName.PAGE_UPDATED, pageEventOptions)
  handleUpdated(event: PageEvent) {
    return this.enqueue('page.updated', event, 10_000);
  }

  @OnEvent(EventName.PAGE_MOVED_TO_SPACE, pageEventOptions)
  handleMoved(event: PageEvent) {
    return this.enqueue('page.moved', event);
  }

  @OnEvent(EventName.PAGE_SOFT_DELETED, pageEventOptions)
  handleSoftDeleted(event: PageEvent) {
    return this.enqueue('page.deleted', event);
  }

  @OnEvent(EventName.PAGE_DELETED, pageEventOptions)
  handleDeleted(event: PageEvent) {
    return this.enqueue('page.deleted', event);
  }

  @OnEvent(EventName.SPACE_DELETED, pageEventOptions)
  handleDeletedSpacePages(event: PageEvent) {
    return this.enqueue('page.deleted', event);
  }

  @OnEvent(EventName.PAGE_RESTORED, pageEventOptions)
  handleRestored(event: PageEvent) {
    return this.enqueue('page.restored', event);
  }

  private async enqueue(
    eventName: OutgoingWebhookEvent,
    event: PageEvent,
    delay = 0,
  ): Promise<void> {
    if (!this.environmentService.getOutgoingWebhookUrl()) return;
    if (
      !this.environmentService.getOutgoingWebhookEvents().includes(eventName)
    ) {
      return;
    }
    if (!event.workspaceId) {
      throw new Error(`${eventName} is missing workspaceId`);
    }

    const occurredAt = new Date().toISOString();

    for (
      let offset = 0;
      offset < event.pageIds.length;
      offset += enqueueBatchSize
    ) {
      const jobs = event.pageIds
        .slice(offset, offset + enqueueBatchSize)
        .map((pageId) => {
          const data: OutgoingWebhookJob = {
            deliveryId: randomUUID(),
            event: eventName,
            occurredAt,
            workspaceId: event.workspaceId,
            pageId,
          };

          return {
            name: QueueJob.DELIVER_OUTGOING_WEBHOOK,
            data,
            opts:
              delay > 0
                ? {
                    delay,
                    deduplication: {
                      id: `${eventName}-${pageId}`,
                      replace: true,
                      keepLastIfActive: true,
                    },
                  }
                : undefined,
          };
        });

      await this.webhookQueue.addBulk(jobs);
    }
  }
}
