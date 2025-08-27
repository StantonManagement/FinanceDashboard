import { createClient } from '@supabase/supabase-js';

const SUPABASE_PROJECT_ID = 'wkwmxxlfheywwbgdbzxe'; // Invoices project
let supabaseClient: any = null;

// Initialize Supabase client when needed
const getSupabaseClient = () => {
  if (!supabaseClient) {
    // We'll use the MCP server instead of direct client
    // This service will coordinate with the MCP calls
    return null;
  }
  return supabaseClient;
};

export interface AppFolioProperty {
  PropertyId: number;
  PropertyName: string;
  PropertyAddress: string;
  PropertyStreet1: string;
  PropertyCity: string;
  PropertyState: string;
  PropertyZip: string;
  PropertyType: string;
  PortfolioId?: string;
}

export interface AppFolioRentRoll {
  PropertyId: number;
  PropertyName: string;
  PropertyAddress: string;
  Unit: string;
  UnitType: string;
  Tenant: string;
  Status: string;
  Rent: number;
  MarketRent: number;
  SquareFt: number;
  Occupancy: string;
  LeaseFrom: string;
  LeaseTo: string;
  MoveIn: string;
  MoveOut: string;
  PastDue: number;
}

export interface AppFolioGLTransaction {
  PropertyId: number;
  PropertyName: string;
  GlAccountName: string;
  PostDate: string;
  Month: string;
  Year: number;
  Type: string;
  Amount: number;
  Description: string;
}

export interface PropertyFinancials {
  propertyId: number;
  propertyName: string;
  totalRevenue: number;
  totalExpenses: number;
  netOperatingIncome: number;
  occupancyRate: number;
  units: number;
  revenuePerUnit: number;
}

// Service functions that will use MCP server calls
export class SupabaseService {
  
  // Get all unique properties from AppFolio data
  static async getProperties(): Promise<AppFolioProperty[]> {
    // This will be called via MCP server in the route handler
    throw new Error('Use MCP server calls in route handlers');
  }

  // Get rent roll data for a specific property
  static async getRentRollByProperty(propertyId: number): Promise<AppFolioRentRoll[]> {
    throw new Error('Use MCP server calls in route handlers');
  }

  // Get general ledger transactions for property analysis
  static async getGLTransactionsByProperty(propertyId: number, year: number = 2024): Promise<AppFolioGLTransaction[]> {
    throw new Error('Use MCP server calls in route handlers');
  }

  // Calculate financial metrics for a property
  static async getPropertyFinancials(propertyId: number, year: number = 2024): Promise<PropertyFinancials> {
    throw new Error('Use MCP server calls in route handlers');
  }

  // Get portfolio summary
  static async getPortfolioSummary(): Promise<{
    totalProperties: number;
    totalUnits: number;
    totalRevenue: number;
    totalExpenses: number;
    totalNOI: number;
    averageOccupancy: number;
  }> {
    throw new Error('Use MCP server calls in route handlers');
  }
}

