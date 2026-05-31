import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';

@Injectable()
export class MapService {
  constructor(private readonly prisma: PrismaService) {}

  list(tripId: string) {
    return this.prisma.location.findMany({
      where: { tripId },
      orderBy: { position: 'asc' },
    });
  }

  async create(tripId: string, dto: CreateLocationDto) {
    const count = await this.prisma.location.count({ where: { tripId } });
    return this.prisma.location.create({
      data: {
        ...dto,
        tripId,
        position: count,
      },
    });
  }

  update(locationId: string, dto: UpdateLocationDto) {
    return this.prisma.location.update({
      where: { id: locationId },
      data: dto,
    });
  }

  async delete(locationId: string) {
    await this.prisma.location.delete({ where: { id: locationId } });
  }
}
