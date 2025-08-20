import { 
  type User, type InsertUser, type Portfolio, type InsertPortfolio,
  type Property, type InsertProperty, type GLAccount, type InsertGLAccount,
  type Note, type InsertNote, type ActionItem, type InsertActionItem,
  type ExcelFile, type InsertExcelFile
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Portfolios
  getAllPortfolios(): Promise<Portfolio[]>;
  getPortfolio(id: string): Promise<Portfolio | undefined>;
  getPortfolioByKey(key: string): Promise<Portfolio | undefined>;
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  updatePortfolio(id: string, portfolio: Partial<InsertPortfolio>): Promise<Portfolio | undefined>;

  // Properties
  getAllProperties(): Promise<Property[]>;
  getPropertiesByPortfolio(portfolioId: string): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  getPropertyByCode(code: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property | undefined>;

  // GL Accounts
  getGLAccountsByProperty(propertyId: string, month?: string): Promise<GLAccount[]>;
  getGLAccount(id: string): Promise<GLAccount | undefined>;
  createGLAccount(account: InsertGLAccount): Promise<GLAccount>;
  updateGLAccount(id: string, account: Partial<InsertGLAccount>): Promise<GLAccount | undefined>;
  deleteGLAccountsByProperty(propertyId: string): Promise<void>;

  // Notes
  getNotesByProperty(propertyId: string): Promise<Note[]>;
  getNote(id: string): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: string, note: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(id: string): Promise<boolean>;

  // Action Items
  getActionItemsByProperty(propertyId: string): Promise<ActionItem[]>;
  getAllActionItems(): Promise<ActionItem[]>;
  getActionItem(id: string): Promise<ActionItem | undefined>;
  createActionItem(item: InsertActionItem): Promise<ActionItem>;
  updateActionItem(id: string, item: Partial<InsertActionItem>): Promise<ActionItem | undefined>;
  deleteActionItem(id: string): Promise<boolean>;

  // Excel Files
  getAllExcelFiles(): Promise<ExcelFile[]>;
  getExcelFile(id: string): Promise<ExcelFile | undefined>;
  createExcelFile(file: InsertExcelFile): Promise<ExcelFile>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private portfolios: Map<string, Portfolio>;
  private properties: Map<string, Property>;
  private glAccounts: Map<string, GLAccount>;
  private notes: Map<string, Note>;
  private actionItems: Map<string, ActionItem>;
  private excelFiles: Map<string, ExcelFile>;

  constructor() {
    this.users = new Map();
    this.portfolios = new Map();
    this.properties = new Map();
    this.glAccounts = new Map();
    this.notes = new Map();
    this.actionItems = new Map();
    this.excelFiles = new Map();

    // Initialize with Hartford 1 data
    this.initializeData();
  }

  private async initializeData() {
    // Create Hartford 1 portfolio
    const hartfordPortfolio = await this.createPortfolio({
      name: "Hartford 1",
      key: "hartford1",
      totalUnits: 6,
      totalNOI: 85000,
      capRate: 12.2
    });

    // Create other portfolios
    await this.createPortfolio({
      name: "Consolidated",
      key: "all",
      totalUnits: 109,
      totalNOI: 985000,
      capRate: 9.6
    });

    await this.createPortfolio({
      name: "South End",
      key: "southend",
      totalUnits: 51,
      totalNOI: 450000,
      capRate: 12.1
    });

    await this.createPortfolio({
      name: "North End",
      key: "northend",
      totalUnits: 40,
      totalNOI: 385000,
      capRate: 11.8
    });

    await this.createPortfolio({
      name: "90 Park",
      key: "90park",
      totalUnits: 12,
      totalNOI: 125000,
      capRate: 8.9
    });

    // Create Hartford 1 property
    const property = await this.createProperty({
      code: "S0010",
      name: "228 Maple",
      portfolioId: hartfordPortfolio.id,
      units: 6,
      monthlyNOI: 6800,
      noiMargin: 64.8,
      occupancy: 94.5,
      revenuePerUnit: 1750,
      capRate: 12.2,
      dscr: 2.15
    });

    // Create GL accounts for Hartford 1
    const currentMonth = "2024-01";
    await this.createGLAccount({
      propertyId: property.id,
      code: "4105",
      description: "Rent Income",
      amount: 10200,
      type: "revenue",
      month: currentMonth
    });

    await this.createGLAccount({
      propertyId: property.id,
      code: "4110",
      description: "Section 8 Rent",
      amount: 300,
      type: "revenue",
      month: currentMonth
    });

    await this.createGLAccount({
      propertyId: property.id,
      code: "6105",
      description: "Property Management",
      amount: 630,
      type: "expense",
      month: currentMonth
    });

    await this.createGLAccount({
      propertyId: property.id,
      code: "6110",
      description: "Maintenance & Repairs",
      amount: 1850,
      type: "expense",
      month: currentMonth
    });

    await this.createGLAccount({
      propertyId: property.id,
      code: "6120",
      description: "Utilities",
      amount: 420,
      type: "expense",
      month: currentMonth
    });

    await this.createGLAccount({
      propertyId: property.id,
      code: "6130",
      description: "Property Insurance",
      amount: 285,
      type: "expense",
      month: currentMonth
    });

    await this.createGLAccount({
      propertyId: property.id,
      code: "6140",
      description: "Property Taxes",
      amount: 815,
      type: "expense",
      month: currentMonth
    });

    // Add sample action item
    await this.createActionItem({
      itemId: "AI-001",
      propertyId: property.id,
      description: "Investigate 146% increase in maintenance costs",
      priority: "HIGH",
      status: "OPEN"
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Portfolios
  async getAllPortfolios(): Promise<Portfolio[]> {
    return Array.from(this.portfolios.values());
  }

  async getPortfolio(id: string): Promise<Portfolio | undefined> {
    return this.portfolios.get(id);
  }

  async getPortfolioByKey(key: string): Promise<Portfolio | undefined> {
    return Array.from(this.portfolios.values()).find(p => p.key === key);
  }

  async createPortfolio(insertPortfolio: InsertPortfolio): Promise<Portfolio> {
    const id = randomUUID();
    const portfolio: Portfolio = { ...insertPortfolio, id };
    this.portfolios.set(id, portfolio);
    return portfolio;
  }

  async updatePortfolio(id: string, updates: Partial<InsertPortfolio>): Promise<Portfolio | undefined> {
    const portfolio = this.portfolios.get(id);
    if (!portfolio) return undefined;
    const updated = { ...portfolio, ...updates };
    this.portfolios.set(id, updated);
    return updated;
  }

  // Properties
  async getAllProperties(): Promise<Property[]> {
    return Array.from(this.properties.values());
  }

  async getPropertiesByPortfolio(portfolioId: string): Promise<Property[]> {
    return Array.from(this.properties.values()).filter(p => p.portfolioId === portfolioId);
  }

  async getProperty(id: string): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async getPropertyByCode(code: string): Promise<Property | undefined> {
    return Array.from(this.properties.values()).find(p => p.code === code);
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = randomUUID();
    const property: Property = { ...insertProperty, id };
    this.properties.set(id, property);
    return property;
  }

  async updateProperty(id: string, updates: Partial<InsertProperty>): Promise<Property | undefined> {
    const property = this.properties.get(id);
    if (!property) return undefined;
    const updated = { ...property, ...updates };
    this.properties.set(id, updated);
    return updated;
  }

  // GL Accounts
  async getGLAccountsByProperty(propertyId: string, month?: string): Promise<GLAccount[]> {
    return Array.from(this.glAccounts.values()).filter(acc => 
      acc.propertyId === propertyId && (!month || acc.month === month)
    );
  }

  async getGLAccount(id: string): Promise<GLAccount | undefined> {
    return this.glAccounts.get(id);
  }

  async createGLAccount(insertAccount: InsertGLAccount): Promise<GLAccount> {
    const id = randomUUID();
    const account: GLAccount = { ...insertAccount, id };
    this.glAccounts.set(id, account);
    return account;
  }

  async updateGLAccount(id: string, updates: Partial<InsertGLAccount>): Promise<GLAccount | undefined> {
    const account = this.glAccounts.get(id);
    if (!account) return undefined;
    const updated = { ...account, ...updates };
    this.glAccounts.set(id, updated);
    return updated;
  }

  async deleteGLAccountsByProperty(propertyId: string): Promise<void> {
    for (const [id, account] of this.glAccounts.entries()) {
      if (account.propertyId === propertyId) {
        this.glAccounts.delete(id);
      }
    }
  }

  // Notes
  async getNotesByProperty(propertyId: string): Promise<Note[]> {
    return Array.from(this.notes.values()).filter(n => n.propertyId === propertyId);
  }

  async getNote(id: string): Promise<Note | undefined> {
    return this.notes.get(id);
  }

  async createNote(insertNote: InsertNote): Promise<Note> {
    const id = randomUUID();
    const note: Note = { ...insertNote, id, createdAt: new Date() };
    this.notes.set(id, note);
    return note;
  }

  async updateNote(id: string, updates: Partial<InsertNote>): Promise<Note | undefined> {
    const note = this.notes.get(id);
    if (!note) return undefined;
    const updated = { ...note, ...updates };
    this.notes.set(id, updated);
    return updated;
  }

  async deleteNote(id: string): Promise<boolean> {
    return this.notes.delete(id);
  }

  // Action Items
  async getActionItemsByProperty(propertyId: string): Promise<ActionItem[]> {
    return Array.from(this.actionItems.values()).filter(item => item.propertyId === propertyId);
  }

  async getAllActionItems(): Promise<ActionItem[]> {
    return Array.from(this.actionItems.values());
  }

  async getActionItem(id: string): Promise<ActionItem | undefined> {
    return this.actionItems.get(id);
  }

  async createActionItem(insertItem: InsertActionItem): Promise<ActionItem> {
    const id = randomUUID();
    const item: ActionItem = { ...insertItem, id, createdAt: new Date() };
    this.actionItems.set(id, item);
    return item;
  }

  async updateActionItem(id: string, updates: Partial<InsertActionItem>): Promise<ActionItem | undefined> {
    const item = this.actionItems.get(id);
    if (!item) return undefined;
    const updated = { ...item, ...updates };
    this.actionItems.set(id, updated);
    return updated;
  }

  async deleteActionItem(id: string): Promise<boolean> {
    return this.actionItems.delete(id);
  }

  // Excel Files
  async getAllExcelFiles(): Promise<ExcelFile[]> {
    return Array.from(this.excelFiles.values());
  }

  async getExcelFile(id: string): Promise<ExcelFile | undefined> {
    return this.excelFiles.get(id);
  }

  async createExcelFile(insertFile: InsertExcelFile): Promise<ExcelFile> {
    const id = randomUUID();
    const file: ExcelFile = { ...insertFile, id, uploadedAt: new Date() };
    this.excelFiles.set(id, file);
    return file;
  }
}

export const storage = new MemStorage();
