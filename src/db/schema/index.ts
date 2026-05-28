// Schema barrel — re-exports every table + relations + enums.
// Drizzle's `db` instance (src/db/index.ts) spreads this into its `schema`
// option so `db.query.<tableName>` works for typed reads.

export * from './trainers';
export * from './trainer_google_tokens';
export * from './clients';
export * from './calendar_events';
export * from './attendance_records';
export * from './app_settings';
export * from './session';
export * from './account';
export * from './verification';
export * from './relations';
