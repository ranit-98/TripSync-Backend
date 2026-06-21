import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Expense, Notification, Trip, TripInvite, TripMember, User } from '../../database/schemas';

export type DashboardPeriod = 'month' | 'quarter' | 'half-year' | 'year';
const periodMonths: Record<DashboardPeriod, number> = { month: 1, quarter: 3, 'half-year': 6, year: 12 };

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Expense.name) private readonly expenses: Model<Expense>,
    @InjectModel(Notification.name) private readonly notifications: Model<Notification>,
    @InjectModel(TripInvite.name) private readonly invites: Model<TripInvite>,
    @InjectModel(TripMember.name) private readonly members: Model<TripMember>,
    @InjectModel(Trip.name) private readonly trips: Model<Trip>,
    @InjectModel(User.name) private readonly users: Model<User>,
  ) {}

  async overview(userId: string, period: DashboardPeriod) {
    if (!(period in periodMonths)) throw new BadRequestException('Unsupported dashboard period');

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - periodMonths[period] + 1, 1);
    const [membership, user] = await Promise.all([
      this.members.find({ userId }).lean().exec(),
      this.users.findOne({ id: userId }).lean().exec(),
    ]);
    const tripIds = membership.map((member) => member.tripId);
    const [trips, expenses, unreadUpdates, pendingInvites] = await Promise.all([
      this.trips.find({ id: { $in: tripIds }, status: 'active' }).sort({ startDate: 1 }).lean().exec(),
      this.expenses.find({ tripId: { $in: tripIds }, expenseDate: { $gte: start, $lte: now } }).lean().exec(),
      this.notifications.countDocuments({ userId, readAt: null }).exec(),
      this.invites.countDocuments({ email: user?.email, status: 'pending' }).exec(),
    ]);
    const activeTrips = trips.filter((trip) => trip.startDate <= now && trip.endDate >= now);
    const upcomingTrips = trips.filter((trip) => trip.startDate > now);
    const buckets = this.buckets(period, now);
    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    trips.filter((trip) => trip.createdAt >= start).forEach((trip) => bucketMap.get(this.bucketKey(period, trip.createdAt))!.trips += 1);
    expenses.forEach((expense) => bucketMap.get(this.bucketKey(period, expense.expenseDate))!.expenses += expense.amount);
    const categories = Object.entries(expenses.reduce<Record<string, number>>((result, expense) => {
      result[expense.category || 'Other'] = (result[expense.category || 'Other'] ?? 0) + expense.amount;
      return result;
    }, {})).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) })).sort((a, b) => b.value - a.value).slice(0, 5);

    return {
      period,
      stats: { activeTrips: activeTrips.length, upcomingTrips: upcomingTrips.length, unreadUpdates, pendingInvites, totalSpent: Number(expenses.reduce((total, expense) => total + expense.amount, 0).toFixed(2)) },
      trends: buckets.map(({ key: _key, ...bucket }) => ({ ...bucket, expenses: Number(bucket.expenses.toFixed(2)) })),
      expenseCategories: categories,
      nextTrip: upcomingTrips[0] ?? null,
      recentTrips: [...trips].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 4),
    };
  }

  private buckets(period: DashboardPeriod, now: Date) {
    const count = period === 'month' ? 4 : periodMonths[period];
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (count - index - 1), 1);
      return { key: this.bucketKey(period, date), label: date.toLocaleDateString('en-US', { month: 'short' }), trips: 0, expenses: 0 };
    });
  }

  private bucketKey(_period: DashboardPeriod, date: Date) {
    return `${date.getFullYear()}-${date.getMonth()}`;
  }
}
