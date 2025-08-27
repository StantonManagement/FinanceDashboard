import { 
  type User, type InsertUser, type Portfolio, type InsertPortfolio,
  type Property, type InsertProperty, type GLAccount, type InsertGLAccount,
  type Note, type InsertNote, type ActionItem, type InsertActionItem,
  type ExcelFile, type InsertExcelFile, type CellComment, type InsertCellComment
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

  // Cell Comments
  getCellCommentsByProperty(propertyId: string): Promise<CellComment[]>;
  getCellCommentsByType(commentType: string): Promise<CellComment[]>;
  getAllCellComments(): Promise<CellComment[]>;
  getCellComment(id: string): Promise<CellComment | undefined>;
  createCellComment(comment: InsertCellComment): Promise<CellComment>;
  updateCellComment(id: string, comment: Partial<InsertCellComment>): Promise<CellComment | undefined>;
  deleteCellComment(id: string): Promise<boolean>;
  getNextCommentNumber(propertyCode: string): Promise<string>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private portfolios: Map<string, Portfolio>;
  private properties: Map<string, Property>;
  private glAccounts: Map<string, GLAccount>;
  private notes: Map<string, Note>;
  private actionItems: Map<string, ActionItem>;
  private excelFiles: Map<string, ExcelFile>;
  private cellComments: Map<string, CellComment>;

  constructor() {
    this.users = new Map();
    this.portfolios = new Map();
    this.properties = new Map();
    this.glAccounts = new Map();
    this.notes = new Map();
    this.actionItems = new Map();
    this.excelFiles = new Map();
    this.cellComments = new Map();

    // Initialize with Hartford 1 data
    this.initializeData();
  }

  private async initializeData() {
    // Create Hartford 1 portfolio (based on Excel data)
    const hartfordPortfolio = await this.createPortfolio({
      name: "Hartford 1",
      key: "hartford1",
      totalUnits: 10,
      totalNOI: 27640, // $2,303.30 * 12 months
      capRate: 12.0
    });

    // Create other portfolios
    const consolidatedPortfolio = await this.createPortfolio({
      name: "Consolidated",
      key: "all",
      totalUnits: 109,
      totalNOI: 985000,
      capRate: 9.6
    });

    const southEndPortfolio = await this.createPortfolio({
      name: "South End",
      key: "southend",
      totalUnits: 51,
      totalNOI: 450000,
      capRate: 12.1
    });

    const northEndPortfolio = await this.createPortfolio({
      name: "North End",
      key: "northend",
      totalUnits: 40,
      totalNOI: 385000,
      capRate: 11.8
    });

    const parkPortfolio = await this.createPortfolio({
      name: "90 Park",
      key: "90park",
      totalUnits: 12,
      totalNOI: 125000,
      capRate: 8.9
    });

    // Create Hartford 1 properties (based on Excel data)
    const hartfordProperty1 = await this.createProperty({
      code: "S0010",
      name: "228 Maple",
      portfolioId: hartfordPortfolio.id,
      units: 10,
      monthlyNOI: 2303, // From Excel: $2,303.30
      noiMargin: 97.9, // ($2,303 / $2,352) * 100 
      occupancy: 100.0, // Assuming full occupancy based on rent received
      revenuePerUnit: 235, // $2,352 / 10 units
      capRate: 12.2,
      dscr: 2.15
    });


    // Create South End properties
    const southProperty1 = await this.createProperty({
      code: "S0020",
      name: "150 Union Street",
      portfolioId: southEndPortfolio.id,
      units: 24,
      monthlyNOI: 18500,
      noiMargin: 68.2,
      occupancy: 96.8,
      revenuePerUnit: 1850,
      capRate: 11.8,
      dscr: 1.95
    });

    const southProperty2 = await this.createProperty({
      code: "S0021",
      name: "425 Broadway",
      portfolioId: southEndPortfolio.id,
      units: 27,
      monthlyNOI: 19200,
      noiMargin: 71.5,
      occupancy: 98.2,
      revenuePerUnit: 1920,
      capRate: 12.4,
      dscr: 2.08
    });

    // Create North End properties
    const northProperty1 = await this.createProperty({
      code: "N0030",
      name: "88 Salem Street",
      portfolioId: northEndPortfolio.id,
      units: 18,
      monthlyNOI: 14800,
      noiMargin: 65.4,
      occupancy: 94.1,
      revenuePerUnit: 1680,
      capRate: 11.2,
      dscr: 1.88
    });

    const northProperty2 = await this.createProperty({
      code: "N0031",
      name: "205 Hanover Street",
      portfolioId: northEndPortfolio.id,
      units: 22,
      monthlyNOI: 17600,
      noiMargin: 69.8,
      occupancy: 97.5,
      revenuePerUnit: 1780,
      capRate: 12.0,
      dscr: 2.12
    });

    // Create 90 Park property
    const parkProperty = await this.createProperty({
      code: "P0040",
      name: "90 Park Street",
      portfolioId: parkPortfolio.id,
      units: 12,
      monthlyNOI: 9800,
      noiMargin: 58.2,
      occupancy: 91.7,
      revenuePerUnit: 1580,
      capRate: 8.9,
      dscr: 1.65
    });

    // NOTE: GL accounts and action items will be populated from uploaded Excel data
    // No mock/sample data created here - dashboard will show empty until Excel upload
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

  // Cell Comments
  async getCellCommentsByProperty(propertyId: string): Promise<CellComment[]> {
    return Array.from(this.cellComments.values()).filter(comment => comment.propertyId === propertyId);
  }

  async getCellCommentsByType(commentType: string): Promise<CellComment[]> {
    return Array.from(this.cellComments.values()).filter(comment => comment.commentType === commentType);
  }

  async getAllCellComments(): Promise<CellComment[]> {
    return Array.from(this.cellComments.values());
  }

  async getCellComment(id: string): Promise<CellComment | undefined> {
    return this.cellComments.get(id);
  }

  async createCellComment(insertComment: InsertCellComment): Promise<CellComment> {
    const id = randomUUID();
    const comment: CellComment = { 
      ...insertComment, 
      id, 
      createdAt: new Date(),
      completedAt: insertComment.status === 'COMPLETED' ? new Date() : null
    };
    this.cellComments.set(id, comment);
    return comment;
  }

  async updateCellComment(id: string, updates: Partial<InsertCellComment>): Promise<CellComment | undefined> {
    const comment = this.cellComments.get(id);
    if (!comment) return undefined;
    
    const updated: CellComment = { 
      ...comment, 
      ...updates,
      completedAt: updates.status === 'COMPLETED' && comment.status !== 'COMPLETED' ? new Date() : comment.completedAt
    };
    this.cellComments.set(id, updated);
    return updated;
  }

  async deleteCellComment(id: string): Promise<boolean> {
    return this.cellComments.delete(id);
  }

  async getNextCommentNumber(propertyCode: string): Promise<string> {
    const propertyComments = Array.from(this.cellComments.values())
      .filter(comment => comment.commentNumber.startsWith(propertyCode))
      .map(comment => comment.commentNumber)
      .sort();
    
    const lastNumber = propertyComments.length > 0 
      ? parseInt(propertyComments[propertyComments.length - 1].split('-')[1]) || 0
      : 0;
    
    return `${propertyCode}-${String(lastNumber + 1).padStart(3, '0')}`;
  }
}

export const storage = new MemStorage();
