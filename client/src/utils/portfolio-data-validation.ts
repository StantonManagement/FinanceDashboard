/**
 * Portfolio Data Validation and Financial Calculation Utilities
 * Handles incomplete data scenarios like Park Portfolio
 */

import { DataUtils } from '@shared/utils';

export interface PropertyFinancials {
  propertyId: string;
  assetName: string;
  purchasePrice: number;
  monthlyRevenue: number;
  annualRevenue: number;
  occupiedUnits: number;
  avgRentPerUnit: number;
  estimatedNOI?: number;
  estimatedCapRate?: number;
  dataCompleteness: 'complete' | 'partial' | 'calculated' | 'missing';
  missingFields: string[];
  dataSource: 'investments_table' | 'rent_roll_calculated' | 'general_ledger';
}

export interface PortfolioValidation {
  portfolioName: string;
  totalProperties: number;
  completeProperties: PropertyFinancials[];
  incompleteProperties: PropertyFinancials[];
  calculatedProperties: PropertyFinancials[];
  warnings: string[];
  aggregatedFinancials: {
    totalRevenue: number;
    totalNOI: number;
    averageCapRate: number;
    totalUnits: number;
    occupancyRate: number;
  };
}

/**
 * Park Portfolio calculated financials from rent roll data
 */
export const PARK_PORTFOLIO_CALCULATED_DATA: PropertyFinancials[] = [
  {
    propertyId: '100',
    assetName: 'S0021 - 67 Park',
    purchasePrice: 623077,
    monthlyRevenue: 10940,
    annualRevenue: 131280,
    occupiedUnits: 6,
    avgRentPerUnit: 1823.33,
    estimatedNOI: 78768, // Assuming 60% NOI margin (typical for this market)
    estimatedCapRate: 12.64, // (78768 / 623077) * 100
    dataCompleteness: 'calculated',
    missingFields: ['NOI', 'Operating Expenses'],
    dataSource: 'rent_roll_calculated'
  },
  {
    propertyId: '141',
    assetName: 'S0022 - 83 Park',
    purchasePrice: 1038462,
    monthlyRevenue: 12575,
    annualRevenue: 150900,
    occupiedUnits: 9,
    avgRentPerUnit: 1397.22,
    estimatedNOI: 90540, // Assuming 60% NOI margin
    estimatedCapRate: 8.72,
    dataCompleteness: 'calculated',
    missingFields: ['NOI', 'Operating Expenses'],
    dataSource: 'rent_roll_calculated'
  },
  {
    propertyId: '142',
    assetName: 'S0020 - 31 Park',
    purchasePrice: 726923,
    monthlyRevenue: 2500,
    annualRevenue: 30000,
    occupiedUnits: 1, // Low occupancy - needs attention
    avgRentPerUnit: 2500,
    estimatedNOI: 18000, // Assuming 60% NOI margin
    estimatedCapRate: 2.48, // Very low due to low occupancy
    dataCompleteness: 'partial',
    missingFields: ['NOI', 'Operating Expenses', 'Full Occupancy'],
    dataSource: 'rent_roll_calculated'
  },
  {
    propertyId: '144',
    assetName: 'S0023 - 57 Park',
    purchasePrice: 311538,
    monthlyRevenue: 4890.24,
    annualRevenue: 58682.88,
    occupiedUnits: 3,
    avgRentPerUnit: 1630.08,
    estimatedNOI: 35209.73, // Assuming 60% NOI margin
    estimatedCapRate: 11.30,
    dataCompleteness: 'calculated',
    missingFields: ['NOI', 'Operating Expenses'],
    dataSource: 'rent_roll_calculated'
  }
];

/**
 * Validate property data completeness - Updated to be less strict
 * Only flags truly incomplete properties (like Park Portfolio with null NOI)
 */
