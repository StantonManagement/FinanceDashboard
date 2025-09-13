// Environment variables are automatically loaded in this project
import type { 
  AppfolioT12Item, 
  ProcessedT12Data, 
  AppfolioBalanceSheetItem, 
  ProcessedBalanceSheetData, 
  AppfolioCashFlowItem, 
  ProcessedCashFlowData 
} from '@shared/schema';

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

  static async fetchT12CashFlow(propertyId?: string, fromDate?: string, toDate?: string): Promise<ProcessedT12Data> {
    try {
      console.log('🔵 Fetching T12 cash flow data from Appfolio API...');
      console.log('🏢 Property ID filter:', propertyId || 'All properties');
      console.log('📅 Date range:', fromDate, 'to', toDate);
      
      // Build URL with date parameters - using v1 twelve_month_cash_flow endpoint
      let url = `${this.BASE_URL_V1}/reports/twelve_month_cash_flow.json?from_date=${fromDate}&to_date=${toDate}`;
      
      if (propertyId) {
        url += `&properties=${propertyId}`;
      }
      
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

      return this.processT12Data(rawData, fromDate!, toDate!);
    } catch (error) {
      console.error('❌ Error fetching T12 data from Appfolio:', error);
      throw error;
    }
  }

  static async fetchBalanceSheet(propertyId?: string, fromDate?: string, toDate?: string): Promise<AppfolioBalanceSheetItem[]> {
    try {
      console.log('🔵 Fetching Balance Sheet data from Appfolio API...');
      console.log('🏢 Property ID filter:', propertyId || 'All properties');
      console.log('📅 Date range:', fromDate, 'to', toDate);
      
      // Build URL with required date parameters
      let url = `${this.BASE_URL_V1}/reports/balance_sheet.json?from_date=${fromDate}&to_date=${toDate}`;
      
      if (propertyId) {
        url += `&properties=${propertyId}`;
      }
      
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

      // Return raw data directly to match the expected API response format
      return rawData;
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

  private static processT12Data(rawData: AppfolioT12Item[], fromDate: string, toDate: string): ProcessedT12Data {
    console.log('🔄 Processing T12 data into dashboard format...');
    console.log('📊 Raw data items:', rawData.length);

    // Determine how many months of data we have by checking available slices
    const availableMonths = this.detectAvailableMonths(rawData, fromDate, toDate);
    console.log('📅 Available months detected:', availableMonths);

    // Generate month names dynamically based on date range
    const months = this.generateMonthNames(availableMonths, fromDate);
    
    // Extract account-level data matching AppFolio format
    const accounts = rawData
      .filter(item => {
        // Skip total rows and empty accounts
        if (!item.AccountName || item.AccountName.toLowerCase().includes('total')) return false;
        // Include individual account line items
        return item.AccountCode && item.AccountCode.length > 0;
      })
      .map(item => ({
        accountCode: item.AccountCode || '',
        accountName: item.AccountName || '',
        monthlyAmounts: this.extractMonthlyAmounts(item, availableMonths),
        total: this.parseMonetaryValue(item.SliceTotal || '0'),
        isRevenue: item.AccountCode?.startsWith('4') || false
      }));

    console.log('📋 Processed accounts:', accounts.length);

    // Calculate totals by month (dynamic based on available data)
    const totals = {
      revenue: new Array(availableMonths).fill(0),
      expenses: new Array(availableMonths).fill(0),
      netIncome: new Array(availableMonths).fill(0)
    };

    accounts.forEach(account => {
      account.monthlyAmounts.forEach((amount, monthIndex) => {
        if (account.isRevenue) {
          totals.revenue[monthIndex] += amount;
        } else {
          totals.expenses[monthIndex] += Math.abs(amount); // Expenses as positive numbers
        }
      });
    });

    // Calculate net income for each month
    totals.netIncome = totals.revenue.map((rev, i) => rev - totals.expenses[i]);

    return {
      months,
      accounts,
      totals,
      rawData
    };
  }

  private static detectAvailableMonths(rawData: AppfolioT12Item[], fromDate: string, toDate: string): number {
    // Calculate expected months based on date range
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                      (endDate.getMonth() - startDate.getMonth()) + 1;
    
    console.log(`📅 Expected months from date range (${fromDate} to ${toDate}): ${monthsDiff}`);
    
    // Check the first item to see how many slices have actual data
    const firstItem = rawData.find(item => item.AccountCode);
    if (!firstItem) {
      console.log('⚠️ No item with AccountCode found, using expected months:', monthsDiff);
      return monthsDiff;
    }
    
    console.log('🔍 Detecting months from first item:', firstItem.AccountName, firstItem.AccountCode);
    
    const sliceKeys = ['Slice00', 'Slice01', 'Slice02', 'Slice03', 'Slice04', 'Slice05', 
                      'Slice06', 'Slice07', 'Slice08', 'Slice09', 'Slice10', 'Slice11'] as const;
    
    let lastNonZeroMonth = -1;
    
    // Find the last month with any meaningful data
    for (let i = 0; i < sliceKeys.length && i < monthsDiff; i++) {
      const key = sliceKeys[i];
      const value = firstItem[key];
      console.log(`  ${key}: ${value} (${value !== undefined ? 'defined' : 'undefined'})`);
      
      if (value !== undefined && value !== '' && value !== null) {
        // Check if this slice has any non-zero data across all accounts
        const hasData = rawData.some(item => {
          const sliceVal = item[key];
          return sliceVal && sliceVal !== '0.00' && sliceVal !== '0' && sliceVal !== '';
        });
        
        if (hasData) {
          lastNonZeroMonth = i;
          console.log(`  ✅ ${key}: Found meaningful data`);
        }
      } else {
        console.log(`  ⚠️ ${key}: No data (${value})`);
      }
    }
    
    // Always use the expected month count from the date range
    // This ensures we show full 12 months when December is requested, even if some are zero
    console.log(`📊 Last meaningful data in month ${lastNonZeroMonth}, but using expected ${monthsDiff} months`);
    console.log(`📊 Detected ${monthsDiff} available months (based on date range)`);
    return monthsDiff;
  }

  private static generateMonthNames(monthCount: number, fromDate: string): string[] {
    // Generate month names starting from the fromDate
    const months = [];
    const startDate = new Date(fromDate);
    
    for (let i = 0; i < monthCount; i++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      months.push(monthName);
    }
    
    console.log(`📅 Generated ${monthCount} month names starting from ${fromDate}:`, months);
    return months;
  }

  private static extractMonthlyAmounts(item: AppfolioT12Item, monthCount: number): number[] {
    // Extract the available months dynamically
    const sliceKeys = ['Slice00', 'Slice01', 'Slice02', 'Slice03', 'Slice04', 'Slice05', 
                      'Slice06', 'Slice07', 'Slice08', 'Slice09', 'Slice10', 'Slice11'] as const;
    
    const amounts = [];
    
    // Debug: Log extraction for specific accounts
    if (item.AccountCode === '4105') {
      console.log(`🔍 DEBUG: Extracting monthly amounts for ${item.AccountName} (${item.AccountCode})`);
      console.log(`🔍 monthCount: ${monthCount}`);
    }
    
    for (let i = 0; i < monthCount && i < sliceKeys.length; i++) {
      const key = sliceKeys[i];
      const rawValue = item[key];
      
      // Fix: Ensure we handle undefined values properly and don't default to '0'
      if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
        const parsedValue = this.parseMonetaryValue(rawValue);
        amounts.push(parsedValue);
        
        // Debug: Log each slice extraction for Rent Income
        if (item.AccountCode === '4105') {
          console.log(`🔍   ${key}: "${rawValue}" -> ${parsedValue}`);
        }
      } else {
        // Only push 0 if the slice truly has no data
        amounts.push(0);
        
        if (item.AccountCode === '4105') {
          console.log(`🔍   ${key}: undefined/null -> 0`);
        }
      }
    }
    
    if (item.AccountCode === '4105') {
      console.log(`🔍 Final amounts array for ${item.AccountName}:`, amounts);
      console.log(`🔍 Total from SliceTotal: ${this.parseMonetaryValue(item.SliceTotal || '0')}`);
    }
    
    return amounts;
  }

  private static calculateMonthlyTotals(items: AppfolioT12Item[]): number[] {
    // Determine how many slices we have by checking the first item
    const firstItem = items[0];
    if (!firstItem) return [];
    
    const sliceKeys = ['Slice00', 'Slice01', 'Slice02', 'Slice03', 'Slice04', 'Slice05', 
                      'Slice06', 'Slice07', 'Slice08', 'Slice09', 'Slice10', 'Slice11'] as const;
    
    // Count how many slices exist
    const availableSlices = sliceKeys.filter(key => firstItem[key] !== undefined);
    const monthlyTotals = new Array(availableSlices.length).fill(0);
    
    items.forEach(item => {
      // Skip total rows
      if (item.AccountName?.toLowerCase().includes('total')) return;
      
      // Process all available slices
      availableSlices.forEach((sliceKey, index) => {
        const value = this.parseMonetaryValue(item[sliceKey] || '0');
        monthlyTotals[index] += value;
      });
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
    
    const result = isNegative ? -Math.abs(parsed) : parsed;
    
    // Debug logging for non-zero values
    if (result !== 0) {
      console.log(`💰 parseMonetaryValue: "${value}" -> ${result}`);
    }
    
    return result;
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
    const avgOccupancy = maxRent > 0 ? rentMonthly.reduce((sum, rent) => sum + (rent / maxRent) * 100, 0) / rentMonthly.length : 95;
    
    // Calculate volatility
    const occupancyRates = maxRent > 0 ? rentMonthly.map(rent => (rent / maxRent) * 100) : Array(12).fill(95);
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

    // Calculate totals using SelectedPeriod for the filtered date range
    // Apply proper accounting signs: Revenue = positive, Expenses = negative
    const operatingTotal = operatingActivities.reduce((sum, item) => {
      const value = this.parseMonetaryValue(item.SelectedPeriod);
      // Revenue accounts (4xxx) stay positive, expense accounts (5xxx/6xxx) become negative
      const adjustedValue = item.AccountCode?.startsWith('4') ? value : -Math.abs(value);
      return sum + adjustedValue;
    }, 0);
    
    const investingTotal = investingActivities.reduce((sum, item) => {
      const value = this.parseMonetaryValue(item.SelectedPeriod);
      // Most investing activities are cash outflows (negative)
      return sum - Math.abs(value);
    }, 0);
    
    const financingTotal = financingActivities.reduce((sum, item) => {
      const value = this.parseMonetaryValue(item.SelectedPeriod);
      // Financing can be inflows or outflows depending on the account
      const adjustedValue = item.AccountCode?.startsWith('2') ? value : -Math.abs(value);
      return sum + adjustedValue;
    }, 0);

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

    // Process items with correct signs for display
    const processedOperatingItems = operatingActivities.map(item => ({
      ...item,
      CashFlowAmount: item.AccountCode?.startsWith('4') 
        ? this.parseMonetaryValue(item.SelectedPeriod) 
        : -Math.abs(this.parseMonetaryValue(item.SelectedPeriod)),
      CashFlowType: item.AccountCode?.startsWith('4') ? 'IN' : 'OUT'
    }));

    const processedInvestingItems = investingActivities.map(item => ({
      ...item,
      CashFlowAmount: -Math.abs(this.parseMonetaryValue(item.SelectedPeriod)),
      CashFlowType: 'OUT'
    }));

    const processedFinancingItems = financingActivities.map(item => ({
      ...item,
      CashFlowAmount: item.AccountCode?.startsWith('2') 
        ? this.parseMonetaryValue(item.SelectedPeriod)
        : -Math.abs(this.parseMonetaryValue(item.SelectedPeriod)),
      CashFlowType: item.AccountCode?.startsWith('2') ? 'IN' : 'OUT'
    }));

    return {
      operatingActivities: {
        items: processedOperatingItems,
        total: operatingTotal
      },
      investingActivities: {
        items: processedInvestingItems,
        total: investingTotal
      },
      financingActivities: {
        items: processedFinancingItems,
        total: financingTotal
      },
      netCashFlow,
      cashAtBeginning: cashBeginning ? this.parseMonetaryValue(cashBeginning.SelectedPeriod) : 0,
      cashAtEnd: cashEnding ? this.parseMonetaryValue(cashEnding.SelectedPeriod) : netCashFlow,
      rawData
    };
  }

  /**
   * Fetch rent roll data from Appfolio API
   */
  static async fetchRentRoll(propertyId?: string, fromDate?: string, toDate?: string): Promise<any[]> {
    try {
      console.log('🔵 Fetching rent roll data from Appfolio API...');
      console.log('🏢 Property ID filter:', propertyId || 'All properties');
      console.log('📅 Date range:', fromDate, 'to', toDate);
      
      // Build URL with parameters - using v0 rent_roll endpoint
      let url = `${this.BASE_URL_V0}/reports/rent_roll.json`;
      const params = new URLSearchParams();
      
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (propertyId) params.append('properties', propertyId);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log('📡 API URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('📊 Rent Roll Response status:', response.status);
      console.log('📊 Rent Roll Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Rent Roll API Error Response:', errorText);
        throw new Error(`Appfolio Rent Roll API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Rent Roll Raw API Response:', JSON.stringify(data, null, 2));
      
      return Array.isArray(data) ? data : [data];
      
    } catch (error) {
      console.error('❌ Error in fetchRentRoll:', error);
      throw error;
    }
  }

  /**
   * Fetch general ledger data from Appfolio API
   */
  static async fetchGeneralLedger(propertyId?: string): Promise<any[]> {
    try {
      console.log('🔵 Fetching general ledger data from Appfolio API...');
      console.log('🏢 Property ID filter:', propertyId || 'All properties');
      
      // Build URL with parameters - using v0 general_ledger endpoint
      let url = `${this.BASE_URL_V0}/reports/general_ledger.json`;
      
      if (propertyId) {
        url += `?properties=${propertyId}`;
      }
      
      console.log('📡 API URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('📊 General Ledger Response status:', response.status);
      console.log('📊 General Ledger Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ General Ledger API Error Response:', errorText);
        throw new Error(`Appfolio General Ledger API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ General Ledger Raw API Response:', JSON.stringify(data, null, 2));
      
      return Array.isArray(data) ? data : [data];
      
    } catch (error) {
      console.error('❌ Error in fetchGeneralLedger:', error);
      throw error;
    }
  }
}