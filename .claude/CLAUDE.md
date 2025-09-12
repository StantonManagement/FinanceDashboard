# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Property Management Dashboard - Implementation Context

## Development Commands

### Core Development
- `npm run dev` - Start development server (runs Express server with tsx)
- `npm run build` - Build production version (Vite build + esbuild for server)  
- `npm run start` - Start production server
- `npm run check` - Run TypeScript type checking
- `npm run db:push` - Push database schema changes with Drizzle Kit

### Database Operations
- Database schema managed with Drizzle ORM
- Uses Neon serverless PostgreSQL
- Schema changes pushed via Drizzle Kit

## System Architecture

### Frontend (React + Vite)
- React components with TypeScript
- Radix UI components with custom styling (`@radix-ui/react-*`)
- State management with React hooks
- Real-time data fetching with date-filtered API calls
- Recharts for financial visualizations

### Backend (Express + TypeScript)  
- Express.js server compiled with esbuild for production
- Multiple service integrations:
  - `appfolio-service.ts` - AppFolio API integration with Basic Auth
  - `supabase-service.ts` - Supabase data queries  
  - `investments-service.ts` - Portfolio data management
  - `supabase-integration.ts` - Enhanced Supabase operations
- API routes centralized in `server/routes.ts`
- Cross-env for environment variable management

### Key Components
- `CashFlowTab.tsx` - Cash flow analysis with date filtering and month-over-month comparisons
- `PerformanceTab.tsx` - Financial performance metrics with per-unit calculations
- `T12PerformanceTab.tsx` - Trailing 12-month volatility and seasonal analysis
- `property-dashboard.tsx` - Main dashboard orchestrating all tabs

## System Overview
You are building a real estate property management dashboard that displays financial performance metrics, operational variance analysis, and portfolio data. The system integrates dynamic API data from AppFolio and Supabase with sophisticated financial calculations and variance analysis.

## Data Sources & API Endpoints

### 1. Property Master Data
**Source**: Supabase table `AF_investments_export`  
**Endpoint**: `https://wkwmxxlfheywwbgdbzxe.supabase.co/rest/v1/AF_investments_export`
**Key Fields from actual data**: 
```javascript
{
  "Asset ID": "S0002",           // Property identifier
  "Asset ID + Name": "S0002 - 101 Maple",
  "Unit Total": "16",             // Total units in property
  "Units": "13",                  // Residential units
  "Comm Units": "3",              // Commercial units
  "Portfolio Name": "South End Portf.",
  "Address": "97-103 Maple Ave",
  "City": "Hartford",
  "State": "CT",
  "PropertyId": 18,               // AppFolio property ID for API calls
  "PortfolioId": 7,
  "NOI": "$179,372",              // Proforma NOI
  "Purchase Price": "$1,120,000",
  "Going-In Cap Rate": "4.87%",
  "Exp - Tax - Prop": "$38,641", // Property tax expense
  // ... additional fields
}
```

### 2. Cash Flow Data (P&L)
**Endpoint**: `https://stantonmgmt.appfolio.com/api/v1/reports/cash_flow.json`
**Parameters**: 
- `properties`: PropertyId from Supabase (e.g., 89)
- `from_date`: Start date (YYYY-MM-DD)
- `to_date`: End date (YYYY-MM-DD)

**Actual Response Structure**:
```javascript
[
  {
    "AccountName": "Rent Income",
    "AccountCode": "4105",
    "SelectedPeriod": "551.00",        // Current period amount
    "SelectedPeriodPercent": "7.18",   // % of total income
    "FiscalYearToDate": "5,042.00",    // YTD amount
    "FiscalYearToDatePercent": "14.77" // YTD % of total
  },
  // ... more line items
  {
    "AccountName": "Total Income",
    "AccountCode": null,
    "SelectedPeriod": "7,671.00",
    "SelectedPeriodPercent": "100.00",
    "FiscalYearToDate": "34,129.00",
    "FiscalYearToDatePercent": "100.00"
  },
  {
    "AccountName": "Total Expense",
    "AccountCode": null,
    "SelectedPeriod": "2.33",
    "SelectedPeriodPercent": "0.03",
    "FiscalYearToDate": "110,904.27",
    "FiscalYearToDatePercent": "324.96"
  }
]
```

### 3. Trailing 12-Month Performance
**Endpoint**: `https://stantonmgmt.appfolio.com/api/v1/reports/twelve_month_cash_flow.json`
**Parameters**:
- `properties`: PropertyId from Supabase
- `from_date`: Start date 
- `to_date`: End date

