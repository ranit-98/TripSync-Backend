import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Location } from '../../database/schemas';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';

@Injectable()
export class MapService {
  constructor(
    @InjectModel(Location.name) private readonly locations: Model<Location>,
  ) {}

  list(tripId: string) {
    return this.locations.find({ tripId }).sort({ position: 1 }).lean().exec();
  }

  async create(tripId: string, dto: CreateLocationDto) {
    const position = await this.locations.countDocuments({ tripId }).exec();
    return this.locations.create({ ...dto, tripId, position });
  }

  update(locationId: string, dto: UpdateLocationDto) {
    return this.locations
      .findOneAndUpdate({ id: locationId }, dto, { new: true })
      .exec();
  }

  async delete(locationId: string) {
    await this.locations.deleteOne({ id: locationId }).exec();
  }
}
