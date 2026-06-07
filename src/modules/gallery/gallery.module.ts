import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { GalleryController } from './gallery.controller';
import { GalleryService } from './gallery.service';

@Module({
  imports: [UploadsModule],
  controllers: [GalleryController],
  providers: [GalleryService],
})
export class GalleryModule {}
