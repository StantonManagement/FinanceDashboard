import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  totalUnits: integer("total_units").notNull().default(0),
  totalNOI: real("total_noi").notNull().default(0),
  capRate: real("cap_rate").notNull().default(0),
});

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // e.g., "S0010"
  name: text("name").notNull(), // e.g., "228 Maple"
  portfolioId: varchar("portfolio_id").references(() => portfolios.id).notNull(),
  units: integer("units").notNull().default(0),
  monthlyNOI: real("monthly_noi").notNull().default(0),
  noiMargin: real("noi_margin").notNull().default(0),
  occupancy: real("occupancy").notNull().default(0),
  revenuePerUnit: real("revenue_per_unit").notNull().default(0),
  capRate: real("cap_rate").notNull().default(0),
  dscr: real("dscr").notNull().default(0),
});

export const glAccounts = pgTable("gl_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  code: text("code").notNull(), // e.g., "4105"
  description: text("description").notNull(),
  amount: real("amount").notNull().default(0),
  type: text("type").notNull(), // "revenue" or "expense"
  month: text("month").notNull(), // e.g., "2024-01"
});

export const cellComments = pgTable("cell_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commentNumber: text("comment_number").notNull(), // e.g., "S0010-001"
  commentType: text("comment_type").notNull(), // "ACCOUNTING" | "PROPERTY_MANAGEMENT" | "EXTERNAL"
  cellReference: text("cell_reference").notNull(), // e.g., "Balance Sheet > DSCR > Current Ratio"
  cellValue: text("cell_value").notNull(), // The actual data value when commented
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  tabSection: text("tab_section").notNull(), // "Balance Sheet", "T12 Performance", etc.
  noteText: text("note_text").notNull(),
  actionRequired: boolean("action_required").notNull().default(false),
  priority: text("priority").notNull().default("MEDIUM"), // HIGH, MEDIUM, LOW
  status: text("status").notNull().default("OPEN"), // OPEN, IN_PROGRESS, COMPLETED
  completionNote: text("completion_note"), // For accounting completion comments
  author: text("author").notNull().default("User"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  completedAt: timestamp("completed_at"),
});

export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cellId: text("cell_id").notNull(), // e.g., "gl-4105"
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  text: text("text").notNull(),
  author: text("author").notNull().default("User"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const actionItems = pgTable("action_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: text("item_id").notNull(), // e.g., "AI-001"
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("MEDIUM"), // HIGH, MEDIUM, LOW
  status: text("status").notNull().default("OPEN"), // OPEN, IN_PROGRESS, CLOSED
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const excelFiles = pgTable("excel_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().default(sql`now()`),
  processedData: jsonb("processed_data"), // Store processed Excel data
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPortfolioSchema = createInsertSchema(portfolios).omit({
  id: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
});

export const insertGLAccountSchema = createInsertSchema(glAccounts).omit({
  id: true,
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
});

export const insertActionItemSchema = createInsertSchema(actionItems).omit({
  id: true,
  createdAt: true,
});

export const insertExcelFileSchema = createInsertSchema(excelFiles).omit({
  id: true,
  uploadedAt: true,
});

export const insertCellCommentSchema = createInsertSchema(cellComments).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Portfolio = typeof portfolios.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export type GLAccount = typeof glAccounts.$inferSelect;
export type InsertGLAccount = z.infer<typeof insertGLAccountSchema>;

export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;

export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = z.infer<typeof insertActionItemSchema>;

export type ExcelFile = typeof excelFiles.$inferSelect;
export type InsertExcelFile = z.infer<typeof insertExcelFileSchema>;

export type CellComment = typeof cellComments.$inferSelect;
export type InsertCellComment = z.infer<typeof insertCellCommentSchema>;

// AppFolio API Types - Shared across client and server
export interface AppfolioT12Item {
  AccountName: string;
  AccountCode: string | null;
  SliceTotal: string;
  Slice00?: string;
  Slice01?: string;
  Slice02?: string;
  Slice03?: string;
  Slice04?: string;
  Slice05?: string;
  Slice06?: string;
  Slice07?: string;
  Slice08?: string;
  Slice09?: string;
  Slice10?: string;
  Slice11?: string;
}

export interface ProcessedT12Data {
  months: string[]; // Month names like "Jan 2025", "Feb 2025"
  accounts: {
    accountCode: string;
    accountName: string;
    monthlyAmounts: number[]; // 12 monthly amounts
    total: number;
    isRevenue: boolean;
  }[];
  totals: {
    revenue: number[]; // Monthly revenue totals
    expenses: number[]; // Monthly expense totals
    netIncome: number[]; // Monthly net income
  };
  rawData: AppfolioT12Item[];
}

export interface AppfolioBalanceSheetItem {
  AccountName: string;
  AccountNumber: string;
  Balance: string;
  [key: string]: any;
}

export interface ProcessedBalanceSheetData {
  assets: {
    current: AppfolioBalanceSheetItem[];
    fixed: AppfolioBalanceSheetItem[];
    total: number;
  };
  liabilities: {
    current: AppfolioBalanceSheetItem[];
    longTerm: AppfolioBalanceSheetItem[];
    total: number;
  };
  equity: {
    items: AppfolioBalanceSheetItem[];
    total: number;
  };
  rawData: AppfolioBalanceSheetItem[];
}

export interface AppfolioCashFlowItem {
  AccountName: string;
  AccountCode: string;
  SelectedPeriod: string;
  SelectedPeriodPercent: string;
  FiscalYearToDate: string;
  FiscalYearToDatePercent: string;
  CashFlowAmount?: number;
  CashFlowType?: 'IN' | 'OUT';
  [key: string]: any;
}

export interface ProcessedCashFlowData {
  operatingActivities: {
    items: AppfolioCashFlowItem[];
    total: number;
  };
  investingActivities: {
    items: AppfolioCashFlowItem[];
    total: number;
  };
  financingActivities: {
    items: AppfolioCashFlowItem[];
    total: number;
  };
  netCashFlow: number;
  cashAtBeginning: number;
  cashAtEnd: number;
  rawData: AppfolioCashFlowItem[];
}
