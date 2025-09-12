import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Flag, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { GLAccount, Note } from '@shared/schema';
import { validatePropertyData } from '@/utils/portfolio-data-validation';
import { CalculatedFinancials } from '@/components/dashboard/CalculatedFinancials';

interface PerformanceTabProps {
  portfolioFinancials: any;
  notes: Note[];
  clickedElements: Set<string>;
  cellNotes: Record<string, string>;
  visibleColumns: any;
  onHandleClick: (elementId: string) => void;
  onHandleNoteChange: (cellId: string, value: string) => void;
  onFlagIssue: (cellId: string) => void;
  selectedProperty?: any;
}

interface FinancialMetrics {
  revenue: number;
  operatingExpenses: number;
  propertyTax: number;
  insurance: number;
  maintenance: number;
  debtService: number;
  noi: number;
  netCashFlow: number;
  units: number;
  capRate: number;
}

export function PerformanceTab({
  portfolioFinancials,
  notes,
  clickedElements,
  cellNotes,
  visibleColumns,
  onHandleClick,
  onHandleNoteChange,
  onFlagIssue,
  selectedProperty
}: PerformanceTabProps) {
  const [financialData, setFinancialData] = useState<any>(null);
  const [propertyData, setPropertyData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<'portfolio' | 'property'>('portfolio');
  const [dataValidation, setDataValidation] = useState<any>(null);

  useEffect(() => {
    if (selectedProperty) {
      setAnalysisType('property');
      fetchPropertyFinancials();
      
      // Validate property data for incomplete scenarios
      const validation = validatePropertyData(selectedProperty);
      setDataValidation(validation);
    } else {
      setAnalysisType('portfolio');
      setPropertyData(null);
      setDataValidation(null);
    }
  }, [selectedProperty]);

  const fetchPropertyFinancials = async () => {
    if (!selectedProperty) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🏢 Fetching financial data for property:', {
        selectedProperty,
        assetId: selectedProperty["Asset ID"],
        propertyId: selectedProperty.PropertyId,
        propertyIdType: typeof selectedProperty.PropertyId
      });
      
      // Fetch property-specific financial data directly from AF_Investments_export table
      const response = await fetch(`/api/investments?portfolio=all`);
      if (!response.ok) throw new Error('Failed to fetch investment data');
      
      const allInvestments = await response.json();
      
      // Find the specific property data using Asset ID or PropertyId
      // Handle different data types - PropertyId could be string or number on both sides
      const property = allInvestments.find((inv: any) => {
        const invAssetId = inv["Asset ID"];
        const invPropertyId = inv.PropertyId;
        const selectedAssetId = selectedProperty["Asset ID"];
        const selectedPropertyId = selectedProperty.PropertyId;
        
        // Check Asset ID match (exact string match)
        if (invAssetId && selectedAssetId && invAssetId === selectedAssetId) {
          return true;
        }
        
        // Check PropertyId match (handle string/number conversion)
        if (invPropertyId && selectedPropertyId) {
          const invPropIdStr = invPropertyId.toString();
          const selectedPropIdStr = selectedPropertyId.toString();
          if (invPropIdStr === selectedPropIdStr) {
            return true;
          }
        }
        
        return false;
      });
      
      if (property) {
        console.log('🎯 Found property data:', property);
        
        // Helper function to parse currency strings
        const parseCurrency = (value: string | number): number => {
          if (!value) return 0;
          if (typeof value === 'number') return value;
          // Remove currency symbols, commas, and spaces, then parse
          const cleaned = value.toString().replace(/[\$,\s]/g, '');
          return parseFloat(cleaned) || 0;
        };

        // Helper function to parse percentage strings
        const parsePercent = (value: string | number): number => {
          if (!value) return 0;
          if (typeof value === 'number') return value;
          // Remove % symbol and parse
          const cleaned = value.toString().replace('%', '');
          return parseFloat(cleaned) || 0;
        };

        const metrics: FinancialMetrics = {
          revenue: parseCurrency(property["Proforma Revenue"]),
          operatingExpenses: parseCurrency(property["Proforma Operating Expenses"]),
          propertyTax: parseCurrency(property["Exp - Tax - Prop"]),
          insurance: parseCurrency(property["Exp - Prop Ins."]),
          maintenance: parseCurrency(property["Exp - R&M"]),
          debtService: parseCurrency(property["Debt Service"]),
          noi: parseCurrency(property["NOI"]),
          netCashFlow: parseCurrency(property["NOI"]) - parseCurrency(property["Debt Service"]),
          units: parseInt(property["Units"]) || 1,
          capRate: parsePercent(property["Going-In Cap Rate"])
        };
        
        console.log('📊 Parsed financial metrics:', metrics);
        setPropertyData(metrics);
      } else {
        console.log('❌ Property not found in data.');
        console.log('🔍 Looking for:', {
          assetId: selectedProperty["Asset ID"],
          propertyId: selectedProperty.PropertyId,
          propertyIdType: typeof selectedProperty.PropertyId
        });
        console.log('📋 Available properties:', allInvestments.slice(0, 10).map((inv: any) => ({
          assetId: inv["Asset ID"],
          propertyId: inv.PropertyId,
          propertyIdType: typeof inv.PropertyId,
          name: inv["Asset ID + Name"]
        })));
        setError(`Property not found. Looking for Asset ID: ${selectedProperty["Asset ID"]} or PropertyId: ${selectedProperty.PropertyId}`);
      }
      
    } catch (err) {
      console.error('Error fetching property financials:', err);
      setError(err instanceof Error ? err.message : 'Failed to load property financials');
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

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const calculatePerUnitMetrics = (metrics: FinancialMetrics) => {
    const units = metrics.units || 1;
    return {
      revenuePerUnit: metrics.revenue / units,
      expensesPerUnit: metrics.operatingExpenses / units,
      noiPerUnit: metrics.noi / units,
      cashFlowPerUnit: metrics.netCashFlow / units,
    };
  };

  const getFinancialAnalysis = (metrics: FinancialMetrics) => {
    const perUnit = calculatePerUnitMetrics(metrics);
    const expenseRatio = metrics.revenue > 0 ? (metrics.operatingExpenses / metrics.revenue) * 100 : 0;
    const cashOnCashReturn = metrics.debtService > 0 ? (metrics.netCashFlow / metrics.debtService) * 100 : 0;
    
    return {
      perUnit,
      expenseRatio,
      cashOnCashReturn,
      leverageRatio: metrics.revenue > 0 ? (metrics.debtService / metrics.revenue) * 100 : 0,
      noiMargin: metrics.revenue > 0 ? (metrics.noi / metrics.revenue) * 100 : 0
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-institutional-black mx-auto mb-4"></div>
          <p>Loading financial analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="text-red-600">
            <h3 className="text-sm font-medium">Error loading financial data</h3>
            <p className="text-sm mt-1">{error}</p>
            <button 
              onClick={fetchPropertyFinancials}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
  const currentData = analysisType === 'property' && propertyData ? propertyData : portfolioFinancials;
  const analysis = analysisType === 'property' && propertyData ? getFinancialAnalysis(propertyData) : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold uppercase text-institutional-black">
          {analysisType === 'property' 
            ? `Financial Performance - ${selectedProperty?.["Asset ID + Name"] || 'Selected Property'}`
            : 'Portfolio Financial Performance Analysis'
          }
        </h3>
        
        {analysisType === 'property' && (
          <Button 
            onClick={fetchPropertyFinancials}
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        )}
      </div>


      {/* Show calculated performance metrics for Park Portfolio properties */}
      {analysisType === 'property' && !propertyData && selectedProperty && (
        <div className="mb-5">
          <CalculatedFinancials 
            selectedProperty={selectedProperty} 
            formatCurrency={formatCurrency}
          />
        </div>
      )}

      {/* Property-specific performance metrics */}
      {analysisType === 'property' && propertyData && analysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
          <div className="bg-blue-50 p-3 rounded-lg border">
            <h4 className="text-xs font-bold text-blue-800 uppercase mb-1">NOI Margin</h4>
            <div className="text-lg font-bold text-blue-700">{formatPercent(analysis.noiMargin)}</div>
            <div className="text-xs text-gray-600">Net Operating Income / Revenue</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg border">
            <h4 className="text-xs font-bold text-green-800 uppercase mb-1">Cash Flow/Unit</h4>
            <div className="text-lg font-bold text-green-700">{formatCurrency(analysis.perUnit.cashFlowPerUnit)}</div>
            <div className="text-xs text-gray-600">Monthly net cash flow per unit</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg border">
            <h4 className="text-xs font-bold text-yellow-800 uppercase mb-1">Expense Ratio</h4>
            <div className="text-lg font-bold text-yellow-700">{formatPercent(analysis.expenseRatio)}</div>
            <div className="text-xs text-gray-600">Operating Expenses / Revenue</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border">
            <h4 className="text-xs font-bold text-purple-800 uppercase mb-1">Cap Rate</h4>
            <div className="text-lg font-bold text-purple-700">{formatPercent(propertyData.capRate)}</div>
            <div className="text-xs text-gray-600">Going-in capitalization rate</div>
          </div>
        </div>
      )}

      {/* Main Financial Table */}
      <div className="overflow-hidden border-2 border-institutional-black">
        <div className="bg-institutional-black text-institutional-white p-2">
          <h4 className="font-bold text-xs uppercase">
            {analysisType === 'property' ? 'Property Financial Performance' : 'Portfolio Financial Summary'}
          </h4>
        </div>
        <table className="institutional-table">
          <thead>
            <tr>
              {visibleColumns.performance.account && <th>GL Code</th>}
              {visibleColumns.performance.account && <th>Account Description</th>}
              {visibleColumns.performance.current && <th>Amount</th>}
              {analysisType === 'property' && <th>Per Unit</th>}
              {visibleColumns.performance.current && <th>Type</th>}
              {visibleColumns.performance.notes && <th>Notes</th>}
              {visibleColumns.performance.actions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {currentData ? (
              <>
                {/* Revenue */}
                <tr>
                  <td 
                    onClick={() => onHandleClick('perf-revenue-code')}
                    className={`font-mono-data font-semibold cursor-pointer transition-all ${
                      clickedElements.has('perf-revenue-code') ? 'click-highlight' : ''
                    }`}
                  >
                    4000
                  </td>
                  <td 
                    onClick={() => onHandleClick('perf-revenue-desc')}
                    className={`cursor-pointer transition-all ${
                      clickedElements.has('perf-revenue-desc') ? 'click-highlight' : ''
                    }`}
                  >
                    {analysisType === 'property' ? 'Property Revenue' : 'Total Portfolio Revenue'}
                  </td>
                  <td 
                    onClick={() => onHandleClick('perf-revenue')}
                    className={`font-mono-data font-semibold text-success-green cursor-pointer transition-all ${
                      clickedElements.has('perf-revenue') ? 'click-highlight' : ''
                    }`}
                  >
                    +{formatCurrency(
                      analysisType === 'property' ? propertyData?.revenue || 0 : 
                      currentData.total_proforma_revenue || currentData.total_revenue || 0
                    )}
                  </td>
                  {analysisType === 'property' && (
                    <td className="font-mono-data text-right text-sm text-gray-600">
                      {formatCurrency(analysis?.perUnit.revenuePerUnit || 0)}
                    </td>
                  )}
                  <td className="text-center">
                    <Badge className="text-[8px] font-bold px-1 py-0 h-4 bg-green-100 text-green-800">
                      REV
                    </Badge>
                  </td>
                  <td className="text-center">
                    <Input 
                      type="text" 
                      placeholder="Add note..." 
                      className="text-xs border-institutional-border h-6 px-2"
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          onHandleNoteChange('perf-revenue', e.target.value);
                          e.target.value = '';
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement;
                          if (input.value.trim()) {
                            onHandleNoteChange('perf-revenue', input.value);
                            input.value = '';
                          }
                        }
                      }}
                    />
                  </td>
                  <td className="text-center">
                    <Button 
                      onClick={() => onFlagIssue('perf-revenue')}
                      variant="destructive"
                      size="sm" 
                      className="bg-orange-500 hover:bg-orange-600 text-white text-[8px] font-bold px-1.5 py-0 h-5"
                    >
                      <Flag className="w-2 h-2 mr-0.5" />
                      FLAG
                    </Button>
                  </td>
                </tr>

                {/* Operating Expenses */}
                <tr>
                  <td className="font-mono-data font-semibold">6000</td>
                  <td>{analysisType === 'property' ? 'Operating Expenses' : 'Total Operating Expenses'}</td>
                  <td className="font-mono-data font-semibold text-red-600">
                    {formatCurrency(
                      analysisType === 'property' ? propertyData?.operatingExpenses || 0 :
                      currentData.total_operating_expenses || 0
                    )}
                  </td>
                  {analysisType === 'property' && (
                    <td className="font-mono-data text-right text-sm text-gray-600">
                      {formatCurrency(analysis?.perUnit.expensesPerUnit || 0)}
                    </td>
                  )}
                  <td className="text-center">
                    <Badge className="text-[8px] font-bold px-1 py-0 h-4 bg-red-100 text-red-800">
                      EXP
                    </Badge>
                  </td>
                  <td className="text-center">
                    <Input 
                      placeholder="Add note..." 
                      className="text-xs border-institutional-border h-6 px-2"
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          onHandleNoteChange('perf-expenses', e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                  </td>
                  <td className="text-center">
                    <Button 
                      onClick={() => onFlagIssue('perf-expenses')}
                      variant="destructive"
                      size="sm" 
                      className="bg-orange-500 hover:bg-orange-600 text-white text-[8px] font-bold px-1.5 py-0 h-5"
                    >
                      <Flag className="w-2 h-2 mr-0.5" />
                      FLAG
                    </Button>
                  </td>
                </tr>

                {/* Property Tax */}
                <tr>
                  <td className="font-mono-data font-semibold">6100</td>
                  <td>Property Tax</td>
                  <td className="font-mono-data font-semibold text-red-600">
                    {formatCurrency(
                      analysisType === 'property' ? propertyData?.propertyTax || 0 :
                      currentData.total_property_tax || 0
                    )}
                  </td>
                  {analysisType === 'property' && (
                    <td className="font-mono-data text-right text-sm text-gray-600">
                      {formatCurrency((propertyData?.propertyTax || 0) / (propertyData?.units || 1))}
                    </td>
                  )}
                  <td className="text-center">
                    <Badge className="text-[8px] font-bold px-1 py-0 h-4 bg-red-100 text-red-800">
                      EXP
                    </Badge>
                  </td>
                  <td className="text-center">
                    <Input 
                      placeholder="Add note..." 
                      className="text-xs border-institutional-border h-6 px-2"
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          onHandleNoteChange('perf-tax', e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                  </td>
                  <td className="text-center">
                    <Button 
                      onClick={() => onFlagIssue('perf-tax')}
                      variant="destructive"
                      size="sm" 
                      className="bg-orange-500 hover:bg-orange-600 text-white text-[8px] font-bold px-1.5 py-0 h-5"
                    >
                      <Flag className="w-2 h-2 mr-0.5" />
                      FLAG
                    </Button>
                  </td>
                </tr>

                {/* Insurance */}
                <tr>
                  <td className="font-mono-data font-semibold">6200</td>
                  <td>Property Insurance</td>
                  <td className="font-mono-data font-semibold text-red-600">
                    {formatCurrency(
                      analysisType === 'property' ? propertyData?.insurance || 0 :
                      currentData.total_insurance || 0
                    )}
                  </td>
                  {analysisType === 'property' && (
                    <td className="font-mono-data text-right text-sm text-gray-600">
                      {formatCurrency((propertyData?.insurance || 0) / (propertyData?.units || 1))}
                    </td>
                  )}
                  <td className="text-center">
                    <Badge className="text-[8px] font-bold px-1 py-0 h-4 bg-red-100 text-red-800">
                      EXP
                    </Badge>
                  </td>
                  <td className="text-center">
                    <Input 
                      placeholder="Add note..." 
                      className="text-xs border-institutional-border h-6 px-2"
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          onHandleNoteChange('perf-insurance', e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                  </td>
                  <td className="text-center">
                    <Button 
                      onClick={() => onFlagIssue('perf-insurance')}
                      variant="destructive"
                      size="sm" 
                      className="bg-orange-500 hover:bg-orange-600 text-white text-[8px] font-bold px-1.5 py-0 h-5"
                    >
                      <Flag className="w-2 h-2 mr-0.5" />
                      FLAG
                    </Button>
                  </td>
                </tr>

                {/* Maintenance */}
                <tr>
                  <td className="font-mono-data font-semibold">6300</td>
                  <td>Repair & Maintenance</td>
                  <td className="font-mono-data font-semibold text-red-600">
                    {formatCurrency(
                      analysisType === 'property' ? propertyData?.maintenance || 0 :
                      currentData.total_maintenance || 0
                    )}
                  </td>
                  {analysisType === 'property' && (
                    <td className="font-mono-data text-right text-sm text-gray-600">
                      {formatCurrency((propertyData?.maintenance || 0) / (propertyData?.units || 1))}
                    </td>
                  )}
                  <td className="text-center">
                    <Badge className="text-[8px] font-bold px-1 py-0 h-4 bg-red-100 text-red-800">
                      EXP
                    </Badge>
                  </td>
                  <td className="text-center">
                    <Input 
                      placeholder="Add note..." 
                      className="text-xs border-institutional-border h-6 px-2"
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          onHandleNoteChange('perf-maintenance', e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                  </td>
                  <td className="text-center">
                    <Button 
                      onClick={() => onFlagIssue('perf-maintenance')}
                      variant="destructive"
                      size="sm" 
                      className="bg-orange-500 hover:bg-orange-600 text-white text-[8px] font-bold px-1.5 py-0 h-5"
                    >
                      <Flag className="w-2 h-2 mr-0.5" />
                      FLAG
                    </Button>
                  </td>
                </tr>

                {/* Debt Service */}
                <tr>
                  <td className="font-mono-data font-semibold">6400</td>
                  <td>Debt Service</td>
                  <td className="font-mono-data font-semibold text-red-600">
                    {formatCurrency(
                      analysisType === 'property' ? propertyData?.debtService || 0 :
                      currentData.total_debt_service || 0
                    )}
                  </td>
                  {analysisType === 'property' && (
                    <td className="font-mono-data text-right text-sm text-gray-600">
                      {formatCurrency((propertyData?.debtService || 0) / (propertyData?.units || 1))}
                    </td>
                  )}
                  <td className="text-center">
                    <Badge className="text-[8px] font-bold px-1 py-0 h-4 bg-red-100 text-red-800">
                      DEBT
                    </Badge>
                  </td>
                  <td className="text-center">
                    <Input 
                      placeholder="Add note..." 
                      className="text-xs border-institutional-border h-6 px-2"
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          onHandleNoteChange('perf-debt', e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                  </td>
                  <td className="text-center">
                    <Button 
                      onClick={() => onFlagIssue('perf-debt')}
                      variant="destructive"
                      size="sm" 
                      className="bg-orange-500 hover:bg-orange-600 text-white text-[8px] font-bold px-1.5 py-0 h-5"
                    >
                      <Flag className="w-2 h-2 mr-0.5" />
                      FLAG
                    </Button>
                  </td>
                </tr>

                {/* NOI */}
                <tr className="bg-institutional-accent font-bold">
                  <td className="font-mono-data font-semibold">NOI</td>
                  <td>Net Operating Income</td>
                  <td className="font-mono-data font-semibold text-institutional-black">
                    {formatCurrency(
                      analysisType === 'property' ? propertyData?.noi || 0 :
                      currentData.total_noi || 0
                    )}
                  </td>
                  {analysisType === 'property' && (
                    <td className="font-mono-data text-right text-sm font-bold">
                      {formatCurrency(analysis?.perUnit.noiPerUnit || 0)}
                    </td>
                  )}
                  <td className="text-center">
                    <Badge className="text-[8px] font-bold px-1 py-0 h-4 bg-blue-100 text-blue-800">
                      NOI
                    </Badge>
                  </td>
                  <td></td>
                  <td></td>
                </tr>

                {/* Net Cash Flow */}
                <tr className="bg-green-50 font-semibold">
                  <td className="font-mono-data font-semibold">CASH</td>
                  <td>Net Cash Flow</td>
                  <td className="font-mono-data font-semibold text-green-700">
                    {formatCurrency(
                      Math.abs(analysisType === 'property' ? propertyData?.netCashFlow || 0 :
                      ((currentData.total_noi || 0) - (currentData.total_debt_service || 0)))
                    )}
                  </td>
                  {analysisType === 'property' && (
                    <td className="font-mono-data text-right text-sm font-bold text-green-700">
                      {formatCurrency(analysis?.perUnit.cashFlowPerUnit || 0)}
                    </td>
                  )}
                  <td className="text-center">
                    <Badge className="text-[8px] font-bold px-1 py-0 h-4 bg-green-100 text-green-800">
                      CASH
                    </Badge>
                  </td>
                  <td></td>
                  <td></td>
                </tr>
              </>
            ) : (
              <tr>
                <td colSpan={analysisType === 'property' ? 7 : 6} className="text-center py-8 text-gray-500">
                  {analysisType === 'property' 
                    ? 'No property financial data available. Please select a property.'
                    : 'No portfolio financial data available. Please select a portfolio.'
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}