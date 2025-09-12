# AppFolio API Endpoints Investigation Report

## Executive Summary

I successfully investigated two AppFolio API endpoints for Property ID 89 (S0019 - 93 Maple):
1. **Rent Roll API**: `/api/v0/reports/rent_roll.json` - Unit-level occupancy and rent data
2. **General Ledger API**: `/api/v0/reports/general_ledger.json` - Transaction-level financial data

Both APIs are accessible, return structured JSON data, and provide valuable information for portfolio data validation and real-time financial reporting.

## API Endpoint Details

### 1. Rent Roll API 
**Endpoint**: `https://stantonmgmt.appfolio.com/api/v0/reports/rent_roll.json`

#### Parameters:
- `properties`: Property ID (e.g., `89`)
- `from_date`: Start date (YYYY-MM-DD format)
- `to_date`: End date (YYYY-MM-DD format)

#### Response Structure:
```json
{
  "results": [...], // Array of unit records
  "next_page_url": null // For pagination
}
```

#### Key Fields per Unit Record:
- **Property Information**: `PropertyName`, `PropertyId`, `PropertyAddress`, `PropertyType`
- **Unit Details**: `Unit`, `UnitType`, `BdBa`, `SquareFt`  
- **Tenant Information**: `Tenant`, `Status`, `TenantId`, `AdditionalTenants`
- **Rent Data**: `Rent`, `MarketRent`, `AdvertisedRent`
- **Financial Metrics**: `PastDue`, `Deposit`, `MonthlyRentSquareFt`, `AnnualRentSquareFt`
- **Lease Information**: `LeaseFrom`, `LeaseTo`, `MoveIn`, `MoveOut`, `LeaseExpiresMonth`
- **Occupancy Status**: `Status` (Current/Vacant-Unrented), `RentReady`

### 2. General Ledger API
**Endpoint**: `https://stantonmgmt.appfolio.com/api/v0/reports/general_ledger.json`

#### Parameters:
- `properties`: Property ID (e.g., `89`)
- `from_date`: Start date (YYYY-MM-DD format) 
- `to_date`: End date (YYYY-MM-DD format)

#### Response Structure:
```json
{
  "results": [...], // Array of transaction records
  "next_page_url": null // For pagination
}
```

#### Key Fields per Transaction Record:
- **Account Information**: `AccountName`, `AccountId`, `AccountIntegrationId`
- **Property Details**: `PropertyName`, `PropertyId`, `PropertyAddress`
- **Transaction Data**: `Debit`, `Credit`, `PostDate`, `Reference`, `Type`
- **Party Information**: `PartyName`, `PartyType` (Occupancy/Vendor)
- **Unit Association**: `Unit`, `unit_id`, `UnitIntegrationId`
- **Temporal Data**: `Month`, `Quarter`, `Year`, `TxnCreatedAt`
- **Audit Trail**: `CreatedBy`, `Description`, `Remarks`

## Data Quality & Coverage Analysis

### Property 89 (S0019 - 93 Maple) Data Sample:
- **Total Units**: 4 (1 Retail + 3 Residential)
- **Unit Mix**: 3x 5BR/1BA residential units (1,400 sq ft each) + 1 retail space
- **Occupancy**: 3/4 units occupied (75% occupancy rate)
- **Monthly Revenue**: ~$7,656 (based on current rent rates)

### Rent Roll Data Quality:
✅ **Complete Coverage**: All units represented  
✅ **Real-time Data**: Current tenant names, lease dates, rent amounts  
✅ **Financial Details**: Market rent vs actual rent, past due amounts  
✅ **Occupancy Metrics**: Vacancy status, lease expiration dates  
✅ **Unit Specifications**: Square footage, bedroom/bathroom count  

### General Ledger Data Quality:
✅ **Transaction-Level Detail**: Individual debits/credits with amounts  
✅ **Account Mapping**: Chart of accounts (1150-Cash, 4105-Rent Income, etc.)  
✅ **Date Granularity**: Daily transaction posting dates  
✅ **Unit Attribution**: Transactions linked to specific units where applicable  
✅ **Audit Information**: Created by, timestamps, reference numbers  

## Integration Recommendations

### 1. Monthly Revenue Calculations
**Primary Source**: Rent Roll API  
**Key Fields**: 
```javascript
// Calculate actual monthly revenue
const monthlyRevenue = rentRollData.results
  .filter(unit => unit.Status === 'Current')
  .reduce((total, unit) => total + parseFloat(unit.Rent?.replace(/,/g, '') || 0), 0);

// Calculate potential revenue (market rent)
const potentialRevenue = rentRollData.results
  .reduce((total, unit) => total + parseFloat(unit.MarketRent?.replace(/,/g, '') || 0), 0);

// Calculate occupancy rate
const totalUnits = rentRollData.results.length;
const occupiedUnits = rentRollData.results.filter(unit => unit.Status === 'Current').length;
const occupancyRate = (occupiedUnits / totalUnits) * 100;
```

