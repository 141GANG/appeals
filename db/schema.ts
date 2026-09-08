import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const appeals = sqliteTable('appeals', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  nickname: text('nickname').notNull(),
  reason: text('reason').notNull(),
  status: text('status', { enum: ['pending', 'accepted', 'rejected'] }).notNull().default('pending'),
  createdAt: integer('created_at').notNull(),
  decision: text('decision'),
}, table => [index('idx_appeals_created_at').on(table.createdAt), uniqueIndex('idx_appeals_pending_user').on(table.userId).where(sql`${table.status} = 'pending'`)]);
