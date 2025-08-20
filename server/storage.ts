import { Property, GlAccount, Note, ActionItem, InsertProperty, InsertGlAccount, InsertNote, InsertActionItem } from '@shared/schema';

export interface IStorage {
  // Properties
  getProperties(): Promise<Property[]>;
  getProperty(id: string): Promise<Property | null>;
  createProperty(property: InsertProperty): Promise<Property>;
  
  // GL Accounts
  getGlAccountsByProperty(propertyId: string): Promise<GlAccount[]>;
  createGlAccount(glAccount: InsertGlAccount): Promise<GlAccount>;
  
  // Notes
  getNotesByProperty(propertyId: string): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  
  // Action Items
  getActionItems(): Promise<ActionItem[]>;
  createActionItem(actionItem: InsertActionItem): Promise<ActionItem>;
}

export class MemStorage implements IStorage {
  private properties: Property[] = [
    {
      id: 'S0010',
      name: '228 Maple',
      portfolio: 'Hartford 1',
      units: 6,
      avgRent: '1700.00',
      occupancy: '96.70',
      opexPerUnit: '425.00',
      monthlyNoi: '7080.00'
    }
  ];

  private glAccounts: GlAccount[] = [
    {
      id: 'gl_4105_S0010',
      propertyId: 'S0010',
      accountNumber: '4105',
      description: 'Rent Income',
      amount: '10200.00',
      type: 'revenue',
      category: 'Income'
    },
    {
      id: 'gl_6110_S0010',
      propertyId: 'S0010',
      accountNumber: '6110',
      description: 'Maintenance & Repairs',
      amount: '-1850.00',
      type: 'expense',
      category: 'Maintenance'
    },
    {
      id: 'gl_6120_S0010',
      propertyId: 'S0010',
      accountNumber: '6120',
      description: 'Utilities - Water/Sewer',
      amount: '-485.00',
      type: 'expense',
      category: 'Utilities'
    },
    {
      id: 'gl_6130_S0010',
      propertyId: 'S0010',
      accountNumber: '6130',
      description: 'Property Insurance',
      amount: '-320.00',
      type: 'expense',
      category: 'Insurance'
    },
    {
      id: 'gl_6140_S0010',
      propertyId: 'S0010',
      accountNumber: '6140',
      description: 'Property Management Fee',
      amount: '-510.00',
      type: 'expense',
      category: 'Management'
    }
  ];

  private notes: Note[] = [];
  private actionItems: ActionItem[] = [];

  async getProperties(): Promise<Property[]> {
    return this.properties;
  }

  async getProperty(id: string): Promise<Property | null> {
    return this.properties.find(p => p.id === id) || null;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const newProperty: Property = {
      ...property,
      id: property.id || `S${Date.now()}`
    };
    this.properties.push(newProperty);
    return newProperty;
  }

  async getGlAccountsByProperty(propertyId: string): Promise<GlAccount[]> {
    return this.glAccounts.filter(gl => gl.propertyId === propertyId);
  }

  async createGlAccount(glAccount: InsertGlAccount): Promise<GlAccount> {
    const newGlAccount: GlAccount = {
      ...glAccount,
      id: glAccount.id || `gl_${Date.now()}`
    };
    this.glAccounts.push(newGlAccount);
    return newGlAccount;
  }

  async getNotesByProperty(propertyId: string): Promise<Note[]> {
    return this.notes.filter(note => note.propertyId === propertyId);
  }

  async createNote(note: InsertNote): Promise<Note> {
    const newNote: Note = {
      ...note,
      id: note.id || `note_${Date.now()}`,
      createdAt: new Date()
    };
    this.notes.push(newNote);
    return newNote;
  }

  async getActionItems(): Promise<ActionItem[]> {
    return this.actionItems;
  }

  async createActionItem(actionItem: InsertActionItem): Promise<ActionItem> {
    const newActionItem: ActionItem = {
      ...actionItem,
      id: actionItem.id || `ai_${Date.now()}`,
      createdAt: new Date()
    };
    this.actionItems.push(newActionItem);
    return newActionItem;
  }
}