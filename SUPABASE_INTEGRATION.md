# Supabase Integration for Hartford Dashboard

## Overview

This implementation integrates Supabase AppFolio data with the Hartford Dashboard, replacing Excel-based data sources with real-time database queries.

## Key Components

### 1. Backend Services

#### `server/supabase-service.ts`
- Contains SQL query templates for AppFolio data
- Defines interfaces for AppFolio data structures
- Query templates for properties, rent roll, GL transactions, and financial summaries

#### `server/supabase-integration.ts`  
- Service layer that executes Supabase queries
- Currently uses mock data for development
- **TODO**: Replace with actual MCP server calls using the `mcp__supabase-community-supabase-mcp__execute_sql` function

#### `server/routes.ts` (Updated)
- Added new API endpoints under `/api/supabase/`
  - `GET /api/supabase/properties` - List all properties from AppFolio
  - `GET /api/supabase/properties/:propertyId/financials` - Property financial summary  
  - `GET /api/supabase/properties/:propertyId/rent-roll` - Unit-level rent roll data
  - `GET /api/supabase/portfolio-summary` - Portfolio-wide financial metrics

### 2. Frontend Components

#### `client/src/components/property-dashboard.tsx` (Updated)
- Added data source toggle: Excel vs Supabase (AppFolio)
- New queries for Supabase data using React Query
- Conditional rendering based on data source selection
- Updated property selector to work with both data structures

## Data Sources Comparison

### Excel Data Structure
```typescript
interface Property {
  id: string;
  code: string;
  name: string;
  units: number;
  monthlyNOI: number;
  // ... other fields
}
```

### AppFolio (Supabase) Data Structure  
```typescript
interface AppFolioProperty {
  PropertyId: number;
  PropertyName: string;
  PropertyAddress: string;
  PropertyType: string;
  // ... other fields
}
```

## Available AppFolio Tables

Based on the Supabase exploration, these key tables are available:

- `AF_RentRoll` - Unit-level rental data
- `AF_GeneralLedger` - Financial transactions
- `AF_Properties` (implicit from RentRoll) - Property information
- `AF_Tenants` - Tenant information
- `AF_Leases` - Lease agreements
- `AF_Buildings` - Building details

## Implementation Status

✅ **Completed:**
- Backend API endpoints with mock data
- Frontend data source toggle
- Conditional rendering for different data sources
- Property selection updates for both data types

🚧 **TODO - Replace Mock Implementation:**

To complete the integration, replace the mock MCP client in `server/supabase-integration.ts`:

```typescript
// Current mock implementation
const mcpClient: MCPSupabaseClient = {
  async execute_sql(projectId: string, query: string): Promise<any[]> {
    // Mock data...
  }
};

// Replace with actual MCP calls:
const mcpClient: MCPSupabaseClient = {
  async execute_sql(projectId: string, query: string): Promise<any[]> {
    // Use the MCP function available in your server environment
    const result = await mcp__supabase_community_supabase_mcp__execute_sql({
      project_id: projectId,
      query: query
    });
    return result;
  }
};
```

## Usage

1. **Switch Data Source**: Use the dropdown in the header to toggle between "Excel Files" and "Supabase (AppFolio)"

2. **Property Selection**: When using Supabase mode, properties are loaded directly from AppFolio data

3. **Financial Display**: The performance tab shows different data based on the selected source:
   - Excel mode: Shows detailed GL account breakdown
   - Supabase mode: Shows aggregated revenue, expenses, and NOI from AppFolio

## Benefits

- **Real-time Data**: Direct connection to AppFolio database
- **No Manual Uploads**: Eliminates need for Excel file processing
- **Standardized Structure**: Consistent data format from AppFolio
- **Comprehensive Data**: Access to all AppFolio tables and relationships

## Next Steps

1. **Complete MCP Integration**: Replace mock calls with real MCP server functions
2. **Enhanced Financial Views**: Add detailed GL account breakdown from AppFolio data
3. **Rent Roll Integration**: Display unit-level data in dashboard
4. **Real-time Updates**: Implement data refresh capabilities
5. **Error Handling**: Add robust error handling for database connectivity issues