**Actual Response Structure**:
```javascript
[
  {
    "AccountName": "Rent Income",
    "AccountCode": "4105",
    "Slice00": "551.00",    // Month 1
    "Slice01": "0.00",      // Month 2
    "Slice02": "0.00",      // Month 3
    "Slice03": "0.00",      // Month 4
    "SliceTotal": "551.00"  // Total for period
  },
  // ... more accounts
]
```

### 4. Balance Sheet
**Endpoint**: `https://stantonmgmt.appfolio.com/api/v0/reports/balance_sheet.json`
**Parameters**:
- `properties`: PropertyId from Supabase
- `from_date`: Start date
- `to_date`: End date

**Actual Response Structure**:
```javascript
[
  {
    "AccountName": "Operating Cash",
    "Balance": "-244,169.77",
    "AccountNumber": "1150"
  },
  {
    "AccountName": "Buildings",
    "Balance": "255,379.00",
    "AccountNumber": "1505"
  },
  // ... more accounts
]
```

## Required Calculations & Business Logic

### Financial Metrics with Actual Field Mappings
```javascript
// Net Operating Income (NOI) - from cash flow API
const incomeItem = cashFlowData.find(item => item.AccountName === "Total Income");
const expenseItem = cashFlowData.find(item => item.AccountName === "Total Expense");
const NOI = parseFloat(incomeItem.SelectedPeriod.replace(/,/g, '')) - 
            parseFloat(expenseItem.SelectedPeriod.replace(/,/g, ''));

// Cap Rate (using purchase price from Supabase)
const property = supabaseData.find(p => p.PropertyId === selectedPropertyId);
const purchasePrice = parseFloat(property["Purchase Price"].replace(/[$,]/g, ''));
const annualNOI = NOI * 12; // Annualize if monthly
const capRate = (annualNOI / purchasePrice) * 100;

// Expense Ratio
const expenseRatio = (parseFloat(expenseItem.SelectedPeriod.replace(/,/g, '')) / 
                      parseFloat(incomeItem.SelectedPeriod.replace(/,/g, ''))) * 100;

// Variance Calculation (period over period)
// For each line item in cash flow:
const currentAmount = parseFloat(item.SelectedPeriod.replace(/,/g, ''));
const ytdAmount = parseFloat(item.FiscalYearToDate.replace(/,/g, ''));
// You'll need previous period data from another API call with different dates

// Variance Status based on thresholds
function getVarianceStatus(variance) {
  const absVariance = Math.abs(variance);
  if (absVariance <= 5) return { status: "Normal", color: "green" };
  if (absVariance <= 10) return { status: "Warning", color: "yellow" };
  return { status: "Alert", color: "red" };
}
```

### Specific Expense Category Mappings
Based on the actual API data, map these account codes to UI categories:
```javascript
const expenseMapping = {
  "Maintenance & Repairs": [
    "6142", // R&M: Plumbing
    "6143", // R&M: Flooring
    "6144", // R&M: HVAC
    "6145", // R&M: Key/Lock Replacement
    "6146", // R&M: Roof Repair
    "6148", // R&M Supplies
    "6157", // R&M: General Maintenance Labor
    // ... other R&M codes
  ],
  "Utilities": [
    "6171", // Unit Utilities - Electric
    "6172", // Unit Utilities - Gas
    "6173", // Water and Sewer
    "6175", // Garbage and Recycling
    "6179", // Common Electric
    "6181", // Common Gas
    // ... other utility codes
  ],
  "Management Fees": [
    "6451", // Property Management Fees
    "6452", // Asset Management Fees
  ],
  "Insurance": [
    // Look for account names containing "Insurance"
  ],
  "Property Tax": [
    "6161", // Property Tax
  ],
  "Professional Services": [
    // Account codes for legal, accounting, etc.
  ]
};

// Aggregate expenses by category
function aggregateExpensesByCategory(cashFlowData) {
  const categories = {};
  
  Object.keys(expenseMapping).forEach(category => {
    categories[category] = {
      current: 0,
      ytd: 0
    };
    
    expenseMapping[category].forEach(code => {
      const item = cashFlowData.find(i => i.AccountCode === code);
      if (item) {
        categories[category].current += parseFloat(item.SelectedPeriod.replace(/,/g, '') || 0);
        categories[category].ytd += parseFloat(item.FiscalYearToDate.replace(/,/g, '') || 0);
      }
    });
  });
  
  return categories;
}
```

