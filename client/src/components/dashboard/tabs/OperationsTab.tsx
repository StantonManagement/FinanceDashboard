import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Note } from '@shared/schema';

interface OperationsTabProps {
  notes: Note[];
  clickedElements: Set<string>;
  onHandleClick: (elementId: string) => void;
  onHandleNoteChange: (cellId: string, value: string) => void;
  onFlagIssue: (cellId: string) => void;
  selectedProperty?: any;
}

interface CashFlowData {
  operatingActivities: {
    items: { AccountName: string; AccountCode: string; SelectedPeriod: string; FiscalYearToDate: string; }[];
    total: number;
  };
  investingActivities: {
    items: { AccountName: string; AccountCode: string; SelectedPeriod: string; FiscalYearToDate: string; }[];
    total: number;
  };
  financingActivities: {
    items: { AccountName: string; AccountCode: string; SelectedPeriod: string; FiscalYearToDate: string; }[];
    total: number;
  };
  netCashFlow: number;
  cashAtBeginning: number;
  cashAtEnd: number;
  rawData: { AccountName: string; AccountCode: string; SelectedPeriod: string; FiscalYearToDate: string; }[];
}

interface OperationalMetric {
  category: string;
  accountName: string;
  accountCode: string;
  currentAmount: number;
  previousAmount: number;
  variance: number;
  variancePercent: number;
  threshold: number;
  status: 'NORMAL' | 'REVIEW' | 'ALERT';
}

