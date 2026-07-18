import { DatabaseIndexMigrationService } from './database-index-migration.service';

describe('DatabaseIndexMigrationService', () => {
  it('removes the obsolete unique username index', async () => {
    const collection = {
      indexes: jest.fn().mockResolvedValue([
        { name: '_id_', key: { _id: 1 } },
        { name: 'username_1', key: { username: 1 }, unique: true },
      ]),
      dropIndex: jest.fn().mockResolvedValue(undefined),
    };
    const connection = {
      collection: jest.fn().mockReturnValue(collection),
    };
    const service = new DatabaseIndexMigrationService(connection as never);

    await service.onApplicationBootstrap();

    expect(collection.dropIndex).toHaveBeenCalledWith('username_1');
  });

  it('leaves unrelated indexes unchanged', async () => {
    const collection = {
      indexes: jest.fn().mockResolvedValue([
        { name: '_id_', key: { _id: 1 } },
        { name: 'email_1', key: { email: 1 }, unique: true },
      ]),
      dropIndex: jest.fn(),
    };
    const connection = {
      collection: jest.fn().mockReturnValue(collection),
    };
    const service = new DatabaseIndexMigrationService(connection as never);

    await service.onApplicationBootstrap();

    expect(collection.dropIndex).not.toHaveBeenCalled();
  });
});
