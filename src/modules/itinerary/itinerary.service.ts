import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity, TripDay } from '../../database/schemas';
import {
  CreateActivityDto,
  CreateDayDto,
  ReorderActivitiesDto,
  UpdateActivityDto,
  UpdateDayDto,
} from './dto/itinerary.dto';

type TripDayReadModel = TripDay & { activities: Activity[] };

@Injectable()
export class ItineraryService {
  constructor(
    @InjectModel(TripDay.name) private readonly tripDays: Model<TripDay>,
    @InjectModel(Activity.name) private readonly activities: Model<Activity>,
  ) {}

  async getItinerary(tripId: string) {
    const [days, unscheduled] = await Promise.all([
      this.tripDays
        .aggregate<TripDayReadModel>([
          { $match: { tripId } },
          { $sort: { position: 1, date: 1 } },
          {
            $lookup: {
              from: 'activities',
              let: { dayId: '$id' },
              pipeline: [
                { $match: { $expr: { $eq: ['$dayId', '$$dayId'] } } },
                { $sort: { position: 1 } },
                { $project: { _id: 0 } },
              ],
              as: 'activities',
            },
          },
          { $project: { _id: 0 } },
        ])
        .exec(),
      this.activities
        .find({ tripId, dayId: null })
        .sort({ position: 1 })
        .lean()
        .exec(),
    ]);

    return { days, unscheduled };
  }

  async createDay(tripId: string, dto: CreateDayDto) {
    const position = await this.tripDays.countDocuments({ tripId }).exec();
    return this.tripDays.create({
      ...dto,
      date: new Date(dto.date),
      tripId,
      position,
    });
  }

  updateDay(dayId: string, dto: UpdateDayDto) {
    return this.tripDays
      .findOneAndUpdate({ id: dayId }, dto, { new: true })
      .exec();
  }

  async deleteDay(dayId: string) {
    await this.tripDays.deleteOne({ id: dayId }).exec();
    await this.activities.updateMany({ dayId }, { dayId: null }).exec();
  }

  async createActivity(tripId: string, dto: CreateActivityDto) {
    const position = await this.activities
      .countDocuments({ tripId, dayId: dto.dayId ?? null })
      .exec();
    return this.activities.create({
      ...dto,
      tripId,
      dayId: dto.dayId ?? null,
      position,
    });
  }

  updateActivity(activityId: string, dto: UpdateActivityDto) {
    return this.activities
      .findOneAndUpdate({ id: activityId }, dto, { new: true })
      .exec();
  }

  async deleteActivity(activityId: string) {
    await this.activities.deleteOne({ id: activityId }).exec();
  }

  async reorder(dto: ReorderActivitiesDto) {
    await Promise.all(
      dto.items.map((item) =>
        this.activities
          .updateOne(
            { id: item.activityId },
            { position: item.position, dayId: item.dayId ?? null },
          )
          .exec(),
      ),
    );
  }
}
