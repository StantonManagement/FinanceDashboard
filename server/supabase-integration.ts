import { SUPABASE_QUERIES } from "./supabase-service";

const SUPABASE_PROJECT_ID = 'wkwmxxlfheywwbgdbzxe';

// Real MCP server interface for Supabase
interface MCPSupabaseClient {
  execute_sql(projectId: string, query: string): Promise<any[]>;
}

// MCP client that makes actual calls (Note: This would need to be integrated with the actual MCP system)
const mcpClient: MCPSupabaseClient = {
  async execute_sql(projectId: string, query: string): Promise<any[]> {
    try {
      // In a real implementation, this would call the MCP server
      // For now, we'll provide mock data that represents what would come from Supabase
      console.log(`Executing SQL on ${projectId}:`, query);
    
    // Return mock data based on query type
    if (query.includes('AF_RentRoll') && query.includes('DISTINCT')) {
      // Properties query
      return [
        {
          PropertyId: 142,
          PropertyName: "S0020 - 31 Park",
          PropertyAddress: "31-33 Park St Hartford, CT 06106",
          PropertyStreet1: "31-33 Park St",
          PropertyCity: "Hartford",
          PropertyState: "CT",
          PropertyZip: "06106",
          PropertyType: "Residential"
        },
        {
          PropertyId: 22,
          PropertyName: "S0006 - 15 Whit",
          PropertyAddress: "15-17 Whitmore Street Hartford, CT 06114",
          PropertyStreet1: "15-17 Whitmore Street",
          PropertyCity: "Hartford", 
          PropertyState: "CT",
          PropertyZip: "06114",
          PropertyType: "Residential"
        },
        {
          PropertyId: 145,
          PropertyName: "S0024 - 10 Wolcott",
          PropertyAddress: "10 Wolcott St Hartford, CT 06106",
          PropertyStreet1: "10 Wolcott St",
          PropertyCity: "Hartford",
          PropertyState: "CT", 
          PropertyZip: "06106",
          PropertyType: "Residential"
        }
      ];
    } 
    
    if (query.includes('AF_RentRoll') && !query.includes('DISTINCT')) {
      // Rent roll for specific property
      return [
        {
          PropertyId: 142,
          PropertyName: "S0020 - 31 Park",
          PropertyAddress: "31-33 Park St Hartford, CT 06106",
          Unit: "1A",
          UnitType: "2BR/1BA", 
          Tenant: "John Smith",
          Status: "Occupied",
          Rent: 1200,
          MarketRent: 1250,
          SquareFt: 850,
          LeaseFrom: "2024-01-01",
          LeaseTo: "2024-12-31",
          MoveIn: "2024-01-01",
          MoveOut: null,
          PastDue: 0
        },
        {
          PropertyId: 142,
          PropertyName: "S0020 - 31 Park", 
          PropertyAddress: "31-33 Park St Hartford, CT 06106",
          Unit: "2A",
          UnitType: "1BR/1BA",
          Tenant: "Jane Doe", 
          Status: "Occupied",
          Rent: 950,
          MarketRent: 1000,
          SquareFt: 650,
          LeaseFrom: "2024-03-01",
          LeaseTo: "2025-02-28", 
          MoveIn: "2024-03-01",
          MoveOut: null,
          PastDue: 150
        }
      ];
    }

    if (query.includes('AF_GeneralLedger')) {
      // GL transactions
      return [
        {
          PropertyId: 142,
          PropertyName: "S0020 - 31 Park",
          GlAccountName: "Rent Income",
          PostDate: "2024-01-01",
          Month: "January",
          Year: 2024,
          Type: "Revenue", 
          Amount: 2150,
          Description: "Monthly rent collection"
        },
        {
          PropertyId: 142,
          PropertyName: "S0020 - 31 Park",
          GlAccountName: "Property Management",
          PostDate: "2024-01-01", 
          Month: "January",
          Year: 2024,
          Type: "Expense",
          Amount: 129,
          Description: "Management fee"
        }
      ];
    }

    return [];
  }
};

// Service functions that use the MCP client
export class SupabaseIntegration {
  
  static async getProperties() {
    try {
      const result = await mcpClient.execute_sql(SUPABASE_PROJECT_ID, SUPABASE_QUERIES.GET_PROPERTIES);
      return result;
    } catch (error) {
      console.error('Error fetching properties:', error);
      throw new Error('Failed to fetch properties from Supabase');
    }
  }

  static async getRentRollByProperty(propertyId: number) {
    try {
      const query = SUPABASE_QUERIES.GET_RENT_ROLL(propertyId);
      const result = await mcpClient.execute_sql(SUPABASE_PROJECT_ID, query);
      return result;
    } catch (error) {
      console.error('Error fetching rent roll:', error);
      throw new Error('Failed to fetch rent roll from Supabase');
    }
  }

  static async getGLTransactionsByProperty(propertyId: number, year: number = 2024) {
    try {
      const query = SUPABASE_QUERIES.GET_GL_TRANSACTIONS(propertyId, year);
      const result = await mcpClient.execute_sql(SUPABASE_PROJECT_ID, query);
      return result;
    } catch (error) {
      console.error('Error fetching GL transactions:', error);
      throw new Error('Failed to fetch GL transactions from Supabase');
    }
  }

  static async getPropertyFinancials(propertyId: number, year: number = 2024) {
    try {
      // Get GL transactions for the property
      const transactions = await this.getGLTransactionsByProperty(propertyId, year);
      
      // Calculate totals
      let totalRevenue = 0;
      let totalExpenses = 0;
      
      transactions.forEach(transaction => {
        if (transaction.Type === 'Revenue') {
          totalRevenue += transaction.Amount;
        } else if (transaction.Type === 'Expense') {
          totalExpenses += transaction.Amount;
        }
      });

      // Get rent roll to calculate occupancy and units
      const rentRoll = await this.getRentRollByProperty(propertyId);
      const occupiedUnits = rentRoll.filter(unit => unit.Status === 'Occupied').length;
      const totalUnits = rentRoll.length;
      const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
      const revenuePerUnit = totalUnits > 0 ? totalRevenue / totalUnits : 0;

      return {
        propertyId,
        propertyName: transactions.length > 0 ? transactions[0].PropertyName : `Property ${propertyId}`,
        totalRevenue,
        totalExpenses,
        netOperatingIncome: totalRevenue - totalExpenses,
        occupancyRate,
        units: totalUnits,
        revenuePerUnit
      };
    } catch (error) {
      console.error('Error calculating property financials:', error);
      throw new Error('Failed to calculate property financials');
    }
  }

  static async getPortfolioSummary() {
    try {
      const properties = await this.getProperties();
      
      let totalRevenue = 0;
      let totalExpenses = 0;
      let totalUnits = 0;
      let totalOccupiedUnits = 0;

      // Calculate totals across all properties
      for (const property of properties) {
        const financials = await this.getPropertyFinancials(property.PropertyId);
        totalRevenue += financials.totalRevenue;
        totalExpenses += financials.totalExpenses;
        totalUnits += financials.units;
        totalOccupiedUnits += Math.round((financials.occupancyRate / 100) * financials.units);
      }

      const averageOccupancy = totalUnits > 0 ? (totalOccupiedUnits / totalUnits) * 100 : 0;

      return {
        totalProperties: properties.length,
        totalUnits,
        totalRevenue,
        totalExpenses,
        totalNOI: totalRevenue - totalExpenses,
        averageOccupancy
      };
    } catch (error) {
      console.error('Error calculating portfolio summary:', error);
      throw new Error('Failed to calculate portfolio summary');
    }
  }
}

// In production, replace mockMCPClient with actual MCP server calls like:
/*
const actualMCPClient = {
  async execute_sql(projectId: string, query: string) {
    // Use the actual MCP server function
    return await mcp_supabase_execute_sql({ project_id: projectId, query });
  }
};
*/