export function validatePropertyData(property: any): {
  isComplete: boolean;
  isPartial: boolean;
  missingFields: string[];
  warnings: string[];
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
} {
  // Focus on core financial fields that are truly critical
  const criticalFields = [
    'PropertyId', 
    'Asset ID + Name'
  ];
  
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Check for missing critical fields only
  criticalFields.forEach(field => {
    const value = property[field];
    if (!value || value === null || value === '') {
      missingFields.push(field);
    }
  });

  // Check for truly problematic data (null NOI, revenue showing "$-")
  const noiValue = property['NOI'];
  const revenueValue = property['Proforma Revenue'];
  const purchasePrice = property['Purchase Price'];

  // Only flag as incomplete if NOI is explicitly null or revenue shows placeholder
  if (noiValue === null || noiValue === undefined) {
    missingFields.push('NOI');
  }
  
  if (revenueValue === '$-' || revenueValue === ' $-   ' || revenueValue === null || revenueValue === undefined) {
    missingFields.push('Proforma Revenue');
  }

  // Only warn about data quality issues, don't mark as incomplete
  if (purchasePrice && DataUtils.parseCurrency(purchasePrice) <= 0) {
    warnings.push('Purchase Price should be greater than zero');
  }

  if (property.Units && parseInt(property.Units) <= 0) {
    warnings.push('Units should be greater than zero');
  }

  // More lenient data quality assessment
  const totalFields = criticalFields.length + 2; // NOI and Revenue
  const completenessRatio = (totalFields - missingFields.length) / totalFields;
  let dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
  
  if (completenessRatio >= 0.9) dataQuality = 'excellent';
  else if (completenessRatio >= 0.7) dataQuality = 'good';
  else if (completenessRatio >= 0.5) dataQuality = 'fair';
  else dataQuality = 'poor';

  return {
    isComplete: missingFields.length === 0,
    isPartial: missingFields.length > 0 && missingFields.length < totalFields,
    missingFields,
    warnings,
    dataQuality
  };
}

/**
 * Get calculated financial data for incomplete properties
 * First tries to fetch from AppFolio rent roll API, falls back to static data
 */
export async function getCalculatedFinancials(propertyId: string): Promise<PropertyFinancials | null> {
  try {
    // Try to fetch real-time data from AppFolio rent roll API
    const rentRollData = await fetchRentRollData(propertyId);
    if (rentRollData) {
      return rentRollData;
    }
  } catch (error) {
    console.warn(`Failed to fetch rent roll data for property ${propertyId}, using static calculations:`, error);
  }
  
  // Fallback to static calculated data
  return PARK_PORTFOLIO_CALCULATED_DATA.find(p => p.propertyId === propertyId) || null;
}

/**
 * Fetch real-time financial data from AppFolio rent roll API
 */
