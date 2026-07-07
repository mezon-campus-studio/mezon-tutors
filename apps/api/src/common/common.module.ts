import { Global, Module } from '@nestjs/common';
import { AdminGuard } from './guards/admin.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  providers: [AdminGuard, RolesGuard],
  exports: [AdminGuard, RolesGuard],
})
export class CommonModule {}
