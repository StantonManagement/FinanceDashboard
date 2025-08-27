import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

export interface PropertyMaster {
  assetId: string;
  name: string;
  portfolio: string;
  units: number;
  totalUnits: number;
  marketRent: number;
  sqft: number;
  managementFeePercent: number;
}

export interface CashFlowData {
  assetId: string;
  rentIncome: number;
  section8Rent: number;
  totalOperatingIncome: number;
  totalOperatingExpense: number;
  noi: number;
  netIncome: number;
}

export interface BalanceSheetData {
  assetId: string;
  operatingCash: number;
  securityDepositCash: number;
  totalCash: number;
  totalAssets: number;
  totalLiabilities: number;
  netEquity: number;
}

export interface RentRollData {
  assetId: string;
  unitId: string;
  tenant: string;
  unit: string;
  status: string;
  rentAmount: number;
  totalRent: number;
}

export interface T12Data {
  assetId: string;
  month: string;
  rentIncome: number;
  section8Rent: number;
  totalIncome: number;
  totalExpenses: number;
  noi: number;
}

export interface ComprehensiveExcelData {
  lastUpdated: string;
  properties: PropertyMaster[];
  cashFlowData: CashFlowData[];
  balanceSheetData: BalanceSheetData[];
  rentRollData: RentRollData[];
  t12Data: T12Data[];
  portfolioSummary: {
    totalProperties: number;
    totalUnits: number;
    totalRentIncome: number;
    totalNOI: number;
    averageOccupancy: number;
  };
}

export class ComprehensiveExcelLoader {
  private workbook: XLSX.WorkBook;
  
