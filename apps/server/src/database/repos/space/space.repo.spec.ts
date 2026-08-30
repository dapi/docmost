import { EventName } from '../../../common/events/event.contants';
import { SpaceRepo } from './space.repo';

describe('SpaceRepo', () => {
  function createRepo(numDeletedRows: bigint) {
    const spaceQuery = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      forUpdate: jest.fn().mockReturnThis(),
      executeTakeFirst: jest.fn().mockResolvedValue({ id: 'space-1' }),
    };
    const pageQuery = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest
        .fn()
        .mockResolvedValue([{ id: 'page-1' }, { id: 'page-2' }]),
    };
    const deleteQuery = {
      where: jest.fn().mockReturnThis(),
      executeTakeFirst: jest.fn().mockResolvedValue({ numDeletedRows }),
    };
    const trx = {
      selectFrom: jest.fn((table: string) =>
        table === 'spaces' ? spaceQuery : pageQuery,
      ),
      deleteFrom: jest.fn().mockReturnValue(deleteQuery),
    };
    const db = {
      transaction: jest.fn().mockReturnValue({
        execute: jest.fn(
          (callback: (transaction: typeof trx) => Promise<unknown>) =>
            callback(trx),
        ),
      }),
    };
    const eventEmitter = { emit: jest.fn() };

    return {
      repo: new SpaceRepo(db as never, eventEmitter as never),
      eventEmitter,
    };
  }

  it('emits page deletions after a space is deleted', async () => {
    const { repo, eventEmitter } = createRepo(1n);

    await repo.deleteSpace('space-1', 'workspace-1');

    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(EventName.SPACE_DELETED, {
      spaceId: 'space-1',
      workspaceId: 'workspace-1',
      pageIds: ['page-1', 'page-2'],
    });
  });

  it('does not emit when another request already deleted the space', async () => {
    const { repo, eventEmitter } = createRepo(0n);

    await repo.deleteSpace('space-1', 'workspace-1');

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
