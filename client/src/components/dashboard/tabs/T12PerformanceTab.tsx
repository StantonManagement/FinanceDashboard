import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Flag, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import React from 'react';
import { validatePropertyData } from '@/utils/portfolio-data-validation';
import { CalculatedFinancials } from '@/components/dashboard/CalculatedFinancials';

interface T12PerformanceTabProps {
  onFlagIssue: (cellId: string) => void;
  selectedProperty?: any;
}

interface T12Data {
  months: string[]; // Month names like "Jan 2024", "Feb 2024"
  accounts: {
    accountCode: string;
    accountName: string;
    monthlyAmounts: number[]; // 12 monthly amounts
    total: number;
    isRevenue: boolean;
  }[];
  totals: {
    revenue: number[];
    expenses: number[];
    netIncome: number[];
  };
  rawData: any[];
}

export function T12PerformanceTab({ onFlagIssue, selectedProperty }: T12PerformanceTabProps) {
  const [t12Data, setT12Data] = useState<T12Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataValidation, setDataValidation] = useState<any>(null);
  
  // Month picker state - default to September 2025 (last month with available data)
  // Note: December 2025 would work but would show zeros for Oct-Dec since those months haven't occurred yet
  const [selectedMonth, setSelectedMonth] = useState('2025-09');

  // Convert selectedMonth to date range for T12 (12 months ending with selected month)
  const getT12DateRange = (monthString: string) => {
    const [year, month] = monthString.split('-').map(Number);
    
    // Create the last day of the selected month
    // new Date(year, month, 0) gets the last day of month (month-1)
    // For "2025-12": new Date(2025, 12, 0) = December 31, 2025
    const endDate = new Date(year, month, 0);
    
    // For T12 data starting from January of the selected year
    // If selected month is September 2025, show Jan 2025 - Sep 2025
    // If selected month is December 2025, show Jan 2025 - Dec 2025
    const startDate = new Date(`${year}-01-01`);
    
    console.log(`📅 Date calculation for ${monthString}:`);
    console.log(`  Start: ${startDate.toISOString().split('T')[0]} (Jan 1st)`);
    console.log(`  End: ${endDate.toISOString().split('T')[0]} (last day of ${monthString})`);
    
    return {
      fromDate: startDate.toISOString().split('T')[0],
      toDate: endDate.toISOString().split('T')[0]
    };
  };


  useEffect(() => {
    fetchT12Data();
    
    // Validate property data for incomplete scenarios
    if (selectedProperty) {
      const validation = validatePropertyData(selectedProperty);
      setDataValidation(validation);
    }
  }, [selectedProperty, selectedMonth]);

  const fetchT12Data = async () => {
    setLoading(true);
    setError(null);
    try {
      const propertyId = selectedProperty?.PropertyId;
      const { fromDate, toDate } = getT12DateRange(selectedMonth);
      
      console.log('🏢 Selected property:', selectedProperty);
      console.log('🆔 Property ID for T12 fetch:', propertyId);
      console.log('📅 Selected month:', selectedMonth);
      console.log('📅 T12 date range:', `${fromDate} to ${toDate}`);
      
      const params = new URLSearchParams();
      if (propertyId) params.append('propertyId', propertyId.toString());
      params.append('from_date', fromDate);
      params.append('to_date', toDate);
      
      const url = `/api/appfolio/t12-cashflow?${params.toString()}`;
      console.log('📡 Fetching T12 data from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch T12 data');
      }
      
      const data = await response.json();
      console.log('🔍 T12 API Response:', data);
      console.log('🔍 Raw data keys:', Object.keys(data));
      console.log('🔍 T12 Months received from API:', data.months);
      console.log('🔍 T12 First account monthly amounts:', data.accounts?.[0]?.monthlyAmounts);
      console.log('🔍 Data structure check:', {
        hasMonths: !!data.months,
        hasAccounts: !!data.accounts,
        hasTotals: !!data.totals,
        hasRawData: !!data.rawData
      });
      
      // The server should now return the properly formatted T12Data
      if (data && data.months && data.accounts && data.totals) {
        console.log('✅ Received properly formatted T12 data');
        console.log('📊 Months:', data.months.length, data.months);
        console.log('📋 Accounts:', data.accounts.length);
        console.log('💰 Revenue accounts:', data.accounts.filter((a: any) => a.isRevenue).length);
        console.log('💸 Expense accounts:', data.accounts.filter((a: any) => !a.isRevenue).length);
        console.log('📊 Sample account data:', data.accounts[0]);
        console.log('💰 Sample monthly amounts:', data.accounts[0]?.monthlyAmounts);
        console.log('💲 Sample totals:', {
          revenue: data.totals.revenue?.slice(0, 3),
          expenses: data.totals.expenses?.slice(0, 3),
          netIncome: data.totals.netIncome?.slice(0, 3)
        });
        setT12Data(data);
      } else {
        console.log('⚠️ Unexpected data format - creating fallback structure');
        console.log('⚠️ Data received:', data);
        // Create fallback structure with proper month count
        const monthCount = data.months?.length || 9;
        const fallbackData: T12Data = {
          months: data.months || Array.from({length: monthCount}, (_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - monthCount + 1 + i);
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          }),
          accounts: data.accounts || [],
          totals: data.totals || {
            revenue: Array(monthCount).fill(0),
            expenses: Array(monthCount).fill(0),
            netIncome: Array(monthCount).fill(0)
          },
          rawData: data.rawData || []
        };
        console.log('🔧 Using fallback data:', fallbackData);
        setT12Data(fallbackData);
      }
    } catch (err) {
      console.error('Error fetching T12 data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load T12 data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyWithNegativeStyle = (value: number) => {
    const isNegative = value < 0;
    const absoluteValue = Math.abs(value);
    const formattedValue = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(absoluteValue);
    
    return {
      value: formattedValue,
      isNegative: isNegative,
      className: isNegative ? 'text-red-600' : ''
    };
  };

  // Function to categorize expense accounts
  const categorizeExpenses = (accounts: any[]) => {
    const categories = {
      'CLEANING AND MAINTENANCE': [] as any[],
      'UTILITIES': [] as any[],
      'REPAIRS AND MAINTENANCE': [] as any[],
      'MANAGEMENT FEES': [] as any[],
      'TAXES AND LICENSES': [] as any[],
      'DUES AND SUBSCRIPTIONS': [] as any[],
      'PAYROLL': [] as any[],
      'AUTO AND TRAVEL': [] as any[],
      'GENERAL AND ADMINISTRATIVE': [] as any[],
      'OTHER': [] as any[]
    };

    accounts.filter(account => !account.isRevenue).forEach(account => {
      const name = account.accountName.toUpperCase();
      
      if (name.includes('CLEANING') || name.includes('MAINTENANCE') && !name.includes('REPAIR')) {
        categories['CLEANING AND MAINTENANCE'].push(account);
      } else if (name.includes('UTILITIES') || name.includes('ELECTRIC') || name.includes('GAS') || 
                 name.includes('WATER') || name.includes('SEWER') || name.includes('GARBAGE')) {
        categories['UTILITIES'].push(account);
      } else if (name.includes('REPAIR') || name.includes('R&M') || name.includes('MAINTENANCE')) {
        categories['REPAIRS AND MAINTENANCE'].push(account);
      } else if (name.includes('MANAGEMENT') && name.includes('FEE')) {
        categories['MANAGEMENT FEES'].push(account);
      } else if (name.includes('TAX') || name.includes('LICENSE') || name.includes('PERMIT')) {
        categories['TAXES AND LICENSES'].push(account);
      } else if (name.includes('DUES') || name.includes('SUBSCRIPTION') || name.includes('MEMBERSHIP')) {
        categories['DUES AND SUBSCRIPTIONS'].push(account);
      } else if (name.includes('PAYROLL') || name.includes('SALARY') || name.includes('WAGE')) {
        categories['PAYROLL'].push(account);
      } else if (name.includes('AUTO') || name.includes('TRAVEL') || name.includes('VEHICLE') || name.includes('MILEAGE')) {
        categories['AUTO AND TRAVEL'].push(account);
      } else if (name.includes('ADMIN') || name.includes('OFFICE') || name.includes('GENERAL')) {
        categories['GENERAL AND ADMINISTRATIVE'].push(account);
      } else {
        categories['OTHER'].push(account);
      }
    });

    return categories;
  };

  // Function to calculate category totals
  const calculateCategoryTotals = (categoryAccounts: any[], monthCount: number) => {
    const monthlyTotals = Array(monthCount).fill(0);
    let total = 0;

    categoryAccounts.forEach(account => {
      total += account.total || 0;
      account.monthlyAmounts?.forEach((amount: number, index: number) => {
        if (index < monthCount) {
          monthlyTotals[index] += amount || 0;
        }
      });
    });

    return { monthlyTotals, total };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-institutional-black mx-auto mb-4"></div>
          <p>Loading T12 performance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="text-red-600">
            <h3 className="text-sm font-medium">Error loading T12 data</h3>
            <p className="text-sm mt-1">{error}</p>
            <button 
              onClick={fetchT12Data}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold uppercase text-institutional-black">
          {selectedProperty ? `T12 Cash Flow - ${selectedProperty["Asset ID + Name"] || 'Selected Property'}` : 'T12 Cash Flow Report'}
        </h3>
        
        <Button 
          onClick={fetchT12Data}
          variant="outline"
          size="sm"
          className="text-xs"
          disabled={loading}
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Update T12'}
        </Button>
      </div>

      {/* Month Selection Controls */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
        <h4 className="text-sm font-semibold mb-3 text-institutional-black">T12 Period Selection</h4>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Month Picker */}
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-700 mb-1">Ending Month</label>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs w-40"
            />
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-700 mb-1">Quick Select</label>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const now = new Date();
                  setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                }}
                variant="outline"
                size="sm"
                className="text-xs px-2 py-1"
              >
                Current Month
              </Button>
              <Button
                onClick={() => {
                  const now = new Date();
                  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  setSelectedMonth(`${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`);
                }}
                variant="outline"
                size="sm"
                className="text-xs px-2 py-1"
              >
                Previous Month
              </Button>
            </div>
          </div>

          {/* Update Button */}
          <div className="flex flex-col justify-end">
            <Button
              onClick={fetchT12Data}
              className="text-xs px-4 py-2"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Update T12'}
            </Button>
          </div>
        </div>

        {/* Period display */}
        <div className="mt-2 text-xs text-gray-600">
          {(() => {
            const { fromDate, toDate } = getT12DateRange(selectedMonth);
            const selectedMonthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            return `Showing 12 months ending ${selectedMonthName} (${new Date(fromDate).toLocaleDateString()} - ${new Date(toDate).toLocaleDateString()})`;
          })()}
        </div>
      </div>

      {/* T12 Cash Flow Table */}
      {t12Data && (
        <div className="overflow-hidden border-2 border-institutional-black">
          <div className="bg-institutional-black text-institutional-white p-2">
            <h4 className="font-bold text-xs uppercase">12-Month Cash Flow Analysis</h4>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="institutional-table min-w-full">
              <thead className="sticky top-0 z-20">
                <tr className="bg-white">
                  <th className="sticky left-0 bg-white z-30 min-w-[200px] border-b border-gray-300">Account</th>
                  {(() => {
                    const months = t12Data.months || [];
                    console.log(`📊 Total months in t12Data.months:`, months.length);
                    console.log(`📊 Full months array:`, months);
                    return months.map((month, index) => {
                      console.log(`🗓️ Rendering month header ${index}: ${month}`);
                      return (
                        <th key={index} className="min-w-[80px] text-xs bg-white border-b border-gray-300 sticky top-0 z-20">{month}</th>
                      );
                    });
                  })()}
                  <th className="min-w-[100px] font-bold bg-white border-b border-gray-300 sticky top-0 z-20">Total</th>
                </tr>
              </thead>
              <tbody>
                {/* Revenue Section */}
                <tr className="bg-blue-50">
                  <td className="sticky left-0 bg-blue-50 z-10 font-bold text-sm uppercase" colSpan={(t12Data.months?.length || 0) + 2}>
                    OPERATING INCOME
                  </td>
                </tr>
                
                {(t12Data.accounts || [])
                  .filter(account => account.isRevenue)
                  .map((account, index) => (
                    <tr key={`revenue-${index}`}>
                      <td className="sticky left-0 bg-white z-10 font-medium">{account.accountName}</td>
                      {(account.monthlyAmounts || Array(t12Data.months?.length || 0).fill(0)).map((amount, monthIndex) => {
                        const formatted = formatCurrencyWithNegativeStyle(amount || 0);
                        return (
                          <td key={monthIndex} className={`font-mono-data text-right text-xs ${formatted.className || 'text-green-700'}`}>
                            {formatted.value}
                          </td>
                        );
                      })}
                      <td className={`font-mono-data text-right font-bold ${formatCurrencyWithNegativeStyle(account.total || 0).className || 'text-green-700'}`}>
                        {formatCurrencyWithNegativeStyle(account.total || 0).value}
                      </td>
                    </tr>
                  ))}
                
                {/* Total Revenue Row */}
                <tr className="bg-green-50 border-t-2 border-gray-300">
                  <td className="sticky left-0 bg-green-50 z-10 font-bold">TOTAL OPERATING INCOME</td>
                  {(t12Data.totals?.revenue || Array(t12Data.months?.length || 0).fill(0)).map((amount, monthIndex) => {
                    const formatted = formatCurrencyWithNegativeStyle(amount);
                    return (
                      <td key={monthIndex} className={`font-mono-data text-right font-bold text-xs ${formatted.className || 'text-green-700'}`}>
                        {formatted.value}
                      </td>
                    );
                  })}
                  <td className={`font-mono-data text-right font-bold ${formatCurrencyWithNegativeStyle((t12Data.totals?.revenue || []).reduce((sum, amount) => sum + amount, 0)).className || 'text-green-700'}`}>
                    {formatCurrencyWithNegativeStyle((t12Data.totals?.revenue || []).reduce((sum, amount) => sum + amount, 0)).value}
                  </td>
                </tr>

                {/* Expenses Section */}
                <tr className="bg-blue-50">
                  <td className="sticky left-0 bg-blue-50 z-10 font-bold text-sm uppercase" colSpan={(t12Data.months?.length || 0) + 2}>
                    OPERATING EXPENSES
                  </td>
                </tr>
                
                {(() => {
                  const expenseCategories = categorizeExpenses(t12Data.accounts || []);
                  const monthCount = t12Data.months?.length || 0;
                  
                  return Object.entries(expenseCategories).map(([categoryName, categoryAccounts]) => {
                    if (categoryAccounts.length === 0) return null;
                    
                    const categoryTotals = calculateCategoryTotals(categoryAccounts, monthCount);
                    
                    return (
                      <React.Fragment key={categoryName}>
                        {/* Individual accounts in this category */}
                        {categoryAccounts.map((account, index) => (
                          <tr key={`${categoryName}-${index}`}>
                            <td className="sticky left-0 bg-white z-10 font-medium pl-4">{account.accountName}</td>
                            {(account.monthlyAmounts || Array(monthCount).fill(0)).map((amount, monthIndex) => {
                              const formatted = formatCurrencyWithNegativeStyle(amount || 0);
                              return (
                                <td key={monthIndex} className={`font-mono-data text-right text-xs ${formatted.className || 'text-red-700'}`}>
                                  {formatted.value}
                                </td>
                              );
                            })}
                            <td className={`font-mono-data text-right font-bold ${formatCurrencyWithNegativeStyle(account.total || 0).className || 'text-red-700'}`}>
                              {formatCurrencyWithNegativeStyle(account.total || 0).value}
                            </td>
                          </tr>
                        ))}
                        
                        {/* Category subtotal row */}
                        <tr className="bg-orange-50 border-t border-gray-200">
                          <td className="sticky left-0 bg-orange-50 z-10 font-bold text-orange-800">TOTAL {categoryName}:</td>
                          {categoryTotals.monthlyTotals.map((amount, monthIndex) => {
                            const formatted = formatCurrencyWithNegativeStyle(amount);
                            return (
                              <td key={monthIndex} className={`font-mono-data text-right font-bold text-xs ${formatted.className || 'text-orange-700'}`}>
                                {formatted.value}
                              </td>
                            );
                          })}
                          <td className={`font-mono-data text-right font-bold ${formatCurrencyWithNegativeStyle(categoryTotals.total).className || 'text-orange-700'}`}>
                            {formatCurrencyWithNegativeStyle(categoryTotals.total).value}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  }).filter(Boolean);
                })()}
                
                {/* Total Expenses Row */}
                <tr className="bg-red-50 border-t-2 border-gray-300">
                  <td className="sticky left-0 bg-red-50 z-10 font-bold">TOTAL OPERATING EXPENSES</td>
                  {(t12Data.totals?.expenses || Array(t12Data.months?.length || 0).fill(0)).map((amount, monthIndex) => {
                    const formatted = formatCurrencyWithNegativeStyle(amount);
                    return (
                      <td key={monthIndex} className={`font-mono-data text-right font-bold text-xs ${formatted.className || 'text-red-700'}`}>
                        {formatted.value}
                      </td>
                    );
                  })}
                  <td className={`font-mono-data text-right font-bold ${formatCurrencyWithNegativeStyle((t12Data.totals?.expenses || []).reduce((sum, amount) => sum + amount, 0)).className || 'text-red-700'}`}>
                    {formatCurrencyWithNegativeStyle((t12Data.totals?.expenses || []).reduce((sum, amount) => sum + amount, 0)).value}
                  </td>
                </tr>

                {/* Net Operating Income Row */}
                <tr className="bg-blue-100 border-t-4 border-institutional-black">
                  <td className="sticky left-0 bg-blue-100 z-10 font-bold text-lg">NET OPERATING INCOME (NOI)</td>
                  {(t12Data.totals?.netIncome || Array(t12Data.months?.length || 0).fill(0)).map((noi, monthIndex) => {
                    const formatted = formatCurrencyWithNegativeStyle(noi);
                    return (
                      <td key={monthIndex} className={`font-mono-data text-right font-bold text-xs ${
                        formatted.className || (noi >= 0 ? 'text-blue-700' : 'text-red-700')
                      }`}>
                        {formatted.value}
                      </td>
                    );
                  })}
                  <td className={`font-mono-data text-right font-bold text-lg ${
                    formatCurrencyWithNegativeStyle((t12Data.totals?.netIncome || []).reduce((sum, noi) => sum + noi, 0)).className || 
                    ((t12Data.totals?.netIncome || []).reduce((sum, noi) => sum + noi, 0) >= 0 ? 'text-blue-700' : 'text-red-700')
                  }`}>
                    {formatCurrencyWithNegativeStyle((t12Data.totals?.netIncome || []).reduce((sum, noi) => sum + noi, 0)).value}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Show calculated T12 estimates for Park Portfolio properties when no data */}
      {!t12Data && selectedProperty && (
        <CalculatedFinancials 
          selectedProperty={selectedProperty} 
          formatCurrency={formatCurrency}
        />
      )}

      {!t12Data && !selectedProperty && (
        <div className="text-center py-8 text-gray-500">
          Select a property to view its trailing 12-month cash flow data.
        </div>
      )}
    </div>
  );
}