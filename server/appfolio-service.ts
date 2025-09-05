// Environment variables are automatically loaded in this project

interface AppfolioT12Item {
  AccountName: string;
  AccountCode: string;
  Slice00: string;
  Slice01: string;
  Slice02: string;
  Slice03: string;
  Slice04: string;
  Slice05: string;
  Slice06: string;
  Slice07: string;
  Slice08: string;
  Slice09: string;
  Slice10: string;
  Slice11: string;
  SliceTotal: string;
}

interface ProcessedT12Data {
  revenue: {
    monthlyData: number[];
    total: number;
    average: number;
    volatility: number;
  };
  expenses: {
    monthlyData: number[];
    total: number;
    average: number;
    volatility: number;
  };
  netIncome: {
    monthlyData: number[];
    total: number;
    average: number;
    volatility: number;
  };
  occupancyAnalysis: {
    averageOccupancy: number;
    volatility: number;
    trend: string;
  };
  rawData: AppfolioT12Item[];
}

interface AppfolioBalanceSheetItem {
  AccountName: string;
  AccountCode: string;
  Balance: string;
  [key: string]: any;
}

interface ProcessedBalanceSheetData {
  assets: {
    current: AppfolioBalanceSheetItem[];
    fixed: AppfolioBalanceSheetItem[];
    total: number;
  };
  liabilities: {
    current: AppfolioBalanceSheetItem[];
    longTerm: AppfolioBalanceSheetItem[];
    total: number;
  };
  equity: {
    items: AppfolioBalanceSheetItem[];
    total: number;
  };
  rawData: AppfolioBalanceSheetItem[];
}

interface AppfolioCashFlowItem {
  AccountName: string;
  AccountCode: string;
  SelectedPeriod: string;
  SelectedPeriodPercent: string;
  FiscalYearToDate: string;
  FiscalYearToDatePercent: string;
  [key: string]: any;
}

interface ProcessedCashFlowData {
  operatingActivities: {
    items: AppfolioCashFlowItem[];
    total: number;
  };
  investingActivities: {
    items: AppfolioCashFlowItem[];
    total: number;
  };
  financingActivities: {
    items: AppfolioCashFlowItem[];
    total: number;
  };
  netCashFlow: number;
  cashAtBeginning: number;
  cashAtEnd: number;
  rawData: AppfolioCashFlowItem[];
}

export class AppfolioService {
  private static readonly BASE_URL_V0 = 'https://stantonmgmt.appfolio.com/api/v0';
  private static readonly BASE_URL_V1 = 'https://stantonmgmt.appfolio.com/api/v1';

  private static getAuthHeader(): string {
    console.log('🔐 Checking Appfolio credentials...');
    console.log('🔍 Environment variables check:');
    console.log('All env keys:', Object.keys(process.env).filter(key => key.includes('APPFOLIO')));
    
    const CLIENT_ID = process.env.APPFOLIO_CLIENT_ID;
    const CLIENT_SECRET = process.env.APPFOLIO_CLIENT_SECRET;
    
    console.log('CLIENT_ID:', CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('CLIENT_SECRET:', CLIENT_SECRET ? 'SET' : 'NOT SET');
    
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error('❌ Missing credentials:', { CLIENT_ID, CLIENT_SECRET });
      throw new Error('Appfolio credentials not configured');
    }
    
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    return `Basic ${credentials}`;
  }

  static async fetchT12CashFlow(propertyId?: string): Promise<ProcessedT12Data> {
    try {
      console.log('🔵 Fetching T12 cash flow data from Appfolio API...');
      console.log('🏢 Property ID filter:', propertyId || 'All properties');
      
      const url = propertyId 
        ? `${this.BASE_URL_V0}/reports/twelve_month_cash_flow.json?properties=${propertyId}`
        : `${this.BASE_URL_V0}/reports/twelve_month_cash_flow.json`;
      
      console.log('📡 API URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Appfolio API error: ${response.status} ${response.statusText}`);
      }

      const rawData: AppfolioT12Item[] = await response.json();
      console.log(`📊 Retrieved ${rawData.length} T12 items from Appfolio`);

      return this.processT12Data(rawData);
    } catch (error) {
      console.error('❌ Error fetching T12 data from Appfolio:', error);
      throw error;
    }
  }

