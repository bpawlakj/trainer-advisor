import { relations } from 'drizzle-orm';
import { trainers } from './trainers';
import { trainerGoogleTokens } from './trainer_google_tokens';
import { clients } from './clients';
import { calendarEvents } from './calendar_events';
import { attendanceRecords } from './attendance_records';
import { appSettings } from './app_settings';
import { session } from './session';
import { account } from './account';

// Drizzle relations — enable typed `with: { ... }` joins via the query API.
// FK constraints live on the table definitions; these are purely runtime
// metadata for the query builder.

export const trainersRelations = relations(trainers, ({ many, one }) => ({
  clients: many(clients),
  calendarEvents: many(calendarEvents),
  attendanceRecords: many(attendanceRecords),
  googleTokens: one(trainerGoogleTokens, {
    fields: [trainers.id],
    references: [trainerGoogleTokens.trainerId],
  }),
  settings: one(appSettings, {
    fields: [trainers.id],
    references: [appSettings.trainerId],
  }),
  sessions: many(session),
  accounts: many(account),
}));

export const trainerGoogleTokensRelations = relations(trainerGoogleTokens, ({ one }) => ({
  trainer: one(trainers, {
    fields: [trainerGoogleTokens.trainerId],
    references: [trainers.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  trainer: one(trainers, {
    fields: [clients.trainerId],
    references: [trainers.id],
  }),
  calendarEvents: many(calendarEvents),
  attendanceRecords: many(attendanceRecords),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  trainer: one(trainers, {
    fields: [calendarEvents.trainerId],
    references: [trainers.id],
  }),
  client: one(clients, {
    fields: [calendarEvents.clientId],
    references: [clients.id],
  }),
  attendanceRecord: one(attendanceRecords, {
    fields: [calendarEvents.id],
    references: [attendanceRecords.calendarEventId],
  }),
}));

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  trainer: one(trainers, {
    fields: [attendanceRecords.trainerId],
    references: [trainers.id],
  }),
  client: one(clients, {
    fields: [attendanceRecords.clientId],
    references: [clients.id],
  }),
  calendarEvent: one(calendarEvents, {
    fields: [attendanceRecords.calendarEventId],
    references: [calendarEvents.id],
  }),
}));

export const appSettingsRelations = relations(appSettings, ({ one }) => ({
  trainer: one(trainers, {
    fields: [appSettings.trainerId],
    references: [trainers.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  trainer: one(trainers, {
    fields: [session.userId],
    references: [trainers.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  trainer: one(trainers, {
    fields: [account.userId],
    references: [trainers.id],
  }),
}));
