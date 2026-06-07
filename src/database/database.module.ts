import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoModelDefinitions } from './schema.definitions';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('database.uri'),
      }),
    }),
    MongooseModule.forFeature(mongoModelDefinitions),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
