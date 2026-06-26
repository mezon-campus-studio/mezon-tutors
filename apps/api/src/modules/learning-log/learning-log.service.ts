import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LogLearningDto } from './dto/log-learning.dto';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class LearningLogService {
  constructor(private readonly prisma: PrismaService) {}

  async logLearning(studentId: string, dto: LogLearningDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { timezone: true },
    });

    const userTimezone = user?.timezone || 'UTC';
    
    // Create dateKey based on user's timezone (representing the day of the action in their local time)
    // Prisma Date maps accurately via ISO strings formatted to YYYY-MM-DDT00:00:00.000Z representing the date mathematically.
    const nowLocal = dayjs().tz(userTimezone);
    const dateKeyStr = nowLocal.format('YYYY-MM-DD');
    const dateKey = new Date(`${dateKeyStr}T00:00:00.000Z`);

    const log = await this.prisma.learningLog.create({
      data: {
        studentId,
        vocabularyWordId: dto.vocabularyWordId,
        action: dto.action,
        dateKey,
      },
    });

    return log;
  }

  async getLearningHeatmap(studentId: string, months: number = 7) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { timezone: true },
    });
    const userTimezone = user?.timezone || 'UTC';
    const nowLocal = dayjs().tz(userTimezone);
    
    // Start date for the heatmap
    const startDateStr = nowLocal.subtract(months, 'month').format('YYYY-MM-DD');
    const startDate = new Date(`${startDateStr}T00:00:00.000Z`);

    const logs = await this.prisma.learningLog.groupBy({
      by: ['dateKey'],
      where: {
        studentId,
        dateKey: {
          gte: startDate,
        },
      },
      _count: {
        _all: true,
      },
      orderBy: {
        dateKey: 'asc',
      },
    });

    const heatmap = logs.map(item => ({
      date: item.dateKey.toISOString().split('T')[0],
      count: item._count._all,
    }));

    const totalWords = await this.prisma.learningLog.count({
      where: { studentId },
    });

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let activeStreak = 0;
    let checkDateStr = nowLocal.format('YYYY-MM-DD');

    // We need all distinct dates the user has practiced to calculate strict longest streak
    // Using a simpler client-side grouping method after fetching distinct dates
    const allLogs = await this.prisma.learningLog.groupBy({
      by: ['dateKey'],
      where: { studentId },
      orderBy: { dateKey: 'desc' },
    });

    const practiceDates = new Set(allLogs.map(log => log.dateKey.toISOString().split('T')[0]));

    // Current Streak logic: from today going backwards
    let currentCheckDate = nowLocal.clone();
    // If user didn't practice today, check if they practiced yesterday.
    // Usually streak counts if today OR yesterday is active. 
    // We'll count strictly backwards.
    if (practiceDates.has(currentCheckDate.format('YYYY-MM-DD'))) {
       // active today
    } else if (practiceDates.has(currentCheckDate.subtract(1, 'day').format('YYYY-MM-DD'))) {
       currentCheckDate = currentCheckDate.subtract(1, 'day');
    } else {
       // no streak
    }
    
    if (practiceDates.has(currentCheckDate.format('YYYY-MM-DD'))) {
       while (practiceDates.has(currentCheckDate.format('YYYY-MM-DD'))) {
         currentStreak++;
         currentCheckDate = currentCheckDate.subtract(1, 'day');
       }
    }

    // Longest Streak logic
    let tempStreak = 0;
    let previousDate: dayjs.Dayjs | null = null;
    
    const sortedDatesStr = Array.from(practiceDates).sort();
    for (const d of sortedDatesStr) {
      const currentVal = dayjs(String(d));
      if (!previousDate) {
        tempStreak = 1;
      } else {
        if (currentVal.diff(previousDate, 'day') === 1) {
          tempStreak++;
        } else {
          if (tempStreak > longestStreak) longestStreak = tempStreak;
          tempStreak = 1;
        }
      }
      previousDate = currentVal;
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;

    return {
      heatmap,
      totalWords,
      currentStreak,
      longestStreak,
    };
  }
}
