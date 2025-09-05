import { Input } from '@/components/ui/input';
import ClickableCell from '../../clickable-cell';
import { useState, useEffect } from 'react';

interface BalanceSheetTabProps {
  getCellComments?: (cellReference: string) => any[];
  handleCommentAdded?: () => void;
  selectedProperty?: any;
}

interface BalanceSheetData {
  assetId: string;
  assetColumn: string;
  assets: Record<string, { accountName: string; value: string; numericValue: number; section: string; }>;
  liabilities: Record<string, { accountName: string; value: string; numericValue: number; section: string; }>;
  equity: Record<string, { accountName: string; value: string; numericValue: number; section: string; }>;
  rawData: Array<{ accountName: string; value: string; numericValue: number; section: string; }>;
}

export function BalanceSheetTab({ getCellComments, handleCommentAdded, selectedProperty }: BalanceSheetTabProps) {
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBalanceSheetData();
  }, [selectedProperty]);

  const fetchBalanceSheetData = async () => {
    setLoading(true);
    setError(null);
    try {
      const propertyId = selectedProperty?.PropertyId;
      console.log('🏢 Selected property:', selectedProperty);
      console.log('🆔 Property ID for Balance Sheet fetch:', propertyId);
      
      const url = propertyId 
        ? `/api/appfolio/balance-sheet?propertyId=${propertyId}`
        : '/api/appfolio/balance-sheet';
        
      console.log('📡 Fetching Balance Sheet data from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch balance sheet data');
      }
      
      const data = await response.json();
      
      // Transform Appfolio data to match the expected BalanceSheetData interface
      const transformedData: BalanceSheetData = {
        assetId: selectedProperty?.["Asset ID"] || 'Unknown',
        assetColumn: selectedProperty?.["Asset ID + Name"] || 'Selected Property',
        assets: {},
        liabilities: {},
        equity: {},
        rawData: []
      };

      // Transform assets
      data.assets.current.forEach((item: any, index: number) => {
        transformedData.assets[`current_${index}`] = {
          accountName: item.AccountName,
          value: item.Balance,
          numericValue: parseFloat(item.Balance?.replace(/[^\d.-]/g, '') || '0'),
          section: 'Current Assets'
        };
      });

      data.assets.fixed.forEach((item: any, index: number) => {
        transformedData.assets[`fixed_${index}`] = {
          accountName: item.AccountName,
          value: item.Balance,
          numericValue: parseFloat(item.Balance?.replace(/[^\d.-]/g, '') || '0'),
          section: 'Fixed Assets'
        };
      });

      // Add assets total
      transformedData.assets['total_assets'] = {
        accountName: 'Total Assets',
        value: data.assets.total.toString(),
        numericValue: data.assets.total,
        section: 'Total'
      };

      // Transform liabilities
      data.liabilities.current.forEach((item: any, index: number) => {
        transformedData.liabilities[`current_${index}`] = {
          accountName: item.AccountName,
          value: item.Balance,
          numericValue: parseFloat(item.Balance?.replace(/[^\d.-]/g, '') || '0'),
          section: 'Current Liabilities'
        };
      });

      data.liabilities.longTerm.forEach((item: any, index: number) => {
        transformedData.liabilities[`longterm_${index}`] = {
          accountName: item.AccountName,
          value: item.Balance,
          numericValue: parseFloat(item.Balance?.replace(/[^\d.-]/g, '') || '0'),
          section: 'Long-term Liabilities'
        };
      });

      // Add liabilities total
      transformedData.liabilities['total_liabilities'] = {
        accountName: 'Total Liabilities',
        value: data.liabilities.total.toString(),
        numericValue: data.liabilities.total,
        section: 'Total'
      };

      // Transform equity
      data.equity.items.forEach((item: any, index: number) => {
        transformedData.equity[`equity_${index}`] = {
          accountName: item.AccountName,
          value: item.Balance,
          numericValue: parseFloat(item.Balance?.replace(/[^\d.-]/g, '') || '0'),
          section: 'Equity'
        };
      });

      // Add equity total
      transformedData.equity['total_equity'] = {
        accountName: 'Total Equity',
        value: data.equity.total.toString(),
        numericValue: data.equity.total,
        section: 'Total'
      };

      setBalanceSheetData(transformedData);
    } catch (err) {
      console.error('Error fetching balance sheet data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load balance sheet data');
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

  const getValueDisplay = (item: { value: string; numericValue: number }) => {
    if (item.numericValue === 0 && item.value === '-') return '-';
    if (item.numericValue < 0) {
      return `(${formatCurrency(Math.abs(item.numericValue))})`;
    }
    return formatCurrency(item.numericValue);
  };

  // Calculate totals
  const totalAssets = balanceSheetData ? 
    Object.values(balanceSheetData.assets)
      .filter(item => item.accountName.includes('Total') || item.accountName.includes('TOTAL'))
      .reduce((sum, item) => sum + item.numericValue, 0) : 0;

  const totalLiabilities = balanceSheetData ? 
    Object.values(balanceSheetData.liabilities)
      .filter(item => item.accountName.includes('Total') || item.accountName.includes('TOTAL'))
      .reduce((sum, item) => sum + item.numericValue, 0) : 0;

  const ownerEquity = totalAssets - totalLiabilities;
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-institutional-black mx-auto mb-4"></div>
          <p>Loading balance sheet data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="text-red-600">
            <h3 className="text-sm font-medium">Error loading balance sheet data</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold uppercase text-institutional-black">
          Balance Sheet Analysis & DSCR Calculations
        </h3>
        {balanceSheetData && (
          <div className="text-sm text-gray-600">
            Data for: {balanceSheetData.assetColumn}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="overflow-hidden border-2 border-institutional-black">
          <div className="bg-institutional-black text-institutional-white p-2">
            <h4 className="font-bold text-xs uppercase">Asset Analysis</h4>
          </div>
          <table className="institutional-table">
            <thead>
              <tr>
                <th>Asset Category</th>
                <th>Amount</th>
                <th>% of Total</th>
                <th>Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {balanceSheetData && Object.entries(balanceSheetData.assets)
                .filter(([key, item]) => {
                  // Show only important asset categories and totals
                  const accountName = item.accountName.toLowerCase();
                  return (
                    item.accountName.includes('Total') || 
                    item.accountName.includes('TOTAL') ||
                    accountName.includes('cash') ||
                    accountName.includes('operating cash') ||
                    accountName.includes('security deposit') ||
                    accountName.includes('deposit') ||
                    accountName.includes('receivable') ||
                    accountName.includes('prepaid') ||
                    Math.abs(item.numericValue) > 1000 // Only show significant amounts
                  );
                })
                .map(([key, item]) => {
                  const isTotal = item.accountName.includes('Total') || item.accountName.includes('TOTAL');
                  const percentage = totalAssets > 0 ? (Math.abs(item.numericValue) / Math.abs(totalAssets) * 100).toFixed(1) : '0.0';
                  
                  return (
                    <tr key={key} className={isTotal ? "bg-blue-50 border-t-2 border-institutional-black" : ""}>
                      <td className={isTotal ? "font-bold" : ""}>{item.accountName}</td>
                      <td className={`font-mono-data ${isTotal ? "font-bold" : "font-bold"}`}>
                        {getValueDisplay(item)}
                      </td>
                      <td className={`font-mono-data ${isTotal ? "font-bold" : ""}`}>
                        {isTotal ? "100.0%" : `${percentage}%`}
                      </td>
                      <td>
                        {!isTotal && (
                          <span className={`font-bold ${
                            Math.abs(item.numericValue) > 500000 ? "text-success-green" :
                            Math.abs(item.numericValue) > 50000 ? "text-orange-600" : "text-red-600"
                          }`}>
                            {Math.abs(item.numericValue) > 500000 ? "LOW" :
                             Math.abs(item.numericValue) > 50000 ? "MEDIUM" : "HIGH"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              {!balanceSheetData && (
                <tr>
                  <td colSpan={4} className="text-center text-gray-500 py-4">
                    No balance sheet data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="overflow-hidden border-2 border-institutional-black">
          <div className="bg-institutional-black text-institutional-white p-2">
            <h4 className="font-bold text-xs uppercase">Debt Analysis</h4>
          </div>
          <table className="institutional-table">
            <thead>
              <tr>
                <th>Debt Category</th>
                <th>Balance</th>
                <th>Rate</th>
                <th>Maturity</th>
              </tr>
            </thead>
            <tbody>
              {balanceSheetData && Object.entries(balanceSheetData.liabilities).map(([key, item]) => {
                const isTotal = item.accountName.includes('Total') || item.accountName.includes('TOTAL');
                
                return (
                  <tr key={key} className={isTotal ? "bg-red-50 border-t-2 border-institutional-black" : ""}>
                    <td className={isTotal ? "font-bold" : ""}>{item.accountName}</td>
                    <td className="font-mono-data font-bold">
                      {getValueDisplay(item)}
                    </td>
                    <td className="font-mono-data">
                      {item.accountName.includes('Mortgage') ? 
                        `${selectedProperty?.debt1_int_rate?.toFixed(2) || '4.25'}%` :
                        item.accountName.includes('Credit') ? '6.75%' :
                        item.accountName.includes('Deposit') ? '0.00%' :
                        isTotal ? 'Blended: 4.56%' : 'N/A'
                      }
                    </td>
                    <td className="font-mono-data">
                      {item.accountName.includes('Mortgage') ? 
                        (selectedProperty?.maturity_date?.split('T')[0] || '2029') :
                        item.accountName.includes('Credit') ? 'Revolving' :
                        item.accountName.includes('Deposit') ? 'On-Demand' : ''
                      }
                    </td>
                  </tr>
                );
              })}
              {balanceSheetData && Object.entries(balanceSheetData.equity).map(([key, item]) => (
                <tr key={key} className="bg-green-50">
                  <td className="font-bold">{item.accountName}</td>
                  <td className="font-mono-data font-bold">
                    {getValueDisplay(item)}
                  </td>
                  <td className="font-mono-data font-bold">
                    {totalAssets > 0 ? `${((Math.abs(totalLiabilities) / Math.abs(totalAssets)) * 100).toFixed(1)}% LTV` : 'N/A'}
                  </td>
                  <td></td>
                </tr>
              ))}
              {!balanceSheetData && (
                <tr>
                  <td colSpan={4} className="text-center text-gray-500 py-4">
                    No balance sheet data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="overflow-hidden border-2 border-institutional-black">
        <div className="bg-institutional-black text-institutional-white p-2">
          <h4 className="font-bold text-xs uppercase">DSCR Analysis & Covenant Compliance</h4>
        </div>
        <table className="institutional-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Current</th>
              <th>Required</th>
              <th>Variance</th>
              <th>Trend (12M)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Debt Service Coverage Ratio</td>
              {getCellComments && handleCommentAdded ? (
                <ClickableCell
                  cellReference="Balance Sheet > DSCR > Current Ratio"
                  cellValue="2.15x"
                  tabSection="Balance Sheet"
                  propertyCode="S0010"
                  comments={getCellComments("Balance Sheet > DSCR > Current Ratio")}
                  onCommentAdded={handleCommentAdded}
                  className="font-mono-data font-bold text-success-green"
                >
                  2.15x
                </ClickableCell>
              ) : (
                <td className="font-mono-data font-bold text-success-green">2.15x</td>
              )}
              <td className="font-mono-data">1.25x</td>
              <td className="font-mono-data text-success-green">+72.0%</td>
              <td className="font-mono-data text-success-green">↗ +8.5%</td>
              <td><span className="text-success-green font-bold">✓ COMPLIANT</span></td>
            </tr>
            <tr>
              <td>Loan-to-Value Ratio</td>
              <td className="font-mono-data font-bold">65.0%</td>
              <td className="font-mono-data">75.0%</td>
              <td className="font-mono-data text-success-green">-10.0pp</td>
              <td className="font-mono-data text-success-green">↘ -2.1pp</td>
              <td><span className="text-success-green font-bold">✓ COMPLIANT</span></td>
            </tr>
            <tr>
              <td>Minimum NOI (Covenant)</td>
              {getCellComments && handleCommentAdded ? (
                <ClickableCell
                  cellReference="Balance Sheet > DSCR > NOI Current"
                  cellValue="$81,600"
                  tabSection="Balance Sheet"
                  propertyCode="S0010"
                  comments={getCellComments("Balance Sheet > DSCR > NOI Current")}
                  onCommentAdded={handleCommentAdded}
                  className="font-mono-data font-bold"
                >
                  $81,600
                </ClickableCell>
              ) : (
                <td className="font-mono-data font-bold">$81,600</td>
              )}
              <td className="font-mono-data">$65,000</td>
              <td className="font-mono-data text-success-green">+25.5%</td>
              <td className="font-mono-data text-success-green">↗ +12.8%</td>
              <td><span className="text-success-green font-bold">✓ COMPLIANT</span></td>
            </tr>
            <tr>
              <td>Occupancy Requirement</td>
              <td className="font-mono-data font-bold">94.5%</td>
              <td className="font-mono-data">85.0%</td>
              <td className="font-mono-data text-success-green">+9.5pp</td>
              <td className="font-mono-data text-success-green">↗ +4.2pp</td>
              <td><span className="text-success-green font-bold">✓ COMPLIANT</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Market Valuation Analysis */}
      <div className="mt-5 overflow-hidden border-2 border-institutional-black">
        <div className="bg-institutional-black text-institutional-white p-2">
          <h4 className="font-bold text-xs uppercase">Market Valuation & Cap Rate Analysis</h4>
        </div>
        <table className="institutional-table">
          <thead>
            <tr>
              <th>Valuation Method</th>
              <th>Cap Rate</th>
              <th>NOI Basis</th>
              <th>Implied Value</th>
              <th>vs Book Value</th>
              <th>Market Position</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-bold">Current Market Cap Rate</td>
              <td className="font-mono-data font-bold text-success-green">12.20%</td>
              <td className="font-mono-data">$81,600</td>
              <td className="font-mono-data font-bold text-success-green">$668,852</td>
              <td className="font-mono-data text-red-600">-28.1%</td>
              <td><span className="text-success-green font-bold">UNDERVALUED</span></td>
              <td><span className="text-success-green font-bold">HIGH</span></td>
            </tr>
            <tr>
              <td>Conservative Cap Rate</td>
              <td className="font-mono-data">13.50%</td>
              <td className="font-mono-data">$81,600</td>
              <td className="font-mono-data">$604,444</td>
              <td className="font-mono-data text-red-600">-35.0%</td>
              <td><span className="text-success-green font-bold">UNDERVALUED</span></td>
              <td><span className="text-orange-600 font-bold">MEDIUM</span></td>
            </tr>
            <tr>
              <td>Aggressive Cap Rate</td>
              <td className="font-mono-data">10.75%</td>
              <td className="font-mono-data">$81,600</td>
              <td className="font-mono-data font-bold">$759,070</td>
              <td className="font-mono-data text-red-600">-18.3%</td>
              <td><span className="text-success-green font-bold">UNDERVALUED</span></td>
              <td><span className="text-red-600 font-bold">LOW</span></td>
            </tr>
            <tr className="bg-blue-50 border-t-2 border-institutional-black">
              <td className="font-bold">Market Value Range</td>
              <td className="font-mono-data font-bold">10.75%-13.50%</td>
              <td className="font-mono-data font-bold">$81.6K-$91.8K</td>
              <td className="font-mono-data font-bold">$604K-$759K</td>
              <td className="font-mono-data font-bold">-35.0% to -18.3%</td>
              <td><span className="text-success-green font-bold">STRONG BUY</span></td>
              <td><span className="text-success-green font-bold">HIGH</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}