  static async fetchBalanceSheet(propertyId?: string): Promise<ProcessedBalanceSheetData> {
    try {
      console.log('🔵 Fetching Balance Sheet data from Appfolio API...');
      console.log('🏢 Property ID filter:', propertyId || 'All properties');
      
      const url = propertyId 
        ? `${this.BASE_URL_V1}/reports/balance_sheet.json?properties=${propertyId}`
        : `${this.BASE_URL_V1}/reports/balance_sheet.json`;
      
      console.log('📡 API URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Appfolio API error: ${response.status} ${response.statusText}`);
      }

      const rawData: AppfolioBalanceSheetItem[] = await response.json();
      console.log(`📊 Retrieved ${rawData.length} Balance Sheet items from Appfolio`);

      return this.processBalanceSheetData(rawData);
    } catch (error) {
      console.error('❌ Error fetching Balance Sheet data from Appfolio:', error);
      throw error;
    }
  }

  static async fetchCashFlow(propertyId?: string, fromDate?: string, toDate?: string): Promise<ProcessedCashFlowData> {
    try {
      console.log('🔵 Fetching Cash Flow data from Appfolio API...');
      console.log('🏢 Property ID filter:', propertyId || 'All properties');
      
      // Default to current month if no dates provided
      const defaultFromDate = fromDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const defaultToDate = toDate || new Date().toISOString().split('T')[0];
      
      let url = `${this.BASE_URL_V1}/reports/cash_flow.json?from_date=${defaultFromDate}&to_date=${defaultToDate}`;
      
      if (propertyId) {
        url += `&properties=${propertyId}`;
      }
      
      console.log('📡 API URL:', url);
      console.log('📅 Date range:', `${defaultFromDate} to ${defaultToDate}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Appfolio API error: ${response.status} ${response.statusText}`);
      }

      const rawData: AppfolioCashFlowItem[] = await response.json();
      console.log(`📊 Retrieved ${rawData.length} Cash Flow items from Appfolio`);

      return this.processCashFlowData(rawData);
    } catch (error) {
      console.error('❌ Error fetching Cash Flow data from Appfolio:', error);
      throw error;
    }
  }

  private static processT12Data(rawData: AppfolioT12Item[]): ProcessedT12Data {
    // Separate income and expense items
    const incomeItems = rawData.filter(item => 
      item.AccountCode?.startsWith('4') || 
      item.AccountName?.toLowerCase().includes('income') ||
      item.AccountName?.toLowerCase().includes('rent') ||
      item.AccountName === 'Total Income'
    );

    const expenseItems = rawData.filter(item => 
      (item.AccountCode?.startsWith('5') || item.AccountCode?.startsWith('6')) &&
      !item.AccountName?.toLowerCase().includes('income') ||
      item.AccountName === 'Total Expense'
    );

    // Calculate monthly revenue data
    const revenueMonthly = this.calculateMonthlyTotals(incomeItems);
    const expenseMonthly = this.calculateMonthlyTotals(expenseItems);
    const netIncomeMonthly = revenueMonthly.map((rev, i) => rev - expenseMonthly[i]);

    // Calculate statistics
    const revenueStats = this.calculateStats(revenueMonthly);
    const expenseStats = this.calculateStats(expenseMonthly);
    const netIncomeStats = this.calculateStats(netIncomeMonthly);

    // Calculate occupancy analysis (based on rent income variations)
    const rentItems = incomeItems.filter(item => 
      item.AccountName?.toLowerCase().includes('rent') && 
      !item.AccountName?.toLowerCase().includes('prepaid')
    );
    const rentMonthly = this.calculateMonthlyTotals(rentItems);
    const occupancyAnalysis = this.calculateOccupancyAnalysis(rentMonthly);

    return {
      revenue: {
        monthlyData: revenueMonthly,
        total: revenueStats.total,
        average: revenueStats.average,
        volatility: revenueStats.volatility
      },
      expenses: {
        monthlyData: expenseMonthly,
        total: expenseStats.total,
        average: expenseStats.average,
        volatility: expenseStats.volatility
      },
      netIncome: {
        monthlyData: netIncomeMonthly,
        total: netIncomeStats.total,
        average: netIncomeStats.average,
        volatility: netIncomeStats.volatility
      },
      occupancyAnalysis,
      rawData
    };
  }

  private static calculateMonthlyTotals(items: AppfolioT12Item[]): number[] {
    const monthlyTotals = new Array(12).fill(0);
    
    items.forEach(item => {
      // Skip total rows
      if (item.AccountName?.toLowerCase().includes('total')) return;
      
      for (let i = 0; i < 12; i++) {
        const sliceKey = `Slice${i.toString().padStart(2, '0')}` as keyof AppfolioT12Item;
        const value = this.parseMonetaryValue(item[sliceKey] as string);
        monthlyTotals[i] += value;
      }
    });

    return monthlyTotals;
  }

  private static parseMonetaryValue(value: string): number {
    if (!value || value === '0.00' || value === '-') return 0;
    
    // Remove commas, handle parentheses for negative values
    const cleaned = value.replace(/,/g, '');
    const isNegative = cleaned.includes('(') || cleaned.startsWith('-');
    const numericString = cleaned.replace(/[(),\-\$]/g, '');
    const parsed = parseFloat(numericString) || 0;
    
    return isNegative ? -Math.abs(parsed) : parsed;
  }

  private static calculateStats(monthlyData: number[]) {
    const total = monthlyData.reduce((sum, val) => sum + val, 0);
    const average = total / monthlyData.length;
    
    // Calculate standard deviation for volatility
    const variance = monthlyData.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / monthlyData.length;
    const stdDev = Math.sqrt(variance);
    const volatility = average !== 0 ? (stdDev / Math.abs(average)) * 100 : 0;

    return { total, average, volatility };
  }

  private static calculateOccupancyAnalysis(rentMonthly: number[]) {
    const maxRent = Math.max(...rentMonthly);
    const avgOccupancy = rentMonthly.reduce((sum, rent) => sum + (rent / maxRent) * 100, 0) / rentMonthly.length;
    
    // Calculate volatility
    const occupancyRates = rentMonthly.map(rent => (rent / maxRent) * 100);
    const avgRate = avgOccupancy;
    const variance = occupancyRates.reduce((sum, rate) => sum + Math.pow(rate - avgRate, 2), 0) / occupancyRates.length;
    const volatility = Math.sqrt(variance);
    
    // Determine trend (compare last 3 months to first 3 months)
    const firstQuarter = occupancyRates.slice(0, 3).reduce((sum, rate) => sum + rate, 0) / 3;
    const lastQuarter = occupancyRates.slice(-3).reduce((sum, rate) => sum + rate, 0) / 3;
    const trend = lastQuarter > firstQuarter ? 'improving' : lastQuarter < firstQuarter ? 'declining' : 'stable';

    return {
      averageOccupancy: avgOccupancy,
      volatility: volatility,
      trend: trend
    };
  }

  private static processBalanceSheetData(rawData: AppfolioBalanceSheetItem[]): ProcessedBalanceSheetData {
    // Categorize accounts by type
    const assets = rawData.filter(item => 
      item.AccountCode?.startsWith('1') || 
      item.AccountName?.toLowerCase().includes('asset') ||
      item.AccountName?.toLowerCase().includes('cash') ||
      item.AccountName?.toLowerCase().includes('receivable') ||
      item.AccountName?.toLowerCase().includes('inventory')
    );

    const liabilities = rawData.filter(item => 
      item.AccountCode?.startsWith('2') || 
      item.AccountName?.toLowerCase().includes('payable') ||
      item.AccountName?.toLowerCase().includes('liability') ||
      item.AccountName?.toLowerCase().includes('loan') ||
      item.AccountName?.toLowerCase().includes('debt')
    );

    const equity = rawData.filter(item => 
      item.AccountCode?.startsWith('3') || 
      item.AccountName?.toLowerCase().includes('equity') ||
      item.AccountName?.toLowerCase().includes('capital') ||
      item.AccountName?.toLowerCase().includes('retained')
    );

    // Further categorize assets into current and fixed
    const currentAssets = assets.filter(item => 
      item.AccountName?.toLowerCase().includes('cash') ||
      item.AccountName?.toLowerCase().includes('receivable') ||
      item.AccountName?.toLowerCase().includes('current') ||
      item.AccountCode?.match(/^1[0-4]/)
    );

    const fixedAssets = assets.filter(item => 
      !currentAssets.includes(item) &&
      (item.AccountName?.toLowerCase().includes('property') ||
       item.AccountName?.toLowerCase().includes('equipment') ||
       item.AccountName?.toLowerCase().includes('building') ||
       item.AccountCode?.match(/^1[5-9]/))
    );

    // Categorize liabilities into current and long-term
    const currentLiabilities = liabilities.filter(item => 
      item.AccountName?.toLowerCase().includes('payable') ||
      item.AccountName?.toLowerCase().includes('current') ||
      item.AccountCode?.match(/^2[0-4]/)
    );

    const longTermLiabilities = liabilities.filter(item => 
      !currentLiabilities.includes(item) &&
      (item.AccountName?.toLowerCase().includes('loan') ||
       item.AccountName?.toLowerCase().includes('mortgage') ||
       item.AccountName?.toLowerCase().includes('long-term') ||
       item.AccountCode?.match(/^2[5-9]/))
    );

    // Calculate totals
    const assetsTotal = assets.reduce((sum, item) => sum + this.parseMonetaryValue(item.Balance), 0);
    const liabilitiesTotal = liabilities.reduce((sum, item) => sum + this.parseMonetaryValue(item.Balance), 0);
    const equityTotal = equity.reduce((sum, item) => sum + this.parseMonetaryValue(item.Balance), 0);

    return {
      assets: {
        current: currentAssets,
        fixed: fixedAssets,
        total: assetsTotal
      },
      liabilities: {
        current: currentLiabilities,
        longTerm: longTermLiabilities,
        total: liabilitiesTotal
      },
      equity: {
        items: equity,
        total: equityTotal
      },
      rawData
    };
  }

  private static processCashFlowData(rawData: AppfolioCashFlowItem[]): ProcessedCashFlowData {
    // Categorize cash flow items by activity type
    const operatingActivities = rawData.filter(item => 
      item.AccountName?.toLowerCase().includes('operating') ||
      item.AccountName?.toLowerCase().includes('rental') ||
      item.AccountName?.toLowerCase().includes('income') ||
      item.AccountName?.toLowerCase().includes('expense') ||
      item.AccountName?.toLowerCase().includes('receivable') ||
      item.AccountName?.toLowerCase().includes('payable') ||
      item.AccountCode?.startsWith('4') || // Revenue accounts
      item.AccountCode?.startsWith('5') || // Operating expense accounts
      item.AccountCode?.startsWith('6')    // Other operating expenses
    );

    const investingActivities = rawData.filter(item => 
      item.AccountName?.toLowerCase().includes('capital') ||
      item.AccountName?.toLowerCase().includes('equipment') ||
      item.AccountName?.toLowerCase().includes('property') ||
      item.AccountName?.toLowerCase().includes('investment') ||
      item.AccountName?.toLowerCase().includes('asset') ||
      item.AccountName?.toLowerCase().includes('improvement') ||
      item.AccountCode?.match(/^1[5-9]/) // Fixed asset accounts
    );

    const financingActivities = rawData.filter(item => 
      item.AccountName?.toLowerCase().includes('loan') ||
      item.AccountName?.toLowerCase().includes('mortgage') ||
      item.AccountName?.toLowerCase().includes('debt') ||
      item.AccountName?.toLowerCase().includes('equity') ||
      item.AccountName?.toLowerCase().includes('distribution') ||
      item.AccountName?.toLowerCase().includes('dividend') ||
      item.AccountCode?.startsWith('2') || // Liability accounts
      item.AccountCode?.startsWith('3')    // Equity accounts
    );

    // Calculate totals using FiscalYearToDate for annual totals
    const operatingTotal = operatingActivities.reduce((sum, item) => 
      sum + this.parseMonetaryValue(item.FiscalYearToDate), 0);
    const investingTotal = investingActivities.reduce((sum, item) => 
      sum + this.parseMonetaryValue(item.FiscalYearToDate), 0);
    const financingTotal = financingActivities.reduce((sum, item) => 
      sum + this.parseMonetaryValue(item.FiscalYearToDate), 0);

    const netCashFlow = operatingTotal + investingTotal + financingTotal;

    // Find cash beginning and ending balances (these might not exist in the cash flow report)
    const cashBeginning = rawData.find(item => 
      item.AccountName?.toLowerCase().includes('cash at beginning') ||
      item.AccountName?.toLowerCase().includes('beginning cash')
    );
    const cashEnding = rawData.find(item => 
      item.AccountName?.toLowerCase().includes('cash at end') ||
      item.AccountName?.toLowerCase().includes('ending cash')
    );

    return {
      operatingActivities: {
        items: operatingActivities,
        total: operatingTotal
      },
      investingActivities: {
        items: investingActivities,
        total: investingTotal
      },
      financingActivities: {
        items: financingActivities,
        total: financingTotal
      },
      netCashFlow,
      cashAtBeginning: cashBeginning ? this.parseMonetaryValue(cashBeginning.FiscalYearToDate) : 0,
      cashAtEnd: cashEnding ? this.parseMonetaryValue(cashEnding.FiscalYearToDate) : netCashFlow,
      rawData
    };
  }
}