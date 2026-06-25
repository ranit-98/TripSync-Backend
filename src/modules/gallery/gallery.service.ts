import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Photo, Trip, TripMember } from '../../database/schemas';
import { UploadsService } from '../uploads/uploads.service';
import { CreatePhotoDto, UpdatePhotoDto } from './dto/gallery.dto';
import { PaginationQueryDto, paginationMeta } from '../../common/dto/pagination-query.dto';

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

  async list(tripId: string, query: PaginationQueryDto) {
    const [items, total] = await Promise.all([
      this.photos.find({ tripId }).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean().exec(),
      this.photos.countDocuments({ tripId }).exec(),
    ]);
    return { items, pagination: paginationMeta(query, total) };
  }

  async album(tripId: string) {
    const [trip, photos, photoCount] = await Promise.all([
      this.trips.findOne({ id: tripId }).lean().exec(),
      this.photos.find({ tripId }).sort({ createdAt: -1 }).limit(1).lean().exec(),
      this.photos.countDocuments({ tripId }).exec(),
    ]);

    if (!trip) return null;

    return {
      ...trip,
      coverUrl: trip.coverUrl || photos[0]?.url || null,
      photoCount,
    };
  }

  async create(
    tripId: string,
    userId: string,
    dto: CreatePhotoDto,
  ) {
    return this.photos.create({
      tripId,
      uploadedBy: userId,
      caption: dto.caption?.trim() || null,
      objectKey: dto.objectKey,
      url: dto.url,
      originalFileName: dto.originalFileName,
      mimeType: dto.mimeType,
      size: dto.size,
    });
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

  async albums(userId: string, query: PaginationQueryDto) {
    const memberships = await this.tripMembers
      .find({ userId })
      .select({ tripId: 1, _id: 0 })
      .lean()
      .exec();

    const trips = await this.trips
      .find({
        status: 'active',
        $or: [
          { ownerId: userId },
          { id: { $in: memberships.map((membership) => membership.tripId) } },
        ],
      })
      .sort({ startDate: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean()
      .exec();

    const tripIds = trips.map((trip) => trip.id);
    const photoSummaries = await this.photos.aggregate<{
      _id: string;
      coverUrl: string;
      photoCount: number;
    }>([
      { $match: { tripId: { $in: tripIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$tripId',
          coverUrl: { $first: '$url' },
          photoCount: { $sum: 1 },
        },
      },
    ]);
    const photosByTripId = new Map(
      photoSummaries.map((summary) => [summary._id, summary]),
    );

    const items = trips.map((trip) => {
      const photoSummary = photosByTripId.get(trip.id);
      return {
        ...trip,
        coverUrl: trip.coverUrl || photoSummary?.coverUrl || null,
        photoCount: photoSummary?.photoCount || 0,
      };
    });
    const total = await this.trips.countDocuments({ status: 'active', $or: [{ ownerId: userId }, { id: { $in: memberships.map((membership) => membership.tripId) } }] }).exec();
    return { items, pagination: paginationMeta(query, total) };
  }
}
