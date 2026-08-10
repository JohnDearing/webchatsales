import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PricingPlanDocument = PricingPlan & Document;

/**
 * Admin-configurable pricing plan — limits and pricing without code changes.
 */
@Schema({ timestamps: true })
export class PricingPlan {
  @Prop({ required: true, unique: true, index: true })
  slug: string; // trial, starter, pro, enterprise

  @Prop({ required: true })
  name: string;

  @Prop({ default: 0 })
  monthlyPriceUsd: number;

  @Prop({ default: 100 })
  chatLimitPerMonth: number;

  @Prop({ default: 500000 })
  tokenLimitPerMonth: number;

  /** Allow chats beyond limit and bill per overage chat */
  @Prop({ default: false })
  allowOverage: boolean;

  @Prop({ default: 0.5 })
  overagePricePerChatUsd: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop()
  description?: string;
}

export const PricingPlanSchema = SchemaFactory.createForClass(PricingPlan);