// Query templates for reuse in route handlers
export const SUPABASE_QUERIES = {
  // Get all unique properties
  GET_PROPERTIES: `
    SELECT DISTINCT 
      "PropertyId", 
      "PropertyName", 
      "PropertyAddress",
      "PropertyStreet1",
      "PropertyCity", 
      "PropertyState",
      "PropertyZip",
      "PropertyType",
      "PortfolioId"
    FROM "AF_RentRoll" 
    WHERE "PropertyId" IS NOT NULL 
    ORDER BY "PropertyName"
  `,

  // Get rent roll for specific property
  GET_RENT_ROLL: (propertyId: number) => `
    SELECT 
      "PropertyId",
      "PropertyName",
      "PropertyAddress", 
      "Unit",
      "UnitType",
      "Tenant",
      "Status",
      "Rent",
      "MarketRent", 
      "SquareFt",
      "LeaseFrom",
      "LeaseTo",
      "MoveIn",
      "MoveOut",
      "PastDue"
    FROM "AF_RentRoll"
    WHERE "PropertyId" = ${propertyId}
    ORDER BY "Unit"
  `,

  // Get GL transactions for property
  GET_GL_TRANSACTIONS: (propertyId: number, year: number = 2024) => `
    SELECT 
      "PropertyId",
      "PropertyName",
      "GlAccountName",
      "PostDate",
      "Month", 
      "Year",
      "Type",
      "Amount",
      "Description"
    FROM "AF_GeneralLedger" 
    WHERE "PropertyId" = ${propertyId} 
    AND "Year" = ${year}
    ORDER BY "PostDate", "GlAccountName"
  `,

  // Get financial summary for property  
  GET_PROPERTY_FINANCIALS: (propertyId: number, year: number = 2024) => `
    WITH revenue AS (
      SELECT 
        "PropertyId",
        SUM(CASE WHEN "Type" = 'Revenue' THEN "Amount" ELSE 0 END) as total_revenue
      FROM "AF_GeneralLedger"
      WHERE "PropertyId" = ${propertyId} AND "Year" = ${year}
      GROUP BY "PropertyId"
    ),
    expenses AS (
      SELECT 
        "PropertyId", 
        SUM(CASE WHEN "Type" = 'Expense' THEN "Amount" ELSE 0 END) as total_expenses
      FROM "AF_GeneralLedger"
      WHERE "PropertyId" = ${propertyId} AND "Year" = ${year}  
      GROUP BY "PropertyId"
    ),
    units AS (
      SELECT 
        "PropertyId",
        COUNT(DISTINCT "Unit") as unit_count,
        AVG(CASE WHEN "Status" = 'Occupied' THEN 1.0 ELSE 0.0 END) as occupancy_rate
      FROM "AF_RentRoll" 
      WHERE "PropertyId" = ${propertyId}
      GROUP BY "PropertyId"
    )
    SELECT 
      r."PropertyId",
      p."PropertyName",
      COALESCE(r.total_revenue, 0) as total_revenue,
      COALESCE(e.total_expenses, 0) as total_expenses,
      COALESCE(r.total_revenue, 0) - COALESCE(e.total_expenses, 0) as net_operating_income,
      COALESCE(u.occupancy_rate, 0) * 100 as occupancy_rate,
      COALESCE(u.unit_count, 0) as units,
      CASE WHEN u.unit_count > 0 THEN COALESCE(r.total_revenue, 0) / u.unit_count ELSE 0 END as revenue_per_unit
    FROM revenue r
    LEFT JOIN expenses e ON r."PropertyId" = e."PropertyId"
    LEFT JOIN units u ON r."PropertyId" = u."PropertyId"
    LEFT JOIN (SELECT DISTINCT "PropertyId", "PropertyName" FROM "AF_RentRoll") p ON r."PropertyId" = p."PropertyId"
  `,

  // Get portfolio overview
  GET_PORTFOLIO_SUMMARY: `
    WITH revenue AS (
      SELECT SUM(CASE WHEN "Type" = 'Revenue' THEN "Amount" ELSE 0 END) as total_revenue
      FROM "AF_GeneralLedger" WHERE "Year" = 2024
    ),
    expenses AS (
      SELECT SUM(CASE WHEN "Type" = 'Expense' THEN "Amount" ELSE 0 END) as total_expenses  
      FROM "AF_GeneralLedger" WHERE "Year" = 2024
    ),
    properties AS (
      SELECT COUNT(DISTINCT "PropertyId") as total_properties FROM "AF_RentRoll"
    ),
    units AS (
      SELECT 
        COUNT(DISTINCT CONCAT("PropertyId", '-', "Unit")) as total_units,
        AVG(CASE WHEN "Status" = 'Occupied' THEN 1.0 ELSE 0.0 END) as avg_occupancy
      FROM "AF_RentRoll"
    )
    SELECT 
      p.total_properties,
      u.total_units,
      r.total_revenue,
      e.total_expenses,
      r.total_revenue - e.total_expenses as total_noi,
      u.avg_occupancy * 100 as average_occupancy
    FROM revenue r, expenses e, properties p, units u
  `
};