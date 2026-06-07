import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Photo, Trip, TripMember } from '../../database/schemas';
import { UploadsService } from '../uploads/uploads.service';
import { CreatePhotoDto, UpdatePhotoDto } from './dto/gallery.dto';

@Injectable()
export class GalleryService {
  private readonly logger = new Logger(GalleryService.name);

  constructor(
    @InjectModel(Photo.name) private readonly photos: Model<Photo>,
    @InjectModel(Trip.name) private readonly trips: Model<Trip>,
    @InjectModel(TripMember.name)
    private readonly tripMembers: Model<TripMember>,
    private readonly uploads: UploadsService,
  ) {}

  list(tripId: string) {
    return this.photos.find({ tripId }).sort({ createdAt: -1 }).lean().exec();
  }

  async create(
    tripId: string,
    userId: string,
    dto: CreatePhotoDto,
    image: Express.Multer.File,
  ) {
    const asset = await this.uploads.uploadImageAsset(
      image,
      `trips/${tripId}/photos`,
    );

    try {
      return await this.photos.create({
        tripId,
        uploadedBy: userId,
        caption: dto.caption?.trim() || null,
        objectKey: asset.objectKey,
        url: asset.url,
        originalFileName: image.originalname,
        mimeType: image.mimetype,
        size: image.size,
      });
    } catch (error) {
      try {
        await this.uploads.deleteImage(asset.objectKey);
      } catch (cleanupError) {
        this.logger.warn(
          `Failed to delete orphaned Cloudinary image ${asset.objectKey}: ${
            cleanupError instanceof Error ? cleanupError.message : cleanupError
          }`,
        );
      }
      throw error;
    }
  }

  update(photoId: string, dto: UpdatePhotoDto) {
    const updatePayload =
      dto.caption === undefined ? {} : { caption: dto.caption.trim() || null };

    return this.photos
      .findOneAndUpdate({ id: photoId }, updatePayload, { new: true })
      .exec();
  }

  async delete(photoId: string) {
    const photo = await this.photos.findOneAndDelete({ id: photoId }).exec();

    if (!photo) {
      return;
    }

    try {
      await this.uploads.deleteImage(photo.objectKey);
    } catch (error) {
      this.logger.warn(
        `Failed to delete Cloudinary image ${photo.objectKey}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  async albums(userId: string) {
    const memberships = await this.tripMembers
      .find({ userId })
      .select({ tripId: 1, _id: 0 })
      .lean()
      .exec();

    return this.trips
      .find({
        status: 'active',
        $or: [
          { ownerId: userId },
          { id: { $in: memberships.map((membership) => membership.tripId) } },
        ],
      })
      .sort({ startDate: 1 })
      .lean()
      .exec();
  }
}
