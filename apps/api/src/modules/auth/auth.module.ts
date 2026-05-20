import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { OperationalEventsModule } from '../operational-events/operational-events.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { TenantGuard } from './guards/tenant.guard';
import { CsrfGuard } from './guards/csrf.guard';
import { PolicyGuard } from './guards/policy.guard';
import { PolicyService } from './policy/policy.service';

@Module({
  imports: [JwtModule.register({}), OperationalEventsModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PolicyService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PolicyGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
