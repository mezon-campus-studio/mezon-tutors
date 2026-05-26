import { Injectable, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  createCancelRescheduleReason(args: Prisma.CancelRescheduleReasonCreateArgs) {
    return this.cancelRescheduleReason.create(args);
  }

  findCancelRescheduleReasons(where: Prisma.CancelRescheduleReasonWhereInput) {
    return this.cancelRescheduleReason.findMany({ where });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
