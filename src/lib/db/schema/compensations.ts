import { pgTable, uuid, doublePrecision, timestamp, text } from 'drizzle-orm/pg-core';
import { parcels } from './parcels';
import { projects } from './projects';

export const compensations = pgTable('compensations', {
  id: uuid('id').primaryKey().defaultRandom(),
  parcelId: uuid('parcel_id').references(() => parcels.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  baseMarketValue: doublePrecision('base_market_value').notNull(),
  multiplicationFactor: doublePrecision('multiplication_factor').notNull().default(1),
  solatiumAmount: doublePrecision('solatium_amount').notNull(), // usually 100% of market value under RFCTLARR Act 2013
  totalAwardAmount: doublePrecision('total_award_amount').notNull(),
  status: text('status').notNull().default('calculated'), // 'calculated', 'approved', 'disbursed'
  awardDocumentHash: text('award_document_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
