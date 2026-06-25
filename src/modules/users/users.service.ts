import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { MESSAGES } from '../../common/constants/messages.constants';
import { User, type UserDocument } from '../../database/schemas';
import { ChangePasswordDto, UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto, paginationMeta } from '../../common/dto/pagination-query.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  async findProfile(userId: string) {
    const user = await this.users.findOne({ id: userId }).exec();
    if (!user) {
      throw new NotFoundException(MESSAGES.COMMON.NOT_FOUND);
    }
    return this.toProfile(user);
  }

  async search(query: string, excludeUserId: string, pagination: PaginationQueryDto) {
    const term = query.trim();
    if (term.length < 2) return { items: [], pagination: paginationMeta(pagination, 0) };

    const expression = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const filter = { id: { $ne: excludeUserId }, $or: [{ name: expression }, { email: expression }] };
    const [users, total] = await Promise.all([
      this.users.find(filter).skip((pagination.page - 1) * pagination.limit).limit(pagination.limit).exec(),
      this.users.countDocuments(filter).exec(),
    ]);

    return { items: users.map((user) => this.toProfile(user)), pagination: paginationMeta(pagination, total) };
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    await this.users.updateOne({ id: userId }, dto).exec();
    return this.findProfile(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.users.findOne({ id: userId }).exec();
    if (
      !user ||
      !(await bcrypt.compare(dto.currentPassword, user.passwordHash))
    ) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }
    await this.users
      .updateOne(
        { id: userId },
        {
          passwordHash: await bcrypt.hash(dto.newPassword, 12),
          refreshTokenHash: null,
        },
      )
      .exec();
  }

  private toProfile(user: User | UserDocument) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
