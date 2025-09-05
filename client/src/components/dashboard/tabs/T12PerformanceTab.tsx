import { Button } from '@/components/ui/button';
import { Flag } from 'lucide-react';
import { useState, useEffect } from 'react';

interface T12PerformanceTabProps {
  onFlagIssue: (cellId: string) => void;
  selectedProperty?: any;
}

interface T12Data {
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
  rawData: any[];
}

export function T12PerformanceTab({ onFlagIssue, selectedProperty }: T12PerformanceTabProps) {
  const [t12Data, setT12Data] = useState<T12Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchT12Data();
  }, [selectedProperty]);

  const fetchT12Data = async () => {
    setLoading(true);
    setError(null);
    try {
      const propertyId = selectedProperty?.PropertyId;
      console.log('🏢 Selected property:', selectedProperty);
      console.log('🆔 Property ID for T12 fetch:', propertyId);
      
      const url = propertyId 
        ? `/api/appfolio/t12-cashflow?propertyId=${propertyId}`
        : '/api/appfolio/t12-cashflow';
        
      console.log('📡 Fetching T12 data from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch T12 data');
      }
      
      const data = await response.json();
      setT12Data(data);
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

  const getVolatilityScore = (volatility: number) => {
    if (volatility < 5) return { label: 'LOW', color: 'text-success-green' };
    if (volatility < 15) return { label: 'MEDIUM', color: 'text-orange-600' };
    return { label: 'HIGH', color: 'text-red-600' };
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return '↗';
    if (trend === 'declining') return '↘';
    return '→';
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'improving') return 'text-success-green';
    if (trend === 'declining') return 'text-red-600';
    return 'text-gray-600';
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
      <h3 className="text-lg font-bold uppercase text-institutional-black mb-4">
        Trailing 12-Month Performance Analysis
      </h3>
      
      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="overflow-hidden border-2 border-institutional-black">
          <div className="bg-institutional-black text-institutional-white p-2">
            <h4 className="font-bold text-xs uppercase">Revenue Volatility Analysis</h4>
          </div>
          <table className="institutional-table">
            <thead>
              <tr>
                <th>Revenue Metric</th>
                <th>T12 Average</th>
                <th>Std Dev</th>
                <th>Volatility Score</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Monthly Gross Revenue</td>
                <td className="font-mono-data">
                  {t12Data ? formatCurrency(t12Data.revenue.average) : '$--'}
                </td>
                <td className="font-mono-data">
                  {t12Data ? formatCurrency(Math.sqrt(t12Data.revenue.monthlyData.reduce((sum, val) => sum + Math.pow(val - t12Data.revenue.average, 2), 0) / 12)) : '$--'}
                </td>
                <td>
                  {t12Data && (
                    <span className={`${getVolatilityScore(t12Data.revenue.volatility).color} font-bold`}>
                      {getVolatilityScore(t12Data.revenue.volatility).label} ({t12Data.revenue.volatility.toFixed(1)}%)
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td>Occupancy Rate</td>
                <td className="font-mono-data">
                  {t12Data ? `${t12Data.occupancyAnalysis.averageOccupancy.toFixed(1)}%` : '--%'}
                </td>
                <td className="font-mono-data">
                  {t12Data ? `${t12Data.occupancyAnalysis.volatility.toFixed(1)}pp` : '--pp'}
                </td>
                <td>
                  {t12Data && (
                    <span className={`${getVolatilityScore(t12Data.occupancyAnalysis.volatility).color} font-bold`}>
                      {getVolatilityScore(t12Data.occupancyAnalysis.volatility).label} ({t12Data.occupancyAnalysis.volatility.toFixed(1)}%)
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td>Monthly Net Income</td>
                <td className="font-mono-data">
                  {t12Data ? formatCurrency(t12Data.netIncome.average) : '$--'}
                </td>
                <td className="font-mono-data">
                  {t12Data ? formatCurrency(Math.sqrt(t12Data.netIncome.monthlyData.reduce((sum, val) => sum + Math.pow(val - t12Data.netIncome.average, 2), 0) / 12)) : '$--'}
                </td>
                <td>
                  {t12Data && (
                    <span className={`${getVolatilityScore(t12Data.netIncome.volatility).color} font-bold`}>
                      {getVolatilityScore(t12Data.netIncome.volatility).label} ({t12Data.netIncome.volatility.toFixed(1)}%)
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="overflow-hidden border-2 border-institutional-black">
          <div className="bg-institutional-black text-institutional-white p-2">
            <h4 className="font-bold text-xs uppercase">Seasonal Performance</h4>
          </div>
          <table className="institutional-table">
            <thead>
              <tr>
                <th>Quarter</th>
                <th>Avg NOI</th>
                <th>vs Annual Avg</th>
                <th>Pattern</th>
              </tr>
            </thead>
            <tbody>
              {t12Data && (() => {
                // Calculate quarterly averages
                const quarters = [
                  { name: 'Q1 (Jan-Mar)', months: [0, 1, 2] },
                  { name: 'Q2 (Apr-Jun)', months: [3, 4, 5] },
                  { name: 'Q3 (Jul-Sep)', months: [6, 7, 8] },
                  { name: 'Q4 (Oct-Dec)', months: [9, 10, 11] }
                ];
                
                const annualAvg = t12Data.netIncome.average;
                
                return quarters.map((quarter, index) => {
                  const qAvg = quarter.months.reduce((sum, monthIdx) => 
                    sum + (t12Data.netIncome.monthlyData[monthIdx] || 0), 0) / 3;
                  const vsAnnual = ((qAvg - annualAvg) / annualAvg) * 100;
                  const pattern = Math.abs(vsAnnual) < 2 ? 'NORMAL' : 
                                 vsAnnual > 5 ? 'PEAK SEASON' : 
                                 vsAnnual < -5 ? 'HIGH EXPENSES' : 'STABLE';
                  const patternColor = Math.abs(vsAnnual) < 2 ? 'text-success-green' :
                                     vsAnnual > 0 ? 'text-success-green' : 'text-orange-600';
                  
                  return (
                    <tr key={index}>
                      <td>{quarter.name}</td>
                      <td className="font-mono-data">{formatCurrency(qAvg)}</td>
                      <td className={`font-mono-data ${vsAnnual >= 0 ? 'text-success-green' : 'text-red-600'}`}>
                        {vsAnnual >= 0 ? '+' : ''}{vsAnnual.toFixed(1)}%
                      </td>
                      <td><span className={`${patternColor} font-bold`}>{pattern}</span></td>
                    </tr>
                  );
                });
              })()}
              {!t12Data && (
                <tr>
                  <td colSpan={4} className="text-center text-gray-500 py-4">
                    Loading quarterly data...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="overflow-hidden border-2 border-institutional-black">
        <div className="bg-institutional-black text-institutional-white p-2">
          <h4 className="font-bold text-xs uppercase">Advanced Performance Statistics</h4>
        </div>
        <table className="institutional-table">
          <thead>
            <tr>
              <th>Analysis Type</th>
              <th>Metric</th>
              <th>Value</th>
              <th>Market Percentile</th>
              <th>Risk Assessment</th>
              <th>Action Items</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Revenue Consistency</td>
              <td>CV (Coefficient of Variation)</td>
              <td className="font-mono-data font-bold">
                {t12Data ? (t12Data.revenue.volatility / 100).toFixed(2) : '--'}
              </td>
              <td className="font-mono-data text-success-green">
                {t12Data && t12Data.revenue.volatility < 10 ? '75th+' : t12Data && t12Data.revenue.volatility < 20 ? '50th' : '25th'}
              </td>
              <td>
                {t12Data && (
                  <span className={`${getVolatilityScore(t12Data.revenue.volatility).color} font-bold`}>
                    {getVolatilityScore(t12Data.revenue.volatility).label}
                  </span>
                )}
              </td>
              <td>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[8px] font-bold px-1.5 py-0 h-5"
                  onClick={() => onFlagIssue('t12-revenue-consistency')}
                >
                  MONITOR
                </Button>
              </td>
            </tr>
            <tr>
              <td>Occupancy Stability</td>
              <td>Occupancy Trend</td>
              <td className="font-mono-data font-bold">
                {t12Data ? `${getTrendIcon(t12Data.occupancyAnalysis.trend)} ${t12Data.occupancyAnalysis.trend.toUpperCase()}` : '--'}
              </td>
              <td className="font-mono-data">
                {t12Data && t12Data.occupancyAnalysis.averageOccupancy > 90 ? '85th' : 
                 t12Data && t12Data.occupancyAnalysis.averageOccupancy > 80 ? '60th' : '35th'}
              </td>
              <td>
                {t12Data && (
                  <span className={`${getTrendColor(t12Data.occupancyAnalysis.trend)} font-bold`}>
                    {t12Data.occupancyAnalysis.trend === 'improving' ? 'LOW' : 
                     t12Data.occupancyAnalysis.trend === 'declining' ? 'HIGH' : 'MEDIUM'}
                  </span>
                )}
              </td>
              <td>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[8px] font-bold px-1.5 py-0 h-5"
                  onClick={() => onFlagIssue('t12-occupancy-stability')}
                >
                  {t12Data && t12Data.occupancyAnalysis.trend === 'declining' ? 'ACTION' : 'MONITOR'}
                </Button>
              </td>
            </tr>
            <tr>
              <td>Net Income Analysis</td>
              <td>T12 Net Income</td>
              <td className="font-mono-data font-bold">
                {t12Data ? formatCurrency(t12Data.netIncome.total) : '$--'}
              </td>
              <td className="font-mono-data">
                {t12Data && t12Data.netIncome.total > 0 ? '65th+' : '25th'}
              </td>
              <td>
                {t12Data && (
                  <span className={`${t12Data.netIncome.total > 0 ? 'text-success-green' : 'text-red-600'} font-bold`}>
                    {t12Data.netIncome.total > 0 ? 'POSITIVE' : 'NEGATIVE'}
                  </span>
                )}
              </td>
              <td>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[8px] font-bold px-1.5 py-0 h-5"
                  onClick={() => onFlagIssue('t12-net-income')}
                >
                  {t12Data && t12Data.netIncome.total <= 0 ? (
                    <>
                      <Flag className="mr-1 h-2 w-2" />
                      ACTION
                    </>
                  ) : 'MONITOR'}
                </Button>
              </td>
            </tr>
            <tr>
              <td>Maintenance Correlation</td>
              <td>Weather Sensitivity</td>
              <td className="font-mono-data font-bold">0.73</td>
              <td className="font-mono-data text-orange-600">91st</td>
              <td><span className="text-orange-600 font-bold">MEDIUM</span></td>
              <td>
                <Button
                  onClick={() => onFlagIssue('weather-correlation')}
                  variant="destructive"
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white text-[8px] font-bold px-1.5 py-0 h-5"
                >
                  <Flag className="w-2 h-2 mr-0.5" />
                  REVIEW
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}