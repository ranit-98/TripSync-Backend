import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class DatabaseIndexMigrationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseIndexMigrationService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onApplicationBootstrap() {
    const users = this.connection.collection('users');
    let indexes: Awaited<ReturnType<typeof users.indexes>>;

    try {
      indexes = await users.indexes();
    } catch (error: unknown) {
      // A new database has no users collection or indexes to migrate yet.
      if (this.hasMongoCode(error, 26)) return;
      throw error;
    }

    const obsoleteUsernameIndex = indexes.find(
      (index) =>
        index.name === 'username_1' &&
        index.unique === true &&
        Object.keys(index.key).length === 1 &&
        index.key.username === 1,
    );

    if (!obsoleteUsernameIndex) return;

    try {
      await users.dropIndex('username_1');
      this.logger.log('Removed obsolete users.username_1 unique index');
    } catch (error: unknown) {
      // Another server instance may have completed the same migration first.
      if (!this.hasMongoCode(error, 27)) throw error;
    }
  }

  private hasMongoCode(error: unknown, code: number) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }
}