## Current Implementation Status

### Recent Achievements (Updated September 2025)
- ✅ Migrated data fetching from Supabase to AppFolio API for T12, Balance Sheet, and Cash Flow
- ✅ Implemented property-specific filtering using PropertyId from investments table  
- ✅ Added date filtering for Cash Flow API with user-selectable date ranges
- ✅ Fixed cash flow summaries showing zero by adding date filtering
- ✅ Update button working in Cash Flow Detail tab with date range controls
- ✅ Month-over-month comparison implemented with color coding for variance analysis
- ✅ T12 Performance tab with volatility analysis and seasonal patterns
- ✅ Property-specific financial metrics in Performance tab with per-unit calculations
- ✅ Operating Income Summary with revenue/expense breakdowns
- ✅ Previous period data fetching for variance calculations
- ✅ Preset date buttons for "Current Month" and "Last 30 Days"

### Component Status
- **CashFlowTab.tsx**: ✅ Fully functional with date filtering, variance analysis, and update controls
- **PerformanceTab.tsx**: ✅ Property-specific metrics with financial analysis calculations  
- **T12PerformanceTab.tsx**: ✅ Advanced performance statistics and volatility scoring
- **API Integration**: ✅ AppFolio service with proper error handling and retry logic

## Implementation Priorities

### Phase 1: Fix Critical Data Integration Issues
1. **Connect property selector to Supabase data**
   ```javascript
   // Fetch properties for dropdown
   const properties = await fetch('https://wkwmxxlfheywwbgdbzxe.supabase.co/rest/v1/AF_investments_export')
     .then(res => res.json());
   
   // Property dropdown should show: "S0002 - 101 Maple"
   // When selected, use PropertyId (18) for AppFolio API calls
   ```

2. **Replace hardcoded values with real calculations**
   ```javascript
   // Instead of static NOI: $179,372
   const noi = calculateNOI(cashFlowData); // Use actual API data
   
   // Instead of static Cap Rate: 4.9%
   const capRate = calculateCapRate(noi, property["Purchase Price"]);
   
   // Instead of static Expense Ratio: 41.0%
   const expenseRatio = calculateExpenseRatio(cashFlowData);
   ```

3. **Fix variance calculations showing 0.0%**
   ```javascript
   // Need to fetch two periods for comparison
   const currentPeriod = await fetchCashFlow(propertyId, '2025-08-01', '2025-08-31');
   const previousPeriod = await fetchCashFlow(propertyId, '2025-07-01', '2025-07-31');
   
   // Calculate actual variances
   const variances = calculateVariances(currentPeriod, previousPeriod);
   ```

### Phase 2: Map API Data to UI Components

#### Property Overview Section
```javascript
{
  NOI: calculateNOI(cashFlowData),
  Units: property["Unit Total"],
  Revenue: cashFlowData.find(i => i.AccountName === "Total Income")?.SelectedPeriod,
  CashFlow: calculateNOI(cashFlowData), // Simplified, could subtract debt service
  CapRate: calculateCapRate(noi, property["Purchase Price"]),
  ExpenseRatio: calculateExpenseRatio(cashFlowData)
}
```

#### Operational Variance Analysis Table
```javascript
// For each expense category row:
{
  category: "Maintenance & Repairs",
  currentPeriod: "$6,306",  // Sum of all R&M account codes
  previousPeriod: "$6,306",  // From previous period API call
  variance: "0.00",          // Calculate: (current - previous) / previous * 100
  variancePercent: "0.0%",
  threshold: "+25%",         // Define business rules
  status: "Normal"           // Based on variance vs threshold
}
```

### Phase 3: Enhanced Features

1. **T12 Performance Chart**
   ```javascript
   // Use twelve_month_cash_flow API data
   const monthlyData = t12Data.map((item, index) => ({
     month: getMonthName(index),
     income: parseFloat(item[`Slice${index.toString().padStart(2, '0')}`]),
     expenses: // ... aggregate expense slices
   }));
   ```

2. **Balance Sheet Integration**
   ```javascript
   const assets = balanceSheetData
     .filter(item => isAssetAccount(item.AccountNumber))
     .reduce((sum, item) => sum + parseFloat(item.Balance.replace(/,/g, '')), 0);
   
   const liabilities = balanceSheetData
     .filter(item => isLiabilityAccount(item.AccountNumber))
     .reduce((sum, item) => sum + parseFloat(item.Balance.replace(/,/g, '')), 0);
   ```

