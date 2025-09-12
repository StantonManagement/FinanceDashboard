import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flag } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { GLAccount, Note, ProcessedCashFlowData } from '@shared/schema';
import { DataUtils } from '@shared/utils';
import { ErrorBoundary, ErrorFallback } from '@/components/ui/error-boundary';
import { LoadingState } from '@/components/ui/loading';
import { validatePropertyData } from '@/utils/portfolio-data-validation';
import { CalculatedFinancials } from '@/components/dashboard/CalculatedFinancials';

interface CashFlowTabProps {
  portfolioFinancials?: any;
  notes: Note[];
  clickedElements: Set<string>;
  onHandleClick: (elementId: string) => void;
  onHandleNoteChange: (cellId: string, value: string) => void;
  onFlagIssue: (cellId: string) => void;
  selectedProperty?: any;
}

type CashFlowData = ProcessedCashFlowData;

function CashFlowTabContent({
  portfolioFinancials,
  notes,
  clickedElements,
  onHandleClick,
  onHandleNoteChange,
  onFlagIssue,
  selectedProperty
}: CashFlowTabProps) {
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null);
  const [previousCashFlowData, setPreviousCashFlowData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataValidation, setDataValidation] = useState<any>(null);
  
  // Date range state - default to current month
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchCashFlowData();
    
    // Validate property data for incomplete scenarios
    if (selectedProperty) {
      const validation = validatePropertyData(selectedProperty);
      setDataValidation(validation);
    }
  }, [selectedProperty]);

  const fetchCashFlowData = async () => {
    setLoading(true);
    setError(null);
    try {
      const propertyId = selectedProperty?.PropertyId;
      console.log('🏢 Selected property:', selectedProperty);
      console.log('🆔 Property ID for Cash Flow fetch:', propertyId);
      console.log('📅 Date range:', `${fromDate} to ${toDate}`);
      
      let url = `/api/appfolio/cash-flow?fromDate=${fromDate}&toDate=${toDate}`;
      if (propertyId) {
        url += `&propertyId=${propertyId}`;
      }
        
      console.log('📡 Fetching Cash Flow data from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch cash flow data');
      }
      
      const data = await response.json();
      setCashFlowData(data);

      // Fetch previous period data for comparison (previous month)
      const currentDate = new Date(fromDate);
      const prevMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const prevMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
      
      const prevFromDate = prevMonthStart.toISOString().split('T')[0];
      const prevToDate = prevMonthEnd.toISOString().split('T')[0];
      
      let prevUrl = `/api/appfolio/cash-flow?fromDate=${prevFromDate}&toDate=${prevToDate}`;
      if (propertyId) {
        prevUrl += `&propertyId=${propertyId}`;
      }
      
      try {
        const prevResponse = await fetch(prevUrl);
        if (prevResponse.ok) {
          const prevData = await prevResponse.json();
          setPreviousCashFlowData(prevData);
        }
      } catch (prevErr) {
        console.warn('Could not fetch previous period data for comparison:', prevErr);
        setPreviousCashFlowData(null);
      }

    } catch (err) {
      console.error('Error fetching cash flow data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cash flow data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => DataUtils.formatCurrency(value);

  // Helper function to get month-over-month color coding
  const getComparisonColor = (current: number, previous: number, isExpense: boolean = false) => {
    if (!previous || previous === 0) return 'text-gray-600';
    
    const variance = DataUtils.calculateVariance(current, previous);
    const isImprovement = isExpense ? variance < 0 : variance > 0;
    
    // If change is less than 5%, consider it neutral
    if (Math.abs(variance) < 5) return 'text-gray-600';
    return isImprovement ? 'text-success-green' : 'text-red-600';
  };

  const parseAmount = DataUtils.parseCurrency;

  if (loading) {
    return <LoadingState message="Loading cash flow data..." />;
  }

  if (error) {
    return (
      <ErrorFallback
        error={new Error(error)}
        resetError={fetchCashFlowData}
        title="Error loading cash flow data"
        description="There was a problem fetching the cash flow information. Please try again."
      />
    );
  }
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold uppercase text-institutional-black">
          {selectedProperty ? `Cash Flow Analysis - ${selectedProperty["Asset ID + Name"] || 'Selected Property'}` : 'Portfolio Cash Flow Analysis'}
        </h3>
        
        {/* Date Range Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-36 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-36 text-sm"
            />
          </div>
          <Button 
            onClick={fetchCashFlowData}
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            onClick={() => {
              // Quick preset: Current month
              const date = new Date();
              const newFromDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
              const newToDate = new Date().toISOString().split('T')[0];
              setFromDate(newFromDate);
              setToDate(newToDate);
            }}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Current Month
          </Button>
          <Button 
            onClick={() => {
              // Quick preset: Last 30 days
              const today = new Date();
              const thirtyDaysAgo = new Date(today);
              thirtyDaysAgo.setDate(today.getDate() - 30);
              const newFromDate = thirtyDaysAgo.toISOString().split('T')[0];
              const newToDate = today.toISOString().split('T')[0];
              setFromDate(newFromDate);
              setToDate(newToDate);
            }}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Last 30 Days
          </Button>
        </div>
      </div>
      
      {/* Operating Activities Section */}
      {cashFlowData && (
        <div className="grid grid-cols-1 gap-5 mb-5">
          <div className="overflow-hidden border-2 border-institutional-black">
            <div className="bg-institutional-black text-institutional-white p-2">
              <h4 className="font-bold text-xs uppercase">Operating Activities</h4>
            </div>
            <table className="institutional-table">
              <thead>
                <tr>
                  <th>GL Code</th>
                  <th>Account Description</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cashFlowData.operatingActivities.items.map((item, index) => {
                  const amount = item.CashFlowAmount || parseAmount(item.SelectedPeriod);
                  const cellId = `cashflow-operating-${item.AccountCode || index}`;
                  const hasNote = notes.some((note: Note) => note.cellId === cellId);
                  const isPositive = amount >= 0;
                  const flowType = item.CashFlowType || (isPositive ? 'IN' : 'OUT');
                  
                  // Get previous period amount for comparison
                  const previousItem = previousCashFlowData?.operatingActivities.items.find(
                    prevItem => prevItem.AccountCode === item.AccountCode
                  );
                  const previousAmount = previousItem ? (previousItem.CashFlowAmount || parseAmount(previousItem.SelectedPeriod)) : 0;
                  
                  // Determine if this is an expense account (OUT flow typically means expense)
                  const isExpenseAccount = flowType === 'OUT' || item.AccountCode?.startsWith('6');
                  const comparisonColor = getComparisonColor(amount, previousAmount, isExpenseAccount);
                  
                  return (
                    <tr key={`operating-${index}`}>
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
                        className={`font-mono-data font-bold text-right cursor-pointer transition-all ${
                          comparisonColor
                        } ${clickedElements.has(cellId) ? 'click-highlight' : ''}`}
                      >
                        {formatCurrency(Math.abs(amount))}
                        {hasNote && (
                          <span className="note-indicator ml-2">📝 NOTE</span>
                        )}
                      </td>
                      <td className="text-center">
                        <Badge 
                          variant={flowType === 'IN' ? 'default' : 'destructive'}
                          className={`text-[8px] font-bold px-1 py-0 h-4 ${
                            flowType === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {flowType}
                        </Badge>
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
                          <Flag className="w-2 h-2 mr-0.5" />
                          FLAG
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-blue-50 border-t-2 border-institutional-black">
                  <td colSpan={2} className="font-bold text-right">NET CASH FROM OPERATING:</td>
                  <td className={`font-mono-data font-bold text-right ${
                    previousCashFlowData ? getComparisonColor(cashFlowData.operatingActivities.total, previousCashFlowData.operatingActivities.total, false) : 'text-gray-600'
                  }`}>
                    {formatCurrency(Math.abs(cashFlowData.operatingActivities.total))}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Section */}
      {/* Operating Income Summary - Compact Version */}
      {cashFlowData && (
        <div className="overflow-hidden border-2 border-institutional-black mb-5">
          <div className="bg-institutional-black text-institutional-white p-2">
            <h4 className="font-bold text-xs uppercase">Operating Income Summary</h4>
          </div>
          <table className="institutional-table">
            <tbody>
              {/* Total Revenue */}
              <tr className="bg-green-50">
                <td className="font-bold text-right py-2">TOTAL REVENUE:</td>
                <td className="font-mono-data font-bold text-right text-green-700 py-2">
                  {formatCurrency(
                    Math.abs(cashFlowData.operatingActivities.items
                      .filter(item => {
                        const flowType = item.CashFlowType || ((item.CashFlowAmount || parseAmount(item.SelectedPeriod)) >= 0 ? 'IN' : 'OUT');
                        return flowType === 'IN' || item.AccountCode?.startsWith('4');
                      })
                      .reduce((sum, item) => sum + Math.abs(item.CashFlowAmount || parseAmount(item.SelectedPeriod)), 0))
                  )}
                </td>
              </tr>

              {/* Separator Row */}
              <tr className="bg-gray-100">
                <td colSpan={2} className="py-1 text-center text-sm text-gray-600">
                  <div className="flex items-center justify-center">
                    <div className="flex-1 h-px bg-gray-300"></div>
                    <span className="px-3 font-medium">LESS</span>
                    <div className="flex-1 h-px bg-gray-300"></div>
                  </div>
                </td>
              </tr>

              {/* Total Expenses */}
              <tr className="bg-red-50">
                <td className="font-bold text-right py-2">TOTAL OPERATING EXPENSES:</td>
                <td className="font-mono-data font-bold text-right text-red-700 py-2">
                  {formatCurrency(
                    cashFlowData.operatingActivities.items
                      .filter(item => {
                        const flowType = item.CashFlowType || ((item.CashFlowAmount || parseAmount(item.SelectedPeriod)) >= 0 ? 'IN' : 'OUT');
                        return flowType === 'OUT' || item.AccountCode?.startsWith('6');
                      })
                      .reduce((sum, item) => sum + Math.abs(item.CashFlowAmount || parseAmount(item.SelectedPeriod)), 0)
                  )}
                </td>
              </tr>

              {/* Operating Income Total with Heavy Separator */}
              <tr className="bg-blue-100 border-t-4 border-blue-600">
                <td className="font-bold text-right text-lg py-3">OPERATING INCOME (NOI):</td>
                <td className={`font-mono-data font-bold text-right text-xl py-3 ${
                  previousCashFlowData ? getComparisonColor(cashFlowData.operatingActivities.total, previousCashFlowData.operatingActivities.total, false) : 'text-blue-700'
                }`}>
                  {formatCurrency(Math.abs(cashFlowData.operatingActivities.total))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Cash Flow Summary */}
      {cashFlowData && (
        <div className="overflow-hidden border-2 border-institutional-black">
          <div className="bg-institutional-black text-institutional-white p-2">
            <h4 className="font-bold text-xs uppercase">Cash Flow Summary</h4>
          </div>
          <table className="institutional-table">
            <tbody>
              <tr>
                <td className="font-bold text-right">Cash from Operating Activities:</td>
                <td className={`font-mono-data font-bold text-right ${
                  previousCashFlowData ? getComparisonColor(cashFlowData.operatingActivities.total, previousCashFlowData.operatingActivities.total, false) : 'text-gray-600'
                }`}>
                  {formatCurrency(Math.abs(cashFlowData.operatingActivities.total))}
                </td>
              </tr>
              <tr>
                <td className="font-bold text-right">Cash from Investing Activities:</td>
                <td className={`font-mono-data font-bold text-right ${
                  previousCashFlowData ? getComparisonColor(cashFlowData.investingActivities.total, previousCashFlowData.investingActivities.total, false) : 'text-gray-600'
                }`}>
                  {formatCurrency(Math.abs(cashFlowData.investingActivities.total))}
                </td>
              </tr>
              <tr>
                <td className="font-bold text-right">Cash from Financing Activities:</td>
                <td className={`font-mono-data font-bold text-right ${
                  previousCashFlowData ? getComparisonColor(cashFlowData.financingActivities.total, previousCashFlowData.financingActivities.total, false) : 'text-gray-600'
                }`}>
                  {formatCurrency(Math.abs(cashFlowData.financingActivities.total))}
                </td>
              </tr>
              <tr className="bg-green-50 border-t-2 border-institutional-black">
                <td className="font-bold text-right">NET INCREASE IN CASH:</td>
                <td className={`font-mono-data font-bold text-right ${
                  previousCashFlowData ? getComparisonColor(cashFlowData.netCashFlow, previousCashFlowData.netCashFlow, false) : 'text-gray-600'
                }`}>
                  {formatCurrency(Math.abs(cashFlowData.netCashFlow))}
                </td>
              </tr>
              <tr>
                <td className="font-bold text-right">Cash at Beginning of Period:</td>
                <td className="font-mono-data font-bold text-right">
                  {formatCurrency(Math.abs(cashFlowData.cashAtBeginning))}
                </td>
              </tr>
              <tr className="bg-blue-50 border-t-2 border-institutional-black">
                <td className="font-bold text-right">CASH AT END OF PERIOD:</td>
                <td className="font-mono-data font-bold text-institutional-black text-right">
                  {formatCurrency(Math.abs(cashFlowData.cashAtEnd))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}


      {/* Show calculated financials for Park Portfolio properties */}
      {!cashFlowData && selectedProperty && (
        <CalculatedFinancials 
          selectedProperty={selectedProperty} 
          formatCurrency={formatCurrency}
        />
      )}

      {/* Fallback to portfolio data if no Appfolio data */}
      {!cashFlowData && portfolioFinancials && (
        <div className="overflow-hidden border-2 border-institutional-black">
          <table className="institutional-table">
            <thead>
              <tr>
                <th>GL Code</th>
                <th>Account Description</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { code: '4000', description: 'Total Portfolio Revenue', amount: portfolioFinancials.total_proforma_revenue || 0, type: 'revenue' },
                { code: '6000', description: 'Total Operating Expenses', amount: portfolioFinancials.total_operating_expenses || 0, type: 'expense' },
                { code: '6100', description: 'Total Property Tax', amount: portfolioFinancials.total_property_tax || 0, type: 'expense' },
                { code: '6200', description: 'Total Property Insurance', amount: portfolioFinancials.total_insurance || 0, type: 'expense' },
                { code: '6300', description: 'Total Repair & Maintenance', amount: portfolioFinancials.total_maintenance || 0, type: 'expense' },
                { code: '6400', description: 'Total Debt Service', amount: portfolioFinancials.total_debt_service || 0, type: 'expense' },
              ]
              .filter((account) => account.amount !== 0)
              .map((account: any) => {
                const cellId = `cashflow-gl-${account.code}`;
                const hasNote = notes.some((note: Note) => note.cellId === cellId);
                
                return (
                  <tr key={account.code}>
                    <td 
                      onClick={() => onHandleClick(`${cellId}-code`)}
                      className={`font-mono-data font-bold text-center cursor-pointer transition-all ${
                        clickedElements.has(`${cellId}-code`) ? 'click-highlight' : ''
                      }`}
                    >
                      {account.code}
                    </td>
                    <td 
                      onClick={() => onHandleClick(`${cellId}-desc`)}
                      className={`cursor-pointer transition-all ${
                        clickedElements.has(`${cellId}-desc`) ? 'click-highlight' : ''
                      }`}
                    >
                      {account.description}
                    </td>
                    <td 
                      onClick={() => onHandleClick(cellId)}
                      className={`font-mono-data font-bold text-right cursor-pointer transition-all ${
                        account.type === 'revenue' ? 'text-success-green' : 'text-red-600'
                      } ${clickedElements.has(cellId) ? 'click-highlight' : ''}`}
                    >
                      ${Math.abs(account.amount).toLocaleString()}
                      {hasNote && (
                        <span className="note-indicator ml-2">📝 NOTE</span>
                      )}
                    </td>
                    <td className="text-center">
                      <Badge 
                        variant={account.type === 'revenue' ? 'default' : 'destructive'}
                        className={`text-[8px] font-bold px-1 py-0 h-4 ${
                          account.type === 'revenue' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {account.type === 'revenue' ? 'REV' : 'EXP'}
                      </Badge>
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
                        <Flag className="w-2 h-2 mr-0.5" />
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

      {!cashFlowData && !portfolioFinancials && (
        <div className="text-center py-8 text-gray-500">
          No cash flow data available. Please select a property.
        </div>
      )}
    </div>
  );
}

// Main export with error boundary
export function CashFlowTab(props: CashFlowTabProps) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('CashFlowTab Error:', error, errorInfo);
        // Could send to error reporting service here
      }}
    >
      <CashFlowTabContent {...props} />
    </ErrorBoundary>
  );
}