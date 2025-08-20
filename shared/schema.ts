import { pgTable, text, integer, decimal, timestamp, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Property table
export const properties = pgTable('properties', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  portfolio: text('portfolio').notNull(),
  units: integer('units').notNull(),
  avgRent: decimal('avg_rent', { precision: 10, scale: 2 }),
  occupancy: decimal('occupancy', { precision: 5, scale: 2 }),
  opexPerUnit: decimal('opex_per_unit', { precision: 10, scale: 2 }),
  monthlyNoi: decimal('monthly_noi', { precision: 10, scale: 2 }),
});

// GL Accounts table
export const glAccounts = pgTable('gl_accounts', {
  id: text('id').primaryKey(),
  propertyId: text('property_id').notNull(),
  accountNumber: text('account_number').notNull(),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  type: text('type').notNull(), // 'revenue' | 'expense'
  category: text('category'),
});

// Notes table
export const notes = pgTable('notes', {
  id: text('id').primaryKey(),
  propertyId: text('property_id').notNull(),
  glAccountId: text('gl_account_id'),
  cellId: text('cell_id').notNull(),
  noteText: text('note_text').notNull(),
  author: text('author').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Action Items table
export const actionItems = pgTable('action_items', {
  id: text('id').primaryKey(),
  propertyId: text('property_id').notNull(),
  description: text('description').notNull(),
  priority: text('priority').notNull(), // 'HIGH' | 'MEDIUM' | 'LOW'
  status: text('status').notNull(), // 'OPEN' | 'IN_PROGRESS' | 'COMPLETED'
  createdAt: timestamp('created_at').defaultNow(),
});

// Insert schemas
export const insertPropertySchema = createInsertSchema(properties);
export const insertGlAccountSchema = createInsertSchema(glAccounts);
export const insertNoteSchema = createInsertSchema(notes);
export const insertActionItemSchema = createInsertSchema(actionItems);

// Types
export type Property = typeof properties.$inferSelect;
export type GlAccount = typeof glAccounts.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type ActionItem = typeof actionItems.$inferSelect;

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type InsertGlAccount = z.infer<typeof insertGlAccountSchema>;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type InsertActionItem = z.infer<typeof insertActionItemSchema>;