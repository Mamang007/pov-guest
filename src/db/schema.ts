import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const hosts = pgTable('hosts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  hostId: uuid('host_id').references(() => hosts.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  presetFilter: varchar('preset_filter', { length: 50 }).default('none').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const photos = pgTable('photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').references(() => rooms.id).notNull(),
  guestName: varchar('guest_name', { length: 100 }).notNull(),
  imageUrl: text('image_url').notNull(),
  filterApplied: varchar('filter_applied', { length: 50 }).default('none').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Relations definitions
export const hostsRelations = relations(hosts, ({ many }) => ({
  rooms: many(rooms),
}))

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  host: one(hosts, {
    fields: [rooms.hostId],
    references: [hosts.id],
  }),
  photos: many(photos),
}))

export const photosRelations = relations(photos, ({ one }) => ({
  room: one(rooms, {
    fields: [photos.roomId],
    references: [rooms.id],
  }),
}))
