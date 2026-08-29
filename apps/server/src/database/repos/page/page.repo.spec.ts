import { EventName } from '../../../common/events/event.contants';
import { PageRepo } from './page.repo';

describe('PageRepo', () => {
  it('emits canonical updated page IDs grouped by workspace', async () => {
    const updatedPages = [
      { id: 'page-id-1', workspaceId: 'workspace-1' },
      { id: 'page-id-2', workspaceId: 'workspace-2' },
      { id: 'page-id-3', workspaceId: 'workspace-1' },
    ];
    const query = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(updatedPages),
    };
    const db = {
      updateTable: jest.fn().mockReturnValue(query),
    };
    const eventEmitter = { emit: jest.fn() };
    const repo = new PageRepo(db as never, {} as never, eventEmitter as never);

    const result = await repo.updatePages({ title: 'Updated title' }, [
      'page-slug-1',
      'page-slug-2',
      'page-slug-3',
    ]);

    expect(query.where).toHaveBeenCalledWith('slugId', 'in', [
      'page-slug-1',
      'page-slug-2',
      'page-slug-3',
    ]);
    expect(query.returning).toHaveBeenCalledWith(['id', 'workspaceId']);
    expect(eventEmitter.emit).toHaveBeenNthCalledWith(
      1,
      EventName.PAGE_UPDATED,
      {
        pageIds: ['page-id-1', 'page-id-3'],
        workspaceId: 'workspace-1',
      },
    );
    expect(eventEmitter.emit).toHaveBeenNthCalledWith(
      2,
      EventName.PAGE_UPDATED,
      {
        pageIds: ['page-id-2'],
        workspaceId: 'workspace-2',
      },
    );
    expect(result.numUpdatedRows).toBe(3n);
  });

  it('does not emit an update when no page matched', async () => {
    const query = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue([]),
    };
    const db = {
      updateTable: jest.fn().mockReturnValue(query),
    };
    const eventEmitter = { emit: jest.fn() };
    const repo = new PageRepo(db as never, {} as never, eventEmitter as never);

    const result = await repo.updatePages({ title: 'Updated title' }, [
      'missing-page',
    ]);

    expect(eventEmitter.emit).not.toHaveBeenCalled();
    expect(result.numUpdatedRows).toBe(0n);
  });
});
