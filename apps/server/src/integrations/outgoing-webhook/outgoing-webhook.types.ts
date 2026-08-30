export const outgoingWebhookEvents = [
  'page.created',
  'page.updated',
  'page.moved',
  'page.deleted',
  'page.restored',
] as const;

export type OutgoingWebhookEvent = (typeof outgoingWebhookEvents)[number];

export const defaultOutgoingWebhookEvents = outgoingWebhookEvents.join(',');

const outgoingWebhookEventAlternation = outgoingWebhookEvents
  .map((event) => event.replaceAll('.', '\\.'))
  .join('|');

export const outgoingWebhookEventsPattern = new RegExp(
  `^(?:\\s*(?:${outgoingWebhookEventAlternation})\\s*(?:,\\s*(?:${outgoingWebhookEventAlternation})\\s*)*)?$`,
);

export function isOutgoingWebhookEvent(
  value: unknown,
): value is OutgoingWebhookEvent {
  return (
    typeof value === 'string' &&
    (outgoingWebhookEvents as readonly string[]).includes(value)
  );
}

export interface OutgoingWebhookJob {
  deliveryId: string;
  event: OutgoingWebhookEvent;
  occurredAt: string;
  workspaceId: string;
  pageId: string;
}

export function isOutgoingWebhookJob(
  value: unknown,
): value is OutgoingWebhookJob {
  if (!value || typeof value !== 'object') return false;

  const job = value as Record<string, unknown>;
  return (
    typeof job.deliveryId === 'string' &&
    job.deliveryId.length > 0 &&
    isOutgoingWebhookEvent(job.event) &&
    typeof job.occurredAt === 'string' &&
    !Number.isNaN(Date.parse(job.occurredAt)) &&
    typeof job.workspaceId === 'string' &&
    job.workspaceId.length > 0 &&
    typeof job.pageId === 'string' &&
    job.pageId.length > 0
  );
}

export interface OutgoingWebhookPayload {
  version: '1';
  id: string;
  event: OutgoingWebhookEvent;
  occurredAt: string;
  workspaceId: string;
  data: {
    pageId: string;
  };
}