  constructor(private filePath: string) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Excel file not found: ${filePath}`);
    }
    const buffer = fs.readFileSync(filePath);
    this.workbook = XLSX.read(buffer, { type: 'buffer' });
  }

  public loadAllData(): ComprehensiveExcelData {
    console.log('Loading comprehensive data from Excel file:', this.filePath);
    
    const properties = this.loadPropertyMaster();
    const cashFlowData = this.loadCashFlowData();
    const balanceSheetData = this.loadBalanceSheetData();
    const rentRollData = this.loadRentRollData();
    const t12Data = this.loadT12Data();
    
    const portfolioSummary = this.calculatePortfolioSummary(properties, cashFlowData);
    
    return {
      lastUpdated: new Date().toISOString(),
      properties,
      cashFlowData,
      balanceSheetData,
      rentRollData,
      t12Data,
      portfolioSummary
    };
  }

  private loadPropertyMaster(): PropertyMaster[] {
    console.log('Loading property master data from Investments sheet');
    const worksheet = this.workbook.Sheets['Investments'];
    if (!worksheet) return [];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    const properties: PropertyMaster[] = [];

    // Find header row (around row 2)
    const headerRow = 2;
    
    for (let i = 4; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || !row[1]) continue;

      const assetMatch = String(row[1]).match(/^(S\d{4})/);
      if (!assetMatch) continue;

      const assetId = assetMatch[1];
      const name = String(row[1]).split(' - ').slice(1).join(' - ');
      
      properties.push({
        assetId,
        name: name || String(row[1]),
        portfolio: this.getPortfolioName(assetId),
        units: this.parseNumber(row[4]) || 0,
        totalUnits: this.parseNumber(row[3]) || 0,
        marketRent: this.parseNumber(row[47]) || 0, // Proforma Revenue column
        sqft: this.parseNumber(row[55]) || 0,
        managementFeePercent: 0.06 // Default from Prop Direct sheet
      });
    }

    console.log(`Loaded ${properties.length} properties from master data`);
    return properties;
  }

  private loadCashFlowData(): CashFlowData[] {
    console.log('Loading cash flow data from >>LastMnth sheet');
    const worksheet = this.workbook.Sheets['>>LastMnth'];
    if (!worksheet) return [];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    const cashFlowData: CashFlowData[] = [];

    // Property headers are in row 6, starting from column 3
    const headerRow = jsonData[6];
    if (!headerRow) return [];

    const propertyColumns: { [key: number]: string } = {};
    for (let i = 3; i < headerRow.length; i++) {
      const header = String(headerRow[i]);
      const match = header.match(/^(S\d{4})/);
      if (match) {
        propertyColumns[i] = match[1];
      }
    }

    // Key row indices for financial data
    const rentIncomeRow = this.findRowByAccountName(jsonData, 'Rent Income');
    const section8Row = this.findRowByAccountName(jsonData, 'Section 8 Rent');
    const totalOperatingIncomeRow = this.findRowByAccountName(jsonData, 'Total Operating Income');
    const totalOperatingExpenseRow = this.findRowByAccountName(jsonData, 'Total Operating Expense');
    const noiRow = this.findRowByAccountName(jsonData, 'NOI - Net Operating Income');
    const netIncomeRow = this.findRowByAccountName(jsonData, 'Net Income');

    for (const [colIndex, assetId] of Object.entries(propertyColumns)) {
      const col = parseInt(colIndex);
      
      const rentIncome = this.getCellValue(jsonData, rentIncomeRow, col);
      const section8Rent = this.getCellValue(jsonData, section8Row, col);
      const totalOperatingIncome = this.getCellValue(jsonData, totalOperatingIncomeRow, col);
      const totalOperatingExpense = this.getCellValue(jsonData, totalOperatingExpenseRow, col);
      const noi = this.getCellValue(jsonData, noiRow, col);
      const netIncome = this.getCellValue(jsonData, netIncomeRow, col);
      
      // If we don't have specific rent income data, use total operating income for rent income
      const finalRentIncome = rentIncome > 0 ? rentIncome : totalOperatingIncome;
      
      cashFlowData.push({
        assetId,
        rentIncome: finalRentIncome,
        section8Rent,
        totalOperatingIncome: totalOperatingIncome || finalRentIncome,
        totalOperatingExpense,
        noi,
        netIncome
      });
    }

    console.log(`Loaded cash flow data for ${cashFlowData.length} properties`);
    return cashFlowData;
  }

  private loadBalanceSheetData(): BalanceSheetData[] {
    console.log('Loading balance sheet data from >>Balance');
    const worksheet = this.workbook.Sheets['>>Balance'];
    if (!worksheet) {
      console.warn('>>Balance sheet not found');
      return [];
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    const balanceSheetData: BalanceSheetData[] = [];

    // Try to find property headers in various rows (typically row 5-7)
    let headerRow: any[] = [];
    let headerRowIndex = -1;
    
    for (let i = 5; i <= 8; i++) {
      if (jsonData[i]) {
        const row = jsonData[i];
        const hasProperties = row.some(cell => 
          typeof cell === 'string' && cell.match(/^S\d{4}/)
        );
        if (hasProperties) {
          headerRow = row;
          headerRowIndex = i;
          console.log(`Found property headers in balance sheet at row ${i}`);
          break;
        }
      }
    }
    
    if (headerRowIndex === -1) {
      console.warn('No property headers found in balance sheet');
      return [];
    }

    const propertyColumns: { [key: number]: string } = {};
    for (let i = 1; i < headerRow.length; i++) {
      const header = String(headerRow[i] || '');
      const match = header.match(/^(S\d{4})/);
      if (match) {
        propertyColumns[i] = match[1];
        console.log(`Found property ${match[1]} at column ${i} in balance sheet`);
      }
    }

    // Search for key balance sheet rows with flexible matching
    const operatingCashRow = this.findRowByAccountName(jsonData, 'Operating Cash') || 
                            this.findRowByAccountName(jsonData, 'Cash - Operating');
    const securityDepositCashRow = this.findRowByAccountName(jsonData, 'Security Deposit Cash') || 
                                  this.findRowByAccountName(jsonData, 'Cash - Security');
    const totalCashRow = this.findRowByAccountName(jsonData, 'Total Cash') ||
                        this.findRowByAccountName(jsonData, 'Cash Total');

    console.log('Balance sheet row mapping:', {
      operatingCashRow,
      securityDepositCashRow, 
      totalCashRow
    });

    for (const [colIndex, assetId] of Object.entries(propertyColumns)) {
      const col = parseInt(colIndex);
      
      const operatingCash = this.getCellValue(jsonData, operatingCashRow, col);
      const securityCash = this.getCellValue(jsonData, securityDepositCashRow, col);
      const totalCash = this.getCellValue(jsonData, totalCashRow, col);
      
      // If we can't find specific rows, try to extract any cash values
      let finalOperatingCash = operatingCash;
      let finalSecurityCash = securityCash;
      let finalTotalCash = totalCash;
      
      if (finalOperatingCash === 0 && finalSecurityCash === 0 && finalTotalCash === 0) {
        // Scan column for any reasonable cash amounts
        for (let row = headerRowIndex + 1; row < Math.min(headerRowIndex + 50, jsonData.length); row++) {
          const cellValue = this.getCellValue(jsonData, row, col);
          if (cellValue > 1000 && cellValue < 1000000) { // Reasonable cash range
            if (finalTotalCash === 0) finalTotalCash = cellValue;
            else if (finalOperatingCash === 0) finalOperatingCash = cellValue;
          }
        }
      }
      
      balanceSheetData.push({
        assetId,
        operatingCash: finalOperatingCash,
        securityDepositCash: finalSecurityCash,
        totalCash: finalTotalCash,
        totalAssets: finalTotalCash, // Simplified - could add more asset categories
        totalLiabilities: 0, // Would need to find liability sections
        netEquity: finalTotalCash // Simplified calculation
      });
    }

    console.log(`Loaded balance sheet data for ${balanceSheetData.length} properties`);
    return balanceSheetData;
  }

  private loadRentRollData(): RentRollData[] {
    console.log('Loading rent roll data from >>Rent Roll sheet');
    const worksheet = this.workbook.Sheets['>>Rent Roll'];
    if (!worksheet) return [];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    const rentRollData: RentRollData[] = [];

    // Header row is at index 5
    for (let i = 7; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || !row[0]) continue;

      const unitId = String(row[0]);
      const assetMatch = unitId.match(/^(S\d{4})/);
      if (!assetMatch) continue;

      const assetId = assetMatch[1];
      const propertyName = String(row[2] || '');
      const tenant = String(row[3] || '');
      const unit = String(row[4] || '');
      const status = String(row[6] || '');
      const totalRent = this.parseNumber(row[8]) || 0;

      rentRollData.push({
        assetId,
        unitId,
        tenant,
        unit,
        status,
        rentAmount: totalRent,
        totalRent
      });
    }

    console.log(`Loaded rent roll data for ${rentRollData.length} units`);
    return rentRollData;
  }

  private loadT12Data(): T12Data[] {
    console.log('Loading T12 data from >>T12 sheet');
    const worksheet = this.workbook.Sheets['>>T12'];
    if (!worksheet) return [];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    const t12Data: T12Data[] = [];

    // Property headers are in row 0, months in row 8
    const propertyHeaderRow = jsonData[0];
    const monthHeaderRow = jsonData[8];
    if (!propertyHeaderRow || !monthHeaderRow) return [];

    // Map property columns
    const propertyColumns: { [key: number]: string } = {};
    for (let i = 1; i < propertyHeaderRow.length; i++) {
      const header = String(propertyHeaderRow[i]).trim();
      const match = header.match(/^(S\d{4})/);
      if (match) {
        propertyColumns[i] = match[1];
        // Each property has multiple month columns, we'll take the July column (typically +6 from start)
        for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
          if (i + monthOffset < monthHeaderRow.length) {
            const monthHeader = String(monthHeaderRow[i + monthOffset]);
            if (monthHeader.includes('Jul-25') || monthHeader.includes('Jul')) {
              propertyColumns[i + monthOffset] = match[1];
              break;
            }
          }
        }
      }
    }

    // Find key financial rows
    const rentIncomeRow = this.findRowByAccountName(jsonData, 'Rent Income');
    const section8Row = this.findRowByAccountName(jsonData, 'Section 8 Rent');

    for (const [colIndex, assetId] of Object.entries(propertyColumns)) {
      const col = parseInt(colIndex);
      
      t12Data.push({
        assetId,
        month: '2025-07',
        rentIncome: this.getCellValue(jsonData, rentIncomeRow, col),
        section8Rent: this.getCellValue(jsonData, section8Row, col),
        totalIncome: 0, // Would need to calculate
        totalExpenses: 0, // Would need to calculate  
        noi: 0 // Would need to calculate
      });
    }

    console.log(`Loaded T12 data for ${t12Data.length} property-months`);
    return t12Data;
  }

  private findRowByAccountName(data: any[][], accountName: string): number {
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row && String(row[1]).toLowerCase().includes(accountName.toLowerCase())) {
        return i;
      }
    }
    return -1;
  }

  private getCellValue(data: any[][], row: number, col: number): number {
    if (row === -1 || !data[row] || col >= data[row].length) return 0;
    return this.parseNumber(data[row][col]) || 0;
  }

  private parseNumber(value: any): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  private getPortfolioName(assetId: string): string {
    // Simple portfolio mapping based on asset ID patterns
    const id = parseInt(assetId.substring(1));
    if (id >= 1 && id <= 10) return 'Hartford 1';
    if (id >= 11 && id <= 20) return 'North End';
    if (id >= 21 && id <= 24) return 'South End';
    return 'Other';
  }

  private calculatePortfolioSummary(properties: PropertyMaster[], cashFlow: CashFlowData[]) {
    const totalProperties = properties.length;
    const totalUnits = properties.reduce((sum, p) => sum + p.units, 0);
    const totalRentIncome = cashFlow.reduce((sum, cf) => sum + cf.rentIncome, 0);
    const totalNOI = cashFlow.reduce((sum, cf) => sum + cf.noi, 0);
    
    return {
      totalProperties,
      totalUnits,
      totalRentIncome,
      totalNOI,
      averageOccupancy: 95.0 // Would need to calculate from rent roll
    };
  }
}

export async function loadComprehensiveExcelData(customFilePath?: string): Promise<ComprehensiveExcelData> {
  try {
    const filePath = customFilePath || 'd:/WORK Files/Stanton/Monthly Review_DataOnly.xlsx';
    console.log('Loading Excel data from:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.warn('Excel file not found at:', filePath);
      return {
        lastUpdated: new Date().toISOString(),
        properties: [],
        cashFlowData: [],
        balanceSheetData: [],
        rentRollData: [],
        t12Data: [],
        portfolioSummary: {
          totalProperties: 0,
          totalUnits: 0,
          totalRentIncome: 0,
          totalNOI: 0,
          averageOccupancy: 0
        }
      };
    }
    
    const loader = new ComprehensiveExcelLoader(filePath);
    return loader.loadAllData();
  } catch (error) {
    console.error('Error loading comprehensive Excel data:', error);
    throw error;
  }
}