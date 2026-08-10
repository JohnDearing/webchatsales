import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsageService } from './usage.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { ClientId, SkipTenant } from '../tenant/tenant.decorator';
import { Request } from 'express';

@Controller('api/usage')
@UseGuards(AuthGuard, TenantGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  private assertSuperAdmin(req: Request): void {
    const user = (req as any).user || {};
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Super admin access required');
    }
  }

  /** Current tenant usage summary */
  @Get('summary')
  async getMyUsage(@ClientId() clientId: string) {
    const summary = await this.usageService.getUsageSummary(clientId);
    return { success: true, data: summary };
  }

  /** All pricing plans (admin-configurable) */
  @Get('plans')
  @SkipTenant()
  async getPlans(@Req() req: Request) {
    this.assertSuperAdmin(req);
    const plans = await this.usageService.getAllPlans(true);
    return { success: true, data: plans };
  }

  @Post('plans')
  @SkipTenant()
  async createPlan(@Req() req: Request, @Body() body: Record<string, any>) {
    this.assertSuperAdmin(req);
    const plan = await this.usageService.createPlan(body);
    return { success: true, data: plan };
  }

  @Patch('plans/:slug')
  @SkipTenant()
  async updatePlan(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Body() body: Record<string, any>,
  ) {
    this.assertSuperAdmin(req);
    const plan = await this.usageService.updatePlan(slug, body);
    return { success: true, data: plan };
  }

  /** Platform-wide usage stats (super admin) */
  @Get('platform-stats')
  @SkipTenant()
  async getPlatformStats(@Req() req: Request) {
    this.assertSuperAdmin(req);
    const stats = await this.usageService.getPlatformUsageStats();
    return { success: true, data: stats };
  }

  /** Usage for a specific client (super admin) */
  @Get('client/:clientId')
  @SkipTenant()
  async getClientUsage(
    @Req() req: Request,
    @Param('clientId') clientId: string,
  ) {
    this.assertSuperAdmin(req);
    const summary = await this.usageService.getUsageSummary(clientId);
    return { success: true, data: summary };
  }

  /** Manually assign plan to client (super admin) */
  @Post('client/:clientId/plan')
  @SkipTenant()
  async assignPlan(
    @Req() req: Request,
    @Param('clientId') clientId: string,
    @Body() body: { plan: string },
  ) {
    this.assertSuperAdmin(req);
    const client = await this.usageService.upgradePlan(clientId, body.plan);
    return { success: true, data: client };
  }
}
