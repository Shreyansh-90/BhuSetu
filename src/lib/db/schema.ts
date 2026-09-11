// Canonical Drizzle schema entry point.
//
// Table definitions remain split by domain under ./schema so each module stays
// reviewable. This file exists so Drizzle and application code can import one
// stable schema module without duplicating table definitions.
//
// The Supabase SQL migrations remain the source of truth for database changes.
// Do not use drizzle-kit push to mutate the shared Supabase database.

export * from './schema/index';