async function fetchRentRollData(propertyId: string): Promise<PropertyFinancials | null> {
  const currentDate = new Date();
  const fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const toDate = currentDate;
  
  const params = new URLSearchParams({
    properties: propertyId,
    from_date: fromDate.toISOString().split('T')[0],
    to_date: toDate.toISOString().split('T')[0]
  });
  
  const response = await fetch(`/api/appfolio/rent-roll?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`Rent roll API failed: ${response.status}`);
  }
  
  const rentRollData = await response.json();
  return processRentRollData(rentRollData, propertyId);
}

/**
 * Process rent roll API response into PropertyFinancials format
 */
function processRentRollData(rentRollData: any[], propertyId: string): PropertyFinancials | null {
  if (!rentRollData || rentRollData.length === 0) {
    return null;
  }
  
  // Find property data - rent roll returns array of units
  const propertyUnits = rentRollData.filter(unit => unit.PropertyId?.toString() === propertyId);
  
  if (propertyUnits.length === 0) {
    return null;
  }
  
  // Calculate aggregated financials from unit data
  const occupiedUnits = propertyUnits.filter(unit => 
    unit.Status === 'Current' || unit.CurrentRent > 0
  );
  
  const monthlyRevenue = occupiedUnits.reduce((sum, unit) => {
    return sum + (DataUtils.parseCurrency(unit.CurrentRent) || 0);
  }, 0);
  
  const annualRevenue = monthlyRevenue * 12;
  const avgRentPerUnit = occupiedUnits.length > 0 ? monthlyRevenue / occupiedUnits.length : 0;
  
  // Get purchase price from first unit (should be same for all units of same property)
  const purchasePrice = DataUtils.parseCurrency(propertyUnits[0]?.PurchasePrice) || 0;
  
  // Calculate NOI using property-specific data or 60% default margin
  const estimatedNOI = annualRevenue * 0.6; // 60% NOI margin assumption
  const estimatedCapRate = purchasePrice > 0 ? (estimatedNOI / purchasePrice) * 100 : 0;
  
  // Determine data completeness based on available fields
  const missingFields: string[] = [];
  if (!purchasePrice) missingFields.push('Purchase Price');
  if (occupiedUnits.length < propertyUnits.length) missingFields.push('Full Occupancy');
  
  const assetName = propertyUnits[0]?.AssetName || 
                   propertyUnits[0]?.PropertyName || 
                   `Property ${propertyId}`;
  
  return {
    propertyId,
    assetName,
    purchasePrice,
    monthlyRevenue,
    annualRevenue,
    occupiedUnits: occupiedUnits.length,
    avgRentPerUnit,
    estimatedNOI,
    estimatedCapRate,
    dataCompleteness: missingFields.length === 0 ? 'complete' : 'calculated',
    missingFields,
    dataSource: 'rent_roll_api'
  };
}

/**
 * Validate entire portfolio
 */
export function validatePortfolio(portfolioName: string, properties: any[]): PortfolioValidation {
  const completeProperties: PropertyFinancials[] = [];
  const incompleteProperties: PropertyFinancials[] = [];
  const calculatedProperties: PropertyFinancials[] = [];
  const warnings: string[] = [];

  properties.forEach(property => {
    const validation = validatePropertyData(property);
    const propertyId = property.PropertyId?.toString();
    
    if (validation.isComplete) {
      completeProperties.push({
        propertyId,
        assetName: property['Asset ID + Name'],
        purchasePrice: DataUtils.parseCurrency(property['Purchase Price']),
        monthlyRevenue: DataUtils.parseCurrency(property['Proforma Revenue']) / 12,
        annualRevenue: DataUtils.parseCurrency(property['Proforma Revenue']),
        occupiedUnits: parseInt(property.Units) || 0,
        avgRentPerUnit: DataUtils.parseCurrency(property['Proforma Revenue']) / 12 / (parseInt(property.Units) || 1),
        estimatedNOI: DataUtils.parseCurrency(property.NOI),
        estimatedCapRate: DataUtils.parsePercent(property['Going-In Cap Rate']),
        dataCompleteness: 'complete',
        missingFields: [],
        dataSource: 'investments_table'
      });
    } else {
      // Check if we have calculated data available
      const calculatedData = getCalculatedFinancials(propertyId);
      if (calculatedData) {
        calculatedProperties.push(calculatedData);
      } else {
        incompleteProperties.push({
          propertyId,
          assetName: property['Asset ID + Name'],
          purchasePrice: DataUtils.parseCurrency(property['Purchase Price']),
          monthlyRevenue: 0,
          annualRevenue: 0,
          occupiedUnits: 0,
          avgRentPerUnit: 0,
          dataCompleteness: 'missing',
          missingFields: validation.missingFields,
          dataSource: 'investments_table'
        });
      }
      
      warnings.push(`${property['Asset ID + Name']}: ${validation.missingFields.join(', ')}`);
      validation.warnings.forEach(w => warnings.push(`${property['Asset ID + Name']}: ${w}`));
    }
  });

  // Calculate aggregated financials
  const allProperties = [...completeProperties, ...calculatedProperties];
  const aggregatedFinancials = {
    totalRevenue: allProperties.reduce((sum, p) => sum + p.annualRevenue, 0),
    totalNOI: allProperties.reduce((sum, p) => sum + (p.estimatedNOI || 0), 0),
    averageCapRate: allProperties.length > 0 ? 
      allProperties.reduce((sum, p) => sum + (p.estimatedCapRate || 0), 0) / allProperties.length : 0,
    totalUnits: allProperties.reduce((sum, p) => sum + p.occupiedUnits, 0),
    occupancyRate: 100 // This would need actual vacancy data
  };

  return {
    portfolioName,
    totalProperties: properties.length,
    completeProperties,
    incompleteProperties,
    calculatedProperties,
    warnings,
    aggregatedFinancials
  };
}

/**
 * Enhanced financial calculations that handle incomplete data
 */
export function calculatePortfolioMetrics(validation: PortfolioValidation) {
  const allUsableProperties = [...validation.completeProperties, ...validation.calculatedProperties];
  
  if (allUsableProperties.length === 0) {
    return {
      totalRevenue: 0,
      totalNOI: 0,
      averageCapRate: 0,
      totalUnits: 0,
      revenuePerUnit: 0,
      dataQuality: 'insufficient' as const
    };
  }

  const totalRevenue = allUsableProperties.reduce((sum, p) => sum + p.annualRevenue, 0);
  const totalNOI = allUsableProperties.reduce((sum, p) => sum + (p.estimatedNOI || 0), 0);
  const totalUnits = allUsableProperties.reduce((sum, p) => sum + p.occupiedUnits, 0);
  
  return {
    totalRevenue,
    totalNOI,
    averageCapRate: validation.aggregatedFinancials.averageCapRate,
    totalUnits,
    revenuePerUnit: totalUnits > 0 ? totalRevenue / totalUnits : 0,
    dataQuality: validation.incompleteProperties.length === 0 ? 'complete' : 
                 validation.calculatedProperties.length > 0 ? 'estimated' : 'incomplete'
  };
}