## Error Handling & Edge Cases

```javascript
// Handle missing data gracefully
function safeParseFloat(value) {
  if (!value) return 0;
  return parseFloat(value.toString().replace(/[$,]/g, '')) || 0;
}

// Handle API errors
async function fetchWithRetry(url, options, retries = 3) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

// Handle missing account codes
function getAccountValue(data, accountCode, field = 'SelectedPeriod') {
  const item = data.find(i => i.AccountCode === accountCode);
  return item ? safeParseFloat(item[field]) : 0;
}
```

## Testing Checklist

### ✅ **COMPLETED - Core Infrastructure**
- [x] All currency values parse correctly (remove $, commas) - `DataUtils.parseCurrency()`
- [x] Error states display when APIs fail - `ErrorBoundary` + `ErrorFallback` components
- [x] Loading states show during API calls - `LoadingState` component
- [x] Variances show real differences between periods (not 0.0%) - `DataUtils.calculateVariance()`
- [x] Status indicators change color based on variance thresholds - `DataUtils.getVarianceStatus()`

### ✅ **COMPLETED - Financial Calculations** 
- [x] NOI calculates correctly: Total Income - Total Expense - `calculateNOI()` in `financial-calculations.ts`
- [x] Cap Rate uses actual purchase price from Supabase - `calculateCapRate()` implemented
- [x] Expense categories aggregate multiple account codes correctly - `aggregateExpensesByCategory()` implemented
- [x] Balance sheet shows correct asset/liability totals - `calculateBalanceSheetTotals()` implemented
- [x] T12 chart displays monthly trends from Slice00-Slice11 - `extractMonthlyTrends()` implemented

### ⚠️ **PARTIALLY IMPLEMENTED - UI Integration**
- [⚠️] Property dropdown populates from Supabase data - Portfolio system implemented, individual property selection needs verification
- [⚠️] Selecting property updates all dashboard data - Property state management exists, full integration needs testing

### 🧪 **TESTING REQUIREMENTS**
To complete implementation, verify these integrations:

1. **Property Selection Flow**: 
   ```typescript
   // Verify in property-dashboard.tsx
   const selectedProperty = // Should come from Supabase AF_investments_export
   const propertyValidation = validatePropertyData(selectedProperty);
   ```

2. **Financial Calculations Integration**:
   ```typescript
   // Verify in tabs that calculations use the new utilities
   import { calculateNOI, calculateCapRate, aggregateExpensesByCategory } from '@/utils/financial-calculations';
   const noi = calculateNOI(cashFlowData);
   const capRate = calculateCapRate(noi, selectedProperty["Purchase Price"]);
   ```

3. **Chart Data Integration**:
   ```typescript
   // Verify T12PerformanceTab uses extractMonthlyTrends()
   const { months, revenue, expenses, netIncome } = extractMonthlyTrends(t12Data);
   ```

### 🔧 **IMPLEMENTATION FILES CREATED**
- ✅ `shared/utils.ts` - Core data utilities and account mappings
- ✅ `shared/schema.ts` - Updated with AppFolio API types  
- ✅ `client/src/utils/financial-calculations.ts` - Business logic implementations
- ✅ `client/src/components/ui/error-boundary.tsx` - Error handling
- ✅ `client/src/components/ui/loading.tsx` - Loading states
- ✅ `client/src/services/appfolio-client.ts` - API client with caching
- ✅ `client/src/lib/performance.ts` - Performance monitoring

## Key Data Mappings Summary

| UI Field | Data Source | Calculation |
|----------|-------------|-------------|
| Property List | Supabase: `Asset ID + Name` | Direct mapping |
| NOI | Cash Flow API: Total Income - Total Expense | `SelectedPeriod` field |
| Cap Rate | NOI / Supabase: `Purchase Price` | Annualized NOI / Purchase Price * 100 |
| Expense Ratio | Cash Flow API | Total Expense / Total Income * 100 |
| Unit Count | Supabase: `Unit Total` | Direct mapping |
| Variances | Compare two Cash Flow API calls | (Current - Previous) / Previous * 100 |
| Monthly Trends | T12 API: Slice00-Slice11 | Each slice = one month |
| Balance Sheet | Balance Sheet API | Group by asset/liability accounts |