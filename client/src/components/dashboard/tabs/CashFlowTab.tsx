import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flag } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { GLAccount, Note } from '@shared/schema';

interface CashFlowTabProps {
  portfolioFinancials?: any;
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

export function CashFlowTab({
  portfolioFinancials,
  notes,
  clickedElements,
  onHandleClick,
  onHandleNoteChange,
  onFlagIssue,
  selectedProperty
}: CashFlowTabProps) {
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
    } catch (err) {
      console.error('Error fetching cash flow data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cash flow data');
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
    }).format(Math.abs(value));
  };

  const parseAmount = (amount: string): number => {
    if (!amount || amount === '0.00' || amount === '-') return 0;
    const cleaned = amount.replace(/[^\d.-]/g, '');
    const isNegative = amount.includes('(') || amount.startsWith('-');
    const parsed = parseFloat(cleaned) || 0;
    return isNegative ? -Math.abs(parsed) : parsed;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-institutional-black mx-auto mb-4"></div>
          <p>Loading cash flow data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="text-red-600">
            <h3 className="text-sm font-medium">Error loading cash flow data</h3>
            <p className="text-sm mt-1">{error}</p>
            <button 
              onClick={fetchCashFlowData}
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
                          isPositive ? 'text-success-green' : 'text-red-600'
                        } ${clickedElements.has(cellId) ? 'click-highlight' : ''}`}
                      >
                        {isPositive ? '+' : '-'}{formatCurrency(amount)}
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
                    cashFlowData.operatingActivities.total >= 0 ? 'text-success-green' : 'text-red-600'
                  }`}>
                    {cashFlowData.operatingActivities.total >= 0 ? '+' : '-'}{formatCurrency(cashFlowData.operatingActivities.total)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Section */}
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
                  cashFlowData.operatingActivities.total >= 0 ? 'text-success-green' : 'text-red-600'
                }`}>
                  {formatCurrency(cashFlowData.operatingActivities.total)}
                </td>
              </tr>
              <tr>
                <td className="font-bold text-right">Cash from Investing Activities:</td>
                <td className={`font-mono-data font-bold text-right ${
                  cashFlowData.investingActivities.total >= 0 ? 'text-success-green' : 'text-red-600'
                }`}>
                  {formatCurrency(cashFlowData.investingActivities.total)}
                </td>
              </tr>
              <tr>
                <td className="font-bold text-right">Cash from Financing Activities:</td>
                <td className={`font-mono-data font-bold text-right ${
                  cashFlowData.financingActivities.total >= 0 ? 'text-success-green' : 'text-red-600'
                }`}>
                  {formatCurrency(cashFlowData.financingActivities.total)}
                </td>
              </tr>
              <tr className="bg-green-50 border-t-2 border-institutional-black">
                <td className="font-bold text-right">NET INCREASE IN CASH:</td>
                <td className={`font-mono-data font-bold text-right ${
                  cashFlowData.netCashFlow >= 0 ? 'text-success-green' : 'text-red-600'
                }`}>
                  {formatCurrency(cashFlowData.netCashFlow)}
                </td>
              </tr>
              <tr>
                <td className="font-bold text-right">Cash at Beginning of Period:</td>
                <td className="font-mono-data font-bold text-right">
                  {formatCurrency(cashFlowData.cashAtBeginning)}
                </td>
              </tr>
              <tr className="bg-blue-50 border-t-2 border-institutional-black">
                <td className="font-bold text-right">CASH AT END OF PERIOD:</td>
                <td className="font-mono-data font-bold text-institutional-black text-right">
                  {formatCurrency(cashFlowData.cashAtEnd)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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
                      {account.type === 'revenue' ? '+' : '-'}${Math.abs(account.amount).toLocaleString()}
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