export function OperationsTab({
  notes,
  clickedElements,
  onHandleClick,
  onHandleNoteChange,
  onFlagIssue,
  selectedProperty
}: OperationsTabProps) {
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null);
  const [previousCashFlowData, setPreviousCashFlowData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationalMetrics, setOperationalMetrics] = useState<OperationalMetric[]>([]);
  
  // Month picker state - default to current and previous months
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
  const [previousMonth, setPreviousMonth] = useState(() => {
    const date = new Date();
    const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  });

  // Convert month selections to date ranges
  const getMonthDateRange = (monthString: string) => {
    const [year, month] = monthString.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    return {
      fromDate: firstDay.toISOString().split('T')[0],
      toDate: lastDay.toISOString().split('T')[0]
    };
  };

  useEffect(() => {
    fetchOperationalData();
  }, [selectedProperty]);

  const fetchOperationalData = async () => {
    setLoading(true);
    setError(null);
    try {
      const propertyId = selectedProperty?.PropertyId;
      console.log('🏢 Selected property for Operations:', selectedProperty);
      console.log('🆔 Property ID for Operations fetch:', propertyId);
      const currentDateRange = getMonthDateRange(currentMonth);
      const previousDateRange = getMonthDateRange(previousMonth);
      
      console.log('📅 Current period:', `${currentDateRange.fromDate} to ${currentDateRange.toDate} (${currentMonth})`);
      console.log('📅 Previous period:', `${previousDateRange.fromDate} to ${previousDateRange.toDate} (${previousMonth})`);
      
      // Get current period data
      let currentUrl = `/api/appfolio/cash-flow?fromDate=${currentDateRange.fromDate}&toDate=${currentDateRange.toDate}`;
      if (propertyId) {
        currentUrl += `&propertyId=${propertyId}`;
      }
      
      // Get previous period data
      let previousUrl = `/api/appfolio/cash-flow?fromDate=${previousDateRange.fromDate}&toDate=${previousDateRange.toDate}`;
      if (propertyId) {
        previousUrl += `&propertyId=${propertyId}`;
      }
      
      console.log('📡 Fetching current period from:', currentUrl);
      console.log('📡 Fetching previous period from:', previousUrl);
      
      const [currentResponse, previousResponse] = await Promise.all([
        fetch(currentUrl),
        fetch(previousUrl)
      ]);
      
      if (!currentResponse.ok || !previousResponse.ok) {
        throw new Error('Failed to fetch operational data');
      }
      
      const currentData = await currentResponse.json();
      const previousData = await previousResponse.json();
      
      setCashFlowData(currentData);
      setPreviousCashFlowData(previousData);
      
      // Generate operational metrics
      generateOperationalMetrics(currentData, previousData);
      
    } catch (err) {
      console.error('Error fetching operational data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load operational data');
    } finally {
      setLoading(false);
    }
  };

  const generateOperationalMetrics = (current: CashFlowData, previous: CashFlowData) => {
    const metrics: OperationalMetric[] = [];
    
    // Key operational expense categories to analyze
    const keyCategories = [
      { pattern: /maintenance|repair/i, category: 'Maintenance & Repairs', threshold: 25 },
      { pattern: /utilities|electric|gas|water/i, category: 'Utilities', threshold: 15 },
      { pattern: /management|admin/i, category: 'Management Fees', threshold: 10 },
      { pattern: /insurance/i, category: 'Insurance', threshold: 20 },
      { pattern: /tax/i, category: 'Property Tax', threshold: 10 },
      { pattern: /marketing|advertising|leasing/i, category: 'Marketing & Leasing', threshold: 30 },
      { pattern: /legal|professional/i, category: 'Professional Services', threshold: 50 }
    ];
    
    keyCategories.forEach(({ pattern, category, threshold }) => {
      // Find matching accounts in current data
      const currentItems = current.operatingActivities.items.filter(item => 
        pattern.test(item.AccountName)
      );
      
      const previousItems = previous.operatingActivities.items.filter(item => 
        pattern.test(item.AccountName)
      );
      
      if (currentItems.length > 0) {
        // Aggregate amounts for this category
        const currentTotal = currentItems.reduce((sum, item) => {
          const amount = parseAmount(item.FiscalYearToDate);
          return sum + Math.abs(amount);
        }, 0);
        
        const previousTotal = previousItems.reduce((sum, item) => {
          const amount = parseAmount(item.FiscalYearToDate);
          return sum + Math.abs(amount);
        }, 0);
        
        const variance = currentTotal - previousTotal;
        const variancePercent = previousTotal !== 0 ? (variance / previousTotal) * 100 : 0;
        
        let status: 'NORMAL' | 'REVIEW' | 'ALERT' = 'NORMAL';
        if (Math.abs(variancePercent) > threshold) {
          status = Math.abs(variancePercent) > threshold * 2 ? 'ALERT' : 'REVIEW';
        }
        
        metrics.push({
          category,
          accountName: currentItems[0].AccountName,
          accountCode: currentItems[0].AccountCode || 'MULTI',
          currentAmount: currentTotal,
          previousAmount: previousTotal,
          variance,
          variancePercent,
          threshold,
          status
        });
      }
    });
    
    setOperationalMetrics(metrics);
  };

  const parseAmount = (amount: string): number => {
    if (!amount || amount === '0.00' || amount === '-') return 0;
    const cleaned = amount.replace(/[^\d.-]/g, '');
    const isNegative = amount.includes('(') || amount.startsWith('-');
    const parsed = parseFloat(cleaned) || 0;
    return isNegative ? -Math.abs(parsed) : parsed;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(value));
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-institutional-black mx-auto mb-4"></div>
          <p>Loading operational analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="text-red-600">
            <h3 className="text-sm font-medium">Error loading operational data</h3>
            <p className="text-sm mt-1">{error}</p>
            <button 
              onClick={fetchOperationalData}
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
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold uppercase text-institutional-black">
          {selectedProperty ? `Operational Analysis - ${selectedProperty["Asset ID + Name"] || 'Selected Property'}` : 'Portfolio Operational Analysis'}
        </h3>
        
        {/* Date Range Controls */}
        <div className="flex flex-col gap-3">
          {/* Current Period */}
          <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border">
            <span className="text-sm font-bold text-blue-800 min-w-[100px]">Current Month:</span>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Month:</label>
              <Input
                type="month"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
                className="w-40 text-sm"
              />
            </div>
            <div className="text-xs text-blue-600">
              {(() => {
                const range = getMonthDateRange(currentMonth);
                return `(${new Date(range.fromDate).toLocaleDateString()} - ${new Date(range.toDate).toLocaleDateString()})`;
              })()}
            </div>
          </div>

          {/* Previous Period */}
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border">
            <span className="text-sm font-bold text-gray-800 min-w-[100px]">Previous Month:</span>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Month:</label>
              <Input
                type="month"
                value={previousMonth}
                onChange={(e) => setPreviousMonth(e.target.value)}
                className="w-40 text-sm"
              />
            </div>
            <div className="text-xs text-gray-600">
              {(() => {
                const range = getMonthDateRange(previousMonth);
                return `(${new Date(range.fromDate).toLocaleDateString()} - ${new Date(range.toDate).toLocaleDateString()})`;
              })()}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 justify-center">
            <Button 
              onClick={fetchOperationalData}
              variant="outline"
              size="sm"
              className="text-xs font-bold"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Analysis'}
            </Button>
            <Button 
              onClick={() => {
                const date = new Date();
                const currentMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
                const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
                
                setCurrentMonth(currentMonthStr);
                setPreviousMonth(prevMonthStr);
                
                setTimeout(() => fetchOperationalData(), 100);
              }}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Current vs Previous Month
            </Button>
            <Button 
              onClick={() => {
                const today = new Date();
                const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                const lastYearSameMonth = `${today.getFullYear() - 1}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                
                setCurrentMonth(currentMonthStr);
                setPreviousMonth(lastYearSameMonth);
                
                setTimeout(() => fetchOperationalData(), 100);
              }}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              This Month vs Last Year
            </Button>
          </div>
        </div>
      </div>
      
      {/* Operational Variance Analysis */}
      {operationalMetrics.length > 0 && (
        <div className="overflow-hidden border-2 border-institutional-black mb-5">
          <div className="bg-institutional-black text-institutional-white p-2">
            <h4 className="font-bold text-xs uppercase">Operational Variance Analysis</h4>
          </div>
          <table className="institutional-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Current Period</th>
                <th>Previous Period</th>
                <th>Variance</th>
                <th>Variance %</th>
                <th>Threshold</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {operationalMetrics.map((metric, index) => {
                const cellId = `operations-${metric.accountCode || index}`;
                const hasNote = notes.some((note: Note) => note.cellId === cellId);
                
                return (
                  <tr key={`metric-${index}`}>
                    <td 
                      onClick={() => onHandleClick(`${cellId}-category`)}
                      className={`font-bold cursor-pointer transition-all ${
                        clickedElements.has(`${cellId}-category`) ? 'click-highlight' : ''
                      }`}
                    >
                      {metric.category}
                    </td>
                    <td 
                      onClick={() => onHandleClick(`${cellId}-current`)}
                      className={`font-mono-data font-bold text-right cursor-pointer transition-all ${
                        clickedElements.has(`${cellId}-current`) ? 'click-highlight' : ''
                      }`}
                    >
                      {formatCurrency(metric.currentAmount)}
                    </td>
                    <td 
                      onClick={() => onHandleClick(`${cellId}-previous`)}
                      className={`font-mono-data font-bold text-right cursor-pointer transition-all ${
                        clickedElements.has(`${cellId}-previous`) ? 'click-highlight' : ''
                      }`}
                    >
                      {formatCurrency(metric.previousAmount)}
                    </td>
                    <td 
                      onClick={() => onHandleClick(`${cellId}-variance`)}
                      className={`font-mono-data font-bold text-right cursor-pointer transition-all ${
                        metric.variance >= 0 ? 'text-red-600' : 'text-success-green'
                      } ${clickedElements.has(`${cellId}-variance`) ? 'click-highlight' : ''}`}
                    >
                      {metric.variance >= 0 ? '+' : ''}
                      {formatCurrency(metric.variance)}
                      {hasNote && (
                        <span className="note-indicator ml-2">📝 NOTE</span>
                      )}
                    </td>
                    <td className={`font-mono-data font-bold text-right ${
                      Math.abs(metric.variancePercent) > metric.threshold ? 'text-red-600' : 'text-success-green'
                    }`}>
                      {metric.variancePercent >= 0 ? (
                        <TrendingUp className="w-3 h-3 inline mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 inline mr-1" />
                      )}
                      {formatPercent(metric.variancePercent)}
                    </td>
                    <td className="font-mono-data text-center">±{metric.threshold}%</td>
                    <td className="text-center">
                      {metric.status === 'NORMAL' && (
                        <Badge className="bg-green-100 text-green-800 text-[8px] font-bold px-1 py-0 h-4">
                          ✓ NORMAL
                        </Badge>
                      )}
                      {metric.status === 'REVIEW' && (
                        <Badge className="bg-yellow-100 text-yellow-800 text-[8px] font-bold px-1 py-0 h-4">
                          <AlertTriangle className="w-2 h-2 inline mr-1" />
                          REVIEW
                        </Badge>
                      )}
                      {metric.status === 'ALERT' && (
                        <Badge className="bg-red-100 text-red-800 text-[8px] font-bold px-1 py-0 h-4">
                          <AlertTriangle className="w-2 h-2 inline mr-1" />
                          ALERT
                        </Badge>
                      )}
                    </td>
                    <td className="text-center">
                      <Input
                        placeholder="Add note..."
                        className="text-xs border-institutional-border h-6 px-2"
                        onBlur={(e) => {
                          if (e.target.value.trim()) {
                            onHandleNoteChange(cellId, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.target as HTMLInputElement;
                            if (input.value.trim()) {
                              onHandleNoteChange(cellId, input.value);
                              input.value = '';
                            }
                          }
                        }}
                      />
                    </td>
                    <td className="text-center">
                      <Button
                        onClick={() => onFlagIssue(cellId)}
                        variant="destructive"
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600 text-white text-[8px] font-bold px-1.5 py-0 h-5"
                      >
                        FLAG
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Top Expense Categories (from current data) */}
      {cashFlowData && (
        <div className="overflow-hidden border-2 border-institutional-black">
          <div className="bg-institutional-black text-institutional-white p-2">
            <h4 className="font-bold text-xs uppercase">Top Operating Expenses - Current Period</h4>
          </div>
          <table className="institutional-table">
            <thead>
              <tr>
                <th>GL Code</th>
                <th>Account Description</th>
                <th>Amount</th>
                <th>% of Total Expenses</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cashFlowData.operatingActivities.items
                .map(item => ({
                  ...item,
                  amount: parseAmount(item.FiscalYearToDate)
                }))
                .filter(item => item.amount < 0) // Only expenses (negative amounts)
                .sort((a, b) => a.amount - b.amount) // Sort by most expensive (most negative)
                .slice(0, 10) // Top 10 expenses
                .map((item, index) => {
                  const cellId = `operations-expense-${item.AccountCode || index}`;
                  const hasNote = notes.some((note: Note) => note.cellId === cellId);
                  const totalExpenses = cashFlowData.operatingActivities.items
                    .filter(i => parseAmount(i.FiscalYearToDate) < 0)
                    .reduce((sum, i) => sum + Math.abs(parseAmount(i.FiscalYearToDate)), 0);
                  const percentOfTotal = (Math.abs(item.amount) / totalExpenses) * 100;
                  
                  return (
                    <tr key={`expense-${index}`}>
                      <td 
                        onClick={() => onHandleClick(`${cellId}-code`)}
                        className={`font-mono-data font-bold text-center cursor-pointer transition-all ${
                          clickedElements.has(`${cellId}-code`) ? 'click-highlight' : ''
                        }`}
                      >
                        {item.AccountCode || 'N/A'}
                      </td>
                      <td 
                        onClick={() => onHandleClick(`${cellId}-desc`)}
                        className={`cursor-pointer transition-all ${
                          clickedElements.has(`${cellId}-desc`) ? 'click-highlight' : ''
                        }`}
                      >
                        {item.AccountName}
                      </td>
                      <td 
                        onClick={() => onHandleClick(cellId)}
                        className={`font-mono-data font-bold text-right cursor-pointer transition-all text-red-600 ${
                          clickedElements.has(cellId) ? 'click-highlight' : ''
                        }`}
                      >
                        {formatCurrency(item.amount)}
                        {hasNote && (
                          <span className="note-indicator ml-2">📝 NOTE</span>
                        )}
                      </td>
                      <td className="font-mono-data font-bold text-center">
                        {percentOfTotal.toFixed(1)}%
                      </td>
                      <td className="text-center">
                        <Input
                          placeholder="Add note..."
                          className="text-xs border-institutional-border h-6 px-2"
                          onBlur={(e) => {
                            if (e.target.value.trim()) {
                              onHandleNoteChange(cellId, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.target as HTMLInputElement;
                              if (input.value.trim()) {
                                onHandleNoteChange(cellId, input.value);
                                input.value = '';
                              }
                            }
                          }}
                        />
                      </td>
                      <td className="text-center">
                        <Button
                          onClick={() => onFlagIssue(cellId)}
                          variant="destructive"
                          size="sm"
                          className="bg-orange-500 hover:bg-orange-600 text-white text-[8px] font-bold px-1.5 py-0 h-5"
                        >
                          FLAG
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {!cashFlowData && !loading && (
        <div className="text-center py-8 text-gray-500">
          No operational data available. Please select a property and update the analysis.
        </div>
      )}
    </div>
  );
}