### 2. Unit Occupancy Data
**Primary Source**: Rent Roll API  
**Key Metrics**:
```javascript
// Occupancy analysis
const occupancyData = {
  totalUnits: rentRollData.results.length,
  occupiedUnits: rentRollData.results.filter(u => u.Status === 'Current').length,
  vacantUnits: rentRollData.results.filter(u => u.Status.includes('Vacant')).length,
  avgRentPerSqFt: calculateAverageRentPerSqFt(),
  leasesExpiring: rentRollData.results.filter(u => isLeaseExpiringWithin(u, 90)) // Next 90 days
};
```

### 3. Rent per Unit Calculations  
**Primary Source**: Rent Roll API  
**Enhanced Metrics**:
```javascript
// Unit-level rent analysis
const unitAnalysis = rentRollData.results.map(unit => ({
  unitNumber: unit.Unit,
  currentRent: parseFloat(unit.Rent?.replace(/,/g, '') || 0),
  marketRent: parseFloat(unit.MarketRent?.replace(/,/g, '') || 0),
  rentPerSqFt: parseFloat(unit.MonthlyRentSquareFt || 0),
  rentDifferential: parseFloat(unit.MarketRent?.replace(/,/g, '') || 0) - parseFloat(unit.Rent?.replace(/,/g, '') || 0),
  occupancyStatus: unit.Status,
  leaseExpiration: unit.LeaseTo
}));
```

### 4. Property Financial Summaries
**Primary Source**: General Ledger API  
**Secondary**: Rent Roll API for revenue validation  
**Detailed Breakdown**:
```javascript
// Income categorization
const incomeAccounts = {
  'Rent Income': '4105',
  'Section 8 Rent': '4110', 
  'Prepaid Rent': '4150'
};

// Expense categorization  
const expenseAccounts = {
  'Operating Expenses': ['6xxx'],
  'Software/Tech': ['6210'],
  // Add more categories as needed
};

// Monthly summary from GL transactions
const monthlySummary = {
  totalIncome: calculateAccountTotal(glData, Object.values(incomeAccounts), 'Credit'),
  totalExpenses: calculateAccountTotal(glData, ['6'], 'Debit'),
  netOperatingIncome: totalIncome - totalExpenses,
  transactionCount: glData.results.length
};
```

## Comparison with Existing Cash Flow API

| Feature | Cash Flow API (v1) | General Ledger API (v0) | Rent Roll API (v0) |
|---------|-------------------|------------------------|-------------------|
| **Data Level** | Summary/Aggregated | Transaction-Level | Unit-Level |
| **Update Frequency** | Monthly | Real-time | Real-time |
| **Revenue Detail** | Total Income | Individual transactions | Unit-by-unit rent |
| **Expense Detail** | Category totals | Individual line items | N/A |
| **Unit Attribution** | Property-wide | Transaction-specific | Complete unit detail |
| **Historical Data** | YTD summaries | All transaction history | Current state snapshot |
| **Occupancy Info** | None | None | Complete tenant/lease data |

## Implementation Priorities

### Phase 1: Replace Static Occupancy Calculations 
- **API**: Rent Roll  
- **Target**: Unit occupancy rates, vacancy analysis
- **Impact**: Real-time occupancy tracking vs static assumptions

### Phase 2: Enhanced Revenue Analysis
- **API**: Rent Roll + General Ledger  
- **Target**: Unit-level rent roll, market rent analysis, rent differential tracking
- **Impact**: Identify rent optimization opportunities

### Phase 3: Detailed Expense Tracking
- **API**: General Ledger  
- **Target**: Transaction-level expense analysis, vendor tracking
- **Impact**: More granular expense categorization and variance analysis

### Phase 4: Complete Financial Integration
- **API**: All three (Cash Flow + General Ledger + Rent Roll)  
- **Target**: Comprehensive financial dashboard with drill-down capabilities
- **Impact**: Full audit trail from summary to transaction level

## Technical Integration Considerations

### Date Range Requirements:
- **Rent Roll**: Flexible date ranges, recommend current month for occupancy snapshots
- **General Ledger**: Requires date filters, can return large datasets without filtering

### Pagination:
- Both APIs support pagination via `next_page_url` field
- Implement pagination handling for properties with high transaction volumes

### Authentication:
- Uses existing Basic Authentication with APPFOLIO_CLIENT_ID/CLIENT_SECRET
- No additional authentication setup required

### Rate Limiting:
- Consider implementing request throttling between API calls
- Cache results for frequently accessed data

## Data Validation Opportunities

### Cross-API Validation:
1. **Revenue Reconciliation**: Compare Rent Roll projected revenue vs General Ledger actual receipts
2. **Occupancy Verification**: Validate Cash Flow income against Rent Roll occupied units
3. **Unit Attribution**: Ensure GL transactions properly allocated to correct units

### Data Quality Checks:
1. **Missing Data**: Identify units with null rent amounts or missing square footage
2. **Outliers**: Flag rent amounts significantly above/below market rates
3. **Consistency**: Verify tenant information matches between occupancy records and transactions

## Conclusion

Both APIs provide excellent data quality and comprehensive coverage for the Hartford Dashboard integration. The Rent Roll API is particularly valuable for replacing static occupancy calculations, while the General Ledger API enables detailed transaction-level analysis that goes beyond the current Cash Flow API limitations.

**Recommendation**: Implement both APIs in phases, starting with Rent Roll for immediate occupancy improvements, followed by General Ledger integration for enhanced financial analysis and audit capabilities.