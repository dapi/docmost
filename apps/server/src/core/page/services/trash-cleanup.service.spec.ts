import { EventName } from '../../../common/events/event.contants';
import { TrashCleanupService } from './trash-cleanup.service';

describe('TrashCleanupService', () => {
  it('emits a hard-delete event after old trash rows are removed', async () => {
    const descendantsQuery = {
      selectFrom: jest.fn().mockReturnThis(),
      selectAll: jest.fn().mockReturnThis(),
      execute: jest
        .fn()
        .mockResolvedValue([{ id: 'page-1' }, { id: 'page-2' }]),
    };
    const deleteQuery = {
      where: jest.fn().mockReturnThis(),
      executeTakeFirst: jest.fn().mockResolvedValue({ numDeletedRows: 2n }),
    };
    const db = {
      withRecursive: jest.fn().mockReturnValue(descendantsQuery),
      deleteFrom: jest.fn().mockReturnValue(deleteQuery),
    };
    const attachmentQueue = { add: jest.fn().mockResolvedValue(undefined) };
    const eventEmitter = { emit: jest.fn() };
    const service = new TrashCleanupService(
      db as never,
      attachmentQueue as never,
      eventEmitter as never,
    );

    await (
      service as unknown as {
        cleanupPage(pageId: string, workspaceId: string): Promise<void>;
      }
    ).cleanupPage('page-1', 'workspace-1');

    expect(eventEmitter.emit).toHaveBeenCalledWith(EventName.PAGE_DELETED, {
      pageIds: ['page-1', 'page-2'],
      workspaceId: 'workspace-1',
    });
  });

  it('does not emit when another worker already removed the rows', async () => {
    const descendantsQuery = {
      selectFrom: jest.fn().mockReturnThis(),
      selectAll: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue([{ id: 'page-1' }]),
    };
    const deleteQuery = {
      where: jest.fn().mockReturnThis(),
      executeTakeFirst: jest.fn().mockResolvedValue({ numDeletedRows: 0n }),
    };
    const db = {
      withRecursive: jest.fn().mockReturnValue(descendantsQuery),
      deleteFrom: jest.fn().mockReturnValue(deleteQuery),
    };
    const attachmentQueue = { add: jest.fn().mockResolvedValue(undefined) };
    const eventEmitter = { emit: jest.fn() };
    const service = new TrashCleanupService(
      db as never,
      attachmentQueue as never,
      eventEmitter as never,
    );

    await (
      service as unknown as {
        cleanupPage(pageId: string, workspaceId: string): Promise<void>;
      }
    ).cleanupPage('page-1', 'workspace-1');

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
