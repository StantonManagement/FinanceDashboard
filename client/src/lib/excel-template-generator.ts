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
  
  // Portfolio Overview Sheet
  const portfolioOverview = [
    ['Stanton Management LLC - Complete Portfolio Template', '', '', '', ''],
    ['Generated:', new Date().toISOString().split('T')[0], '', '', ''],
    ['', '', '', '', ''],
    ['Portfolio Summary', '', '', '', ''],
    ['Portfolio', 'Properties', 'Total Units', 'Total NOI', 'Avg Cap Rate'],
    ['Hartford 1', '1', '6', '$6,800', '12.2%'],
    ['South End', '2', '51', '$37,700', '12.1%'],
    ['North End', '2', '40', '$32,400', '11.6%'],
    ['90 Park', '1', '12', '$9,800', '8.9%'],
    ['Consolidated', '6', '109', '$86,700', '11.2%'],
    ['', '', '', '', ''],
    ['Property Details', '', '', '', ''],
    ['Code', 'Name', 'Portfolio', 'Units', 'Monthly NOI'],
    ['S0010', '228 Maple', 'Hartford 1', '6', '$6,800'],
    ['S0020', '150 Union Street', 'South End', '24', '$18,500'],
    ['S0021', '425 Broadway', 'South End', '27', '$19,200'],
    ['N0030', '88 Salem Street', 'North End', '18', '$14,800'],
    ['N0031', '205 Hanover Street', 'North End', '22', '$17,600'],
    ['P0040', '90 Park Street', '90 Park', '12', '$9,800'],
    ['', '', '', '', ''],
    ['Instructions:', '', '', '', ''],
    ['1. Each property has its own data sheet', '', '', '', ''],
    ['2. Update GL account data in individual property sheets', '', '', '', ''],
    ['3. Use exact GL codes and account types', '', '', '', ''],
    ['4. Upload completed file to dashboard', '', '', '', '']
  ];
  
  const portfolioWS = XLSX.utils.aoa_to_sheet(portfolioOverview);
  portfolioWS['!cols'] = [
    { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(workbook, portfolioWS, 'Portfolio Overview');
  
  // Create individual property sheets
  const properties = [
    { code: 'S0010', name: '228 Maple', portfolio: 'Hartford 1', revenue: 10680, expenses: 4260 },
    { code: 'S0020', name: '150 Union Street', portfolio: 'South End', revenue: 35400, expenses: 16900 },
    { code: 'S0021', name: '425 Broadway', portfolio: 'South End', revenue: 41850, expenses: 22650 },
    { code: 'N0030', name: '88 Salem Street', portfolio: 'North End', revenue: 28800, expenses: 14000 },
    { code: 'N0031', name: '205 Hanover Street', portfolio: 'North End', revenue: 35200, expenses: 17600 },
    { code: 'P0040', name: '90 Park Street', portfolio: '90 Park', revenue: 18960, expenses: 9160 }
  ];

  properties.forEach(property => {
    // Calculate property-specific balance sheet values based on property scale
    const assetMultiplier = property.revenue / 10680; // Hartford 1 baseline
    const basePropertyValue = 2840000;
    const baseCash = 156000;
    const baseMortgage = 1850000;
    
    const propertyData = [
      [`${property.code} - ${property.name}`, '', '', '', '', '', '', ''],
      [`Portfolio: ${property.portfolio}`, '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['GL Code', 'Description', 'Current Month', 'Prior Month', 'YTD', 'Budget', 'Type', 'Category'],
      // Revenue accounts
      ['4105', 'Rental Income - Gross', Math.round(property.revenue * 0.85), Math.round(property.revenue * 0.82), Math.round(property.revenue * 10.2), Math.round(property.revenue * 10), 'revenue', 'Income'],
      ['4110', 'Section 8 Housing Assistance', Math.round(property.revenue * 0.08), Math.round(property.revenue * 0.08), Math.round(property.revenue * 0.96), Math.round(property.revenue * 0.96), 'revenue', 'Income'],
      ['4120', 'Other Income', Math.round(property.revenue * 0.07), Math.round(property.revenue * 0.05), Math.round(property.revenue * 0.84), Math.round(property.revenue * 0.7), 'revenue', 'Income'],
      // Expense accounts
      ['6105', 'Property Management Fee', Math.round(property.expenses * 0.15), Math.round(property.expenses * 0.14), Math.round(property.expenses * 1.8), Math.round(property.expenses * 1.7), 'expense', 'Management'],
      ['6110', 'Maintenance & Repairs', Math.round(property.expenses * 0.45), Math.round(property.expenses * 0.35), Math.round(property.expenses * 5.4), Math.round(property.expenses * 4.5), 'expense', 'Maintenance'],
      ['6120', 'Utilities - Common Areas', Math.round(property.expenses * 0.12), Math.round(property.expenses * 0.11), Math.round(property.expenses * 1.44), Math.round(property.expenses * 1.4), 'expense', 'Utilities'],
      ['6130', 'Property Insurance', Math.round(property.expenses * 0.08), Math.round(property.expenses * 0.08), Math.round(property.expenses * 0.96), Math.round(property.expenses * 0.96), 'expense', 'Insurance'],
      ['6140', 'Real Estate Taxes', Math.round(property.expenses * 0.2), Math.round(property.expenses * 0.2), Math.round(property.expenses * 2.4), Math.round(property.expenses * 2.4), 'expense', 'Taxes']
    ];

    const propertyWS = XLSX.utils.aoa_to_sheet(propertyData);
    propertyWS['!cols'] = [
      { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(workbook, propertyWS, property.code);
    
    // Individual Balance Sheet for each property
    const balanceSheetData = [
      [`${property.code} Balance Sheet`, '', '', '', '', ''],
      [`${property.name} - ${property.portfolio}`, '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['Account Category', 'Account Name', 'Account Code', 'Current Balance', 'Prior Balance', 'Type'],
      ['ASSETS', '', '', '', '', ''],
      ['Current Assets', 'Cash & Equivalents', '1100', Math.round(baseCash * assetMultiplier), Math.round(baseCash * assetMultiplier * 0.91), 'asset'],
      ['Current Assets', 'Accounts Receivable', '1200', Math.round(12500 * assetMultiplier), Math.round(8900 * assetMultiplier), 'asset'],
      ['Current Assets', 'Prepaid Expenses', '1300', Math.round(8500 * assetMultiplier), Math.round(7200 * assetMultiplier), 'asset'],
      ['Fixed Assets', 'Property Value (Appraised)', '1500', Math.round(basePropertyValue * assetMultiplier), Math.round(basePropertyValue * assetMultiplier), 'asset'],
      ['Fixed Assets', 'Equipment & Fixtures', '1600', Math.round(45000 * assetMultiplier), Math.round(48000 * assetMultiplier), 'asset'],
      ['Fixed Assets', 'Accumulated Depreciation', '1650', -Math.round(125000 * assetMultiplier), -Math.round(118000 * assetMultiplier), 'asset'],
      ['', '', '', '', '', ''],
      ['LIABILITIES', '', '', '', '', ''],
      ['Current Liabilities', 'Accounts Payable', '2100', Math.round(8500 * assetMultiplier), Math.round(6200 * assetMultiplier), 'liability'],
      ['Current Liabilities', 'Security Deposits', '2200', Math.round(10400 * assetMultiplier), Math.round(10400 * assetMultiplier), 'liability'],
      ['Long-term Debt', 'Mortgage Payable', '2500', Math.round(baseMortgage * assetMultiplier), Math.round(baseMortgage * assetMultiplier * 1.008), 'liability'],
      ['', '', '', '', '', ''],
      ['EQUITY', '', '', '', '', ''],
      ['Owner Equity', 'Owner Contributions', '3100', Math.round(450000 * assetMultiplier), Math.round(450000 * assetMultiplier), 'equity'],
      ['Owner Equity', 'Retained Earnings', '3200', Math.round(634000 * assetMultiplier), Math.round(595900 * assetMultiplier), 'equity']
    ];

    const balanceSheetWS = XLSX.utils.aoa_to_sheet(balanceSheetData);
    balanceSheetWS['!cols'] = [
      { wch: 18 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(workbook, balanceSheetWS, `${property.code}-BS`);
  });
  
  // Consolidated Balance Sheet Template
  const consolidatedBalanceSheet = [
    ['Consolidated Portfolio Balance Sheet', '', '', '', '', ''],
    ['All Properties Combined', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['Account Category', 'Account Name', 'Account Code', 'Current Balance', 'Prior Balance', 'Type'],
    ['ASSETS', '', '', '', '', ''],
    ['Current Assets', 'Cash & Equivalents', '1100', 985000, 890000, 'asset'],
    ['Current Assets', 'Accounts Receivable', '1200', 78000, 55000, 'asset'],
    ['Current Assets', 'Prepaid Expenses', '1300', 52000, 44000, 'asset'],
    ['Fixed Assets', 'Property Value (Appraised)', '1500', 18550000, 18550000, 'asset'],
    ['Fixed Assets', 'Equipment & Fixtures', '1600', 285000, 305000, 'asset'],
    ['Fixed Assets', 'Accumulated Depreciation', '1650', -820000, -770000, 'asset'],
    ['', '', '', '', '', ''],
    ['LIABILITIES', '', '', '', '', ''],
    ['Current Liabilities', 'Accounts Payable', '2100', 55000, 38000, 'liability'],
    ['Current Liabilities', 'Security Deposits', '2200', 68000, 68000, 'liability'],
    ['Long-term Debt', 'Mortgage Payable', '2500', 12100000, 12200000, 'liability'],
    ['', '', '', '', '', ''],
    ['EQUITY', '', '', '', '', ''],
    ['Owner Equity', 'Owner Contributions', '3100', 2950000, 2950000, 'equity'],
    ['Owner Equity', 'Retained Earnings', '3200', 4157000, 3904000, 'equity']
  ];
  
  const consolidatedBS = XLSX.utils.aoa_to_sheet(consolidatedBalanceSheet);
  consolidatedBS['!cols'] = [
    { wch: 18 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(workbook, consolidatedBS, 'Consolidated-BS');
  
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

export function downloadExcelTemplate() {
  const buffer = generateExcelTemplate();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `Stanton-Portfolio-Template-${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  
  URL.revokeObjectURL(url);
}