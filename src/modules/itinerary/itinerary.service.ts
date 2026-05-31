import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateActivityDto,
  CreateDayDto,
  ReorderActivitiesDto,
  UpdateActivityDto,
  UpdateDayDto,
} from './dto/itinerary.dto';

@Injectable()
export class ItineraryService {
  constructor(private readonly prisma: PrismaService) {}

  async getItinerary(tripId: string) {
    const days = await this.prisma.tripDay.findMany({
      where: { tripId },
      include: { activities: { orderBy: { position: 'asc' } } },
      orderBy: [{ position: 'asc' }, { date: 'asc' }],
    });
    const unscheduled = await this.prisma.activity.findMany({
      where: { tripId, dayId: null },
      orderBy: { position: 'asc' },
    });
    return { days, unscheduled };
  }

  async createDay(tripId: string, dto: CreateDayDto) {
    const count = await this.prisma.tripDay.count({ where: { tripId } });
    return this.prisma.tripDay.create({
      data: { ...dto, date: new Date(dto.date), tripId, position: count },
    });
  }

  async updateDay(dayId: string, dto: UpdateDayDto) {
    return this.prisma.tripDay.update({ where: { id: dayId }, data: dto });
  }

  async deleteDay(dayId: string) {
    await this.prisma.tripDay.delete({ where: { id: dayId } });
  }

  async createActivity(tripId: string, dto: CreateActivityDto) {
    const count = await this.prisma.activity.count({
      where: { tripId, dayId: dto.dayId },
    });
    return this.prisma.activity.create({
      data: { ...dto, tripId, position: count },
    });
  }

  async updateActivity(activityId: string, dto: UpdateActivityDto) {
    return this.prisma.activity.update({
      where: { id: activityId },
      data: dto,
    });
  }

  async deleteActivity(activityId: string) {
    await this.prisma.activity.delete({ where: { id: activityId } });
  }

  async reorder(dto: ReorderActivitiesDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.activity.update({
          where: { id: item.activityId },
          data: {
            position: item.position,
            dayId: item.dayId ?? null,
          },
        }),
      ),
    );
  }
}
