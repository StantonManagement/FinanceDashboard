import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { storage } from './storage';

export interface ExcelData {
  sheetNames: string[];
  hartfordData: {
    rentIncome: number;
    section8Rent: number;
    otherIncome: number;
    totalRevenue: number;
    propertyMgmt: number;
    maintenance: number;
    utilities: number;
    insurance: number;
    taxes: number;
    totalExpenses: number;
    noi: number;
  } | null;
}

export async function loadExcelData(): Promise<ExcelData> {
  try {
    const filePath = path.join(process.cwd(), 'monthly_review.xlsx');
    
    if (!fs.existsSync(filePath)) {
      console.warn('Excel file not found, using mock data');
      return { sheetNames: [], hartfordData: null };
    }

    console.log('Reading Excel file:', filePath);
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;
    
    console.log('Available sheets:', sheetNames);
    
    // Look for authoritative sheets (starting with >>)
    const authSheets = sheetNames.filter(name => name.startsWith('>>'));
    console.log('Authoritative sheets:', authSheets);

    let hartfordData = null;

    // Process each authoritative sheet to find Hartford 1/S0010 data
    for (const sheetName of authSheets) {
      console.log(`Processing sheet: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) continue;

      // Convert to JSON array for processing
      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Look for Hartford 1 or S0010 property data
      const propertyData = findHartfordData(jsonData, sheetName);
      if (propertyData && propertyData.totalRevenue > 0) {
        hartfordData = propertyData;
        console.log('Found Hartford data in sheet:', sheetName, propertyData);
        break;
      } else if (propertyData) {
        console.log(`Found Hartford indicators in ${sheetName} but no revenue data:`, propertyData);
      }
    }

    return {
      sheetNames,
      hartfordData
    };

  } catch (error) {
    console.error('Error loading Excel data:', error);
    return { sheetNames: [], hartfordData: null };
  }
}

function findHartfordData(data: any[][], sheetName: string): ExcelData['hartfordData'] {
  // First pass: Find S0010 column index
  let s0010ColumnIndex = -1;
  
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (typeof cell === 'string' && cell.includes('S0010')) {
        s0010ColumnIndex = j;
        console.log(`Found S0010 column at index ${j} in row ${i}:`, cell);
        break;
      }
    }
    
    if (s0010ColumnIndex >= 0) break;
  }

  if (s0010ColumnIndex >= 0) {
    // Extract data from the S0010 column
    return extractColumnData(data, s0010ColumnIndex, sheetName);
  }

  // If no specific property column found, look for GL account patterns across the sheet
  return extractGLAccountData(data, sheetName);
}

function extractColumnData(data: any[][], columnIndex: number, sheetName: string): ExcelData['hartfordData'] {
  const financialData = {
    rentIncome: 0,
    section8Rent: 0,
    otherIncome: 0,
    totalRevenue: 0,
    propertyMgmt: 0,
    maintenance: 0,
    utilities: 0,
    insurance: 0,
    taxes: 0,
    totalExpenses: 0,
    noi: 0
  };

  // Look through the column for GL account patterns
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length <= columnIndex) continue;

    // Check if first column contains GL account code
    const firstCell = row[0];
    const targetValue = row[columnIndex];
    
    if (typeof firstCell === 'string' && targetValue && typeof targetValue === 'number' && Math.abs(targetValue) > 0) {
      const cellText = firstCell.toLowerCase();
      const amount = Math.abs(targetValue);
      
      console.log(`Found GL account data: ${firstCell} = ${amount}`);
      
      // Revenue accounts (4xxx)
      if (cellText.includes('4105') || cellText.includes('rent income')) {
        financialData.rentIncome = amount;
      } else if (cellText.includes('4110') || cellText.includes('section 8')) {
        financialData.section8Rent = amount;
      } else if (cellText.match(/^4\d{3}/) || (cellText.includes('4') && cellText.includes('income'))) {
        financialData.otherIncome += amount;
      }
      
      // Expense accounts (6xxx)
      else if (cellText.includes('6105') || cellText.includes('property management')) {
        financialData.propertyMgmt = amount;
      } else if (cellText.includes('6110') || cellText.includes('maintenance')) {
        financialData.maintenance = amount;
      } else if (cellText.includes('6120') || cellText.includes('utilities')) {
        financialData.utilities = amount;
      } else if (cellText.includes('6130') || cellText.includes('insurance')) {
        financialData.insurance = amount;
      } else if (cellText.includes('6140') || cellText.includes('taxes') || cellText.includes('tax')) {
        financialData.taxes = amount;
      }
    }
  }

  // Calculate totals
  financialData.totalRevenue = financialData.rentIncome + financialData.section8Rent + financialData.otherIncome;
  financialData.totalExpenses = financialData.propertyMgmt + financialData.maintenance + 
                               financialData.utilities + financialData.insurance + financialData.taxes;
  financialData.noi = financialData.totalRevenue - financialData.totalExpenses;

  console.log('Extracted column financial data:', financialData);
  return financialData;
}

function extractFinancialData(data: any[][], startRow: number, sheetName: string): ExcelData['hartfordData'] {
  // Look for financial data in the vicinity of the property row
  const searchRange = 20; // Look 20 rows above and below
  const startIndex = Math.max(0, startRow - searchRange);
  const endIndex = Math.min(data.length, startRow + searchRange);

  const financialData = {
    rentIncome: 0,
    section8Rent: 0,
    otherIncome: 0,
    totalRevenue: 0,
    propertyMgmt: 0,
    maintenance: 0,
    utilities: 0,
    insurance: 0,
    taxes: 0,
    totalExpenses: 0,
    noi: 0
  };

  for (let i = startIndex; i < endIndex; i++) {
    const row = data[i];
    if (!row || row.length < 2) continue;

    // Look for GL account codes and amounts
    for (let j = 0; j < row.length - 1; j++) {
      const cell = row[j];
      const nextCell = row[j + 1];

      if (typeof cell === 'string' || typeof cell === 'number') {
        const cellText = cell.toString().toLowerCase();
        const amount = parseFloat(nextCell) || 0;

        // Revenue accounts (4xxx)
        if (cellText.includes('4105') || cellText.includes('rent income')) {
          financialData.rentIncome = Math.abs(amount);
        } else if (cellText.includes('4110') || cellText.includes('section 8')) {
          financialData.section8Rent = Math.abs(amount);
        } else if (cellText.includes('4') && cellText.includes('income')) {
          financialData.otherIncome = Math.abs(amount);
        }
        
        // Expense accounts (6xxx)
        else if (cellText.includes('6105') || cellText.includes('property management')) {
          financialData.propertyMgmt = Math.abs(amount);
        } else if (cellText.includes('6110') || cellText.includes('maintenance')) {
          financialData.maintenance = Math.abs(amount);
        } else if (cellText.includes('6120') || cellText.includes('utilities')) {
          financialData.utilities = Math.abs(amount);
        } else if (cellText.includes('6130') || cellText.includes('insurance')) {
          financialData.insurance = Math.abs(amount);
        } else if (cellText.includes('6140') || cellText.includes('taxes')) {
          financialData.taxes = Math.abs(amount);
        }
      }
    }
  }

  // Calculate totals
  financialData.totalRevenue = financialData.rentIncome + financialData.section8Rent + financialData.otherIncome;
  financialData.totalExpenses = financialData.propertyMgmt + financialData.maintenance + 
                               financialData.utilities + financialData.insurance + financialData.taxes;
  financialData.noi = financialData.totalRevenue - financialData.totalExpenses;

  console.log('Extracted financial data:', financialData);
  return financialData;
}

function extractGLAccountData(data: any[][], sheetName: string): ExcelData['hartfordData'] {
  // Fallback: look for any GL account patterns in the sheet
  const financialData = {
    rentIncome: 0,
    section8Rent: 0,
    otherIncome: 0,
    totalRevenue: 0,
    propertyMgmt: 0,
    maintenance: 0,
    utilities: 0,
    insurance: 0,
    taxes: 0,
    totalExpenses: 0,
    noi: 0
  };

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 2) continue;

    for (let j = 0; j < row.length - 1; j++) {
      const cell = row[j];
      if (typeof cell === 'string' && /^[4-6]\d{3}$/.test(cell)) {
        // Found GL account code, look for amount in nearby cells
        for (let k = j + 1; k < Math.min(j + 5, row.length); k++) {
          const amount = parseFloat(row[k]);
          if (amount && Math.abs(amount) > 0) {
            const glCode = cell;
            
            // Map GL codes to categories
            if (glCode === '4105') financialData.rentIncome = Math.abs(amount);
            else if (glCode === '4110') financialData.section8Rent = Math.abs(amount);
            else if (glCode.startsWith('4')) financialData.otherIncome += Math.abs(amount);
            else if (glCode === '6105') financialData.propertyMgmt = Math.abs(amount);
            else if (glCode === '6110') financialData.maintenance = Math.abs(amount);
            else if (glCode === '6120') financialData.utilities = Math.abs(amount);
            else if (glCode === '6130') financialData.insurance = Math.abs(amount);
            else if (glCode === '6140') financialData.taxes = Math.abs(amount);
            
            break;
          }
        }
      }
    }
  }

  // Calculate totals
  financialData.totalRevenue = financialData.rentIncome + financialData.section8Rent + financialData.otherIncome;
  financialData.totalExpenses = financialData.propertyMgmt + financialData.maintenance + 
                               financialData.utilities + financialData.insurance + financialData.taxes;
  financialData.noi = financialData.totalRevenue - financialData.totalExpenses;

  if (financialData.totalRevenue > 0) {
    console.log('Extracted GL account data:', financialData);
    return financialData;
  }

  return null;
}

export async function updateStorageWithExcelData() {
  console.log('Loading Excel data and updating storage...');
  const excelData = await loadExcelData();
  
  if (excelData.hartfordData) {
    console.log('Updating storage with real Excel data...');
    
    // Find Hartford 1 property
    const properties = await storage.getAllProperties();
    const hartfordProperty = properties.find(p => p.code === 'S0010');
    
    if (hartfordProperty) {
      // Clear existing GL accounts
      await storage.deleteGLAccountsByProperty(hartfordProperty.id);
      
      const currentMonth = "2024-01";
      const data = excelData.hartfordData;
      
      // Create GL accounts with real data
      if (data.rentIncome > 0) {
        await storage.createGLAccount({
          propertyId: hartfordProperty.id,
          code: "4105",
          description: "Rent Income",
          amount: data.rentIncome,
          type: "revenue",
          month: currentMonth
        });
      }
      
      if (data.section8Rent > 0) {
        await storage.createGLAccount({
          propertyId: hartfordProperty.id,
          code: "4110",
          description: "Section 8 Rent",
          amount: data.section8Rent,
          type: "revenue",
          month: currentMonth
        });
      }
      
      if (data.propertyMgmt > 0) {
        await storage.createGLAccount({
          propertyId: hartfordProperty.id,
          code: "6105",
          description: "Property Management",
          amount: data.propertyMgmt,
          type: "expense",
          month: currentMonth
        });
      }
      
      if (data.maintenance > 0) {
        await storage.createGLAccount({
          propertyId: hartfordProperty.id,
          code: "6110",
          description: "Maintenance & Repairs",
          amount: data.maintenance,
          type: "expense",
          month: currentMonth
        });
      }
      
      if (data.utilities > 0) {
        await storage.createGLAccount({
          propertyId: hartfordProperty.id,
          code: "6120",
          description: "Utilities",
          amount: data.utilities,
          type: "expense",
          month: currentMonth
        });
      }
      
      if (data.insurance > 0) {
        await storage.createGLAccount({
          propertyId: hartfordProperty.id,
          code: "6130",
          description: "Property Insurance",
          amount: data.insurance,
          type: "expense",
          month: currentMonth
        });
      }
      
      if (data.taxes > 0) {
        await storage.createGLAccount({
          propertyId: hartfordProperty.id,
          code: "6140",
          description: "Property Taxes",
          amount: data.taxes,
          type: "expense",
          month: currentMonth
        });
      }
      
      console.log('Successfully updated GL accounts with Excel data');
      console.log(`Total Revenue: $${data.totalRevenue.toLocaleString()}`);
      console.log(`Total Expenses: $${data.totalExpenses.toLocaleString()}`);
      console.log(`NOI: $${data.noi.toLocaleString()}`);
      
    } else {
      console.warn('Hartford property (S0010) not found in storage');
    }
  } else {
    console.warn('No Hartford data found in Excel file');
  }
}