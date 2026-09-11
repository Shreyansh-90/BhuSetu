import { pgTable, uuid, text, doublePrecision, date, boolean, timestamp, customType } from 'drizzle-orm/pg-core';
import { geometryVerificationStatusEnum } from './enums';
import { projects } from './projects';
import { parcels } from './parcels';
import { userProfiles } from './users';

// Custom type for PostGIS geography columns.
// Drizzle ORM does not have built-in PostGIS support, so we use customType.
// The database stores geography(Geometry, 4326); Drizzle treats it as a string (WKT/GeoJSON).
const geography = customType<{ data: string }>({
  dataType() {
    return 'geography(Geometry, 4326)';
  },
});

export const projectGeometries = pgTable('project_geometries', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  geometry: geography('geometry').notNull(),
  sourceDataset: text('source_dataset'),
  sourceIdentifier: text('source_identifier'),
  sourceVersion: text('source_version'),
  sourceDate: date('source_date'),
  sourceCrs: text('source_crs').default('EPSG:4326'),
  confidence: doublePrecision('confidence'),
  verificationStatus: geometryVerificationStatusEnum('verification_status').notNull().default('unverified'),
  verifiedBy: uuid('verified_by').references(() => userProfiles.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const parcelGeometries = pgTable('parcel_geometries', {
  id: uuid('id').primaryKey().defaultRandom(),
  parcelId: uuid('parcel_id').notNull().references(() => parcels.id),
  geometry: geography('geometry').notNull(),
  sourceDataset: text('source_dataset'),
  sourceIdentifier: text('source_identifier'),
  sourceVersion: text('source_version'),
  sourceDate: date('source_date'),
  sourceCrs: text('source_crs').default('EPSG:4326'),
  confidence: doublePrecision('confidence'),
  verificationStatus: geometryVerificationStatusEnum('verification_status').notNull().default('unverified'),
  verifiedBy: uuid('verified_by').references(() => userProfiles.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
