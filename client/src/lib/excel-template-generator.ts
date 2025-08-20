import * as XLSX from 'xlsx';

// Template structure for Hartford 1 property data
export interface PropertyData {
  propertyCode: string;
  propertyName: string;
  portfolioName: string;
  glAccounts: GLAccountData[];
}

export interface GLAccountData {
  code: string;
  description: string;
  currentMonth: number;
  priorMonth: number;
  ytd: number;
  budget: number;
  type: 'revenue' | 'expense';
  category: string;
}

export function generateExcelTemplate(): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  
  // Property Information Sheet
  const propertyInfo = [
    ['Property Management Dashboard - Data Input Template', '', '', ''],
    ['', '', '', ''],
    ['Property Information', '', '', ''],
    ['Property Code', 'S0010', '', ''],
    ['Property Name', '228 Maple', '', ''],
    ['Portfolio', 'Hartford 1', '', ''],
    ['Units', '6', '', ''],
    ['Last Updated', new Date().toISOString().split('T')[0], '', ''],
    ['', '', '', ''],
    ['Instructions:', '', '', ''],
    ['1. Fill in the GL Account Data sheet with your financial data', '', '', ''],
    ['2. Use exact GL codes (4105, 6110, etc.)', '', '', ''],
    ['3. Amounts should be positive numbers', '', '', ''],
    ['4. Type should be "revenue" or "expense"', '', '', ''],
    ['5. Save file and upload to dashboard', '', '', '']
  ];
  
  const propertyInfoWS = XLSX.utils.aoa_to_sheet(propertyInfo);
  XLSX.utils.book_append_sheet(workbook, propertyInfoWS, 'Property Info');
  
  // GL Account Template Sheet
  const glAccountTemplate = [
    ['GL Code', 'Description', 'Current Month', 'Prior Month', 'YTD', 'Budget', 'Type', 'Category'],
    ['4105', 'Rental Income - Gross', 10200, 9950, 121800, 118500, 'revenue', 'Income'],
    ['4110', 'Section 8 Housing Assistance', 300, 300, 3600, 3600, 'revenue', 'Income'],
    ['4120', 'Other Income', 180, 85, 1425, 1200, 'revenue', 'Income'],
    ['6105', 'Property Management Fee', 525, 517, 6263, 6000, 'expense', 'Management'],
    ['6110', 'Maintenance & Repairs', 1950, 1420, 18750, 15000, 'expense', 'Maintenance'],
    ['6115', 'Landscaping & Grounds', 285, 200, 2850, 2400, 'expense', 'Maintenance'],
    ['6120', 'Utilities - Common Areas', 420, 390, 4680, 4800, 'expense', 'Utilities'],
    ['6125', 'Trash & Recycling', 125, 85, 1275, 1200, 'expense', 'Utilities'],
    ['6130', 'Property Insurance', 285, 285, 3420, 3420, 'expense', 'Insurance'],
    ['6140', 'Real Estate Taxes', 815, 815, 9780, 9780, 'expense', 'Taxes'],
    ['6150', 'Legal & Professional', 150, 200, 1950, 2400, 'expense', 'Administrative'],
    ['6160', 'Office & Administrative', 75, 45, 720, 600, 'expense', 'Administrative']
  ];
  
  const glAccountWS = XLSX.utils.aoa_to_sheet(glAccountTemplate);
  
  // Set column widths
  glAccountWS['!cols'] = [
    { wch: 10 }, // GL Code
    { wch: 25 }, // Description
    { wch: 15 }, // Current Month
    { wch: 15 }, // Prior Month
    { wch: 15 }, // YTD
    { wch: 15 }, // Budget
    { wch: 12 }, // Type
    { wch: 15 }  // Category
  ];
  
  XLSX.utils.book_append_sheet(workbook, glAccountWS, 'GL Account Data');
  
  // Balance Sheet Template
  const balanceSheetTemplate = [
    ['Account Category', 'Account Name', 'Account Code', 'Current Balance', 'Prior Balance', 'Type'],
    ['ASSETS', '', '', '', '', ''],
    ['Current Assets', 'Cash & Equivalents', '1100', 156000, 142000, 'asset'],
    ['Current Assets', 'Accounts Receivable', '1200', 12500, 8900, 'asset'],
    ['Current Assets', 'Prepaid Expenses', '1300', 8500, 7200, 'asset'],
    ['Fixed Assets', 'Property Value (Appraised)', '1500', 2840000, 2840000, 'asset'],
    ['Fixed Assets', 'Equipment & Fixtures', '1600', 45000, 48000, 'asset'],
    ['Fixed Assets', 'Accumulated Depreciation', '1650', -125000, -118000, 'asset'],
    ['', '', '', '', '', ''],
    ['LIABILITIES', '', '', '', '', ''],
    ['Current Liabilities', 'Accounts Payable', '2100', 8500, 6200, 'liability'],
    ['Current Liabilities', 'Security Deposits', '2200', 10400, 10400, 'liability'],
    ['Long-term Debt', 'Mortgage Payable', '2500', 1850000, 1865000, 'liability'],
    ['', '', '', '', '', ''],
    ['EQUITY', '', '', '', '', ''],
    ['Owner Equity', 'Owner Contributions', '3100', 450000, 450000, 'equity'],
    ['Owner Equity', 'Retained Earnings', '3200', 634000, 595900, 'equity']
  ];
  
  const balanceSheetWS = XLSX.utils.aoa_to_sheet(balanceSheetTemplate);
  balanceSheetWS['!cols'] = [
    { wch: 18 }, // Account Category
    { wch: 25 }, // Account Name
    { wch: 12 }, // Account Code
    { wch: 15 }, // Current Balance
    { wch: 15 }, // Prior Balance
    { wch: 12 }  // Type
  ];
  
  XLSX.utils.book_append_sheet(workbook, balanceSheetWS, 'Balance Sheet');
  
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

export function downloadExcelTemplate() {
  const buffer = generateExcelTemplate();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `Hartford-1-Data-Template-${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  
  URL.revokeObjectURL(url);
}