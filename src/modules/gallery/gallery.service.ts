import { Injectable } from '@nestjs/common';
import {
  activeTripsForUserWhere,
  tripStartDateAscending,
} from '../../database/queries/trip.queries';
import { PrismaService } from '../../database/prisma.service';
import { CreatePhotoDto, UpdatePhotoDto } from './dto/gallery.dto';

@Injectable()
export class GalleryService {
  constructor(private readonly prisma: PrismaService) {}

  list(tripId: string) {
    return this.prisma.photo.findMany({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(tripId: string, userId: string, dto: CreatePhotoDto) {
    return this.prisma.photo.create({
      data: { ...dto, tripId, uploadedBy: userId },
    });
  }

  update(photoId: string, dto: UpdatePhotoDto) {
    return this.prisma.photo.update({ where: { id: photoId }, data: dto });
  }

  async delete(photoId: string) {
    await this.prisma.photo.delete({ where: { id: photoId } });
  }

  albums(userId: string) {
    return this.prisma.trip.findMany({
      where: activeTripsForUserWhere(userId),
      include: { members: true },
      orderBy: tripStartDateAscending(),
    });
  }
}
