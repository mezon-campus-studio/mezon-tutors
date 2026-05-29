import { Global, Module } from '@nestjs/common';
import { AdminGuard } from './guards/admin.guard';

@Global()
@Module({
  providers: [AdminGuard],
  exports: [AdminGuard],
})
export class CommonModule {}
