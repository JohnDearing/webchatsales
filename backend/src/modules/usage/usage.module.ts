import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsageService } from './usage.service';
import { UsageController } from './usage.controller';
import { Client, ClientSchema } from '../../schemas/client.schema';
import {
  PricingPlan,
  PricingPlanSchema,
} from '../../schemas/pricing-plan.schema';
import {
  Conversation,
  ConversationSchema,
} from '../../schemas/conversation.schema';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Client.name, schema: ClientSchema },
      { name: PricingPlan.name, schema: PricingPlanSchema },
      { name: Conversation.name, schema: ConversationSchema },
    ]),
  ],
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
