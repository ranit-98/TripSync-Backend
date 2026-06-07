import './polyfills/node-crypto.polyfill';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { FilesModule } from './modules/files/files.module';
import { GalleryModule } from './modules/gallery/gallery.module';
import { ItineraryModule } from './modules/itinerary/itinerary.module';
import { MapModule } from './modules/map/map.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TripsModule } from './modules/trips/trips.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    TripsModule,
    ItineraryModule,
    ExpensesModule,
    MapModule,
    ChatModule,
    GalleryModule,
    FilesModule,
    NotificationsModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
