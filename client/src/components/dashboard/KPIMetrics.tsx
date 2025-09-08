import { Card, CardContent } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import type { Portfolio, Property } from '@shared/schema';

interface KPIMetricsProps {
  currentPortfolio: Portfolio | undefined;
  portfolioSummary: any;
  clickedElements: Set<string>;
  onHandleClick: (elementId: string) => void;
  selectedProperty?: any;
}

interface PropertyMetrics {
  revenue: number;
  noi: number;
  units: number;
  capRate: number;
  debtService: number;
  netCashFlow: number;
  expenseRatio: number;
}

export function KPIMetrics({
  currentPortfolio,
  portfolioSummary,
  clickedElements,
  onHandleClick,
  selectedProperty
}: KPIMetricsProps) {
  const [propertyMetrics, setPropertyMetrics] = useState<PropertyMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [displayMode, setDisplayMode] = useState<'portfolio' | 'property'>('portfolio');

  useEffect(() => {
    if (selectedProperty) {
      setDisplayMode('property');
      fetchPropertyMetrics();
    } else {
      setDisplayMode('portfolio');
      setPropertyMetrics(null);
    }
  }, [selectedProperty]);

  const fetchPropertyMetrics = async () => {
    if (!selectedProperty) return;
    
    setLoading(true);
    try {
      // Fetch property-specific data from investments table
      const response = await fetch(`/api/investments?portfolio=all`);
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const allInvestments = await response.json();
      
      // Find the specific property
      const property = allInvestments.find((inv: any) => {
        const invAssetId = inv["Asset ID"];
        const invPropertyId = inv.PropertyId;
        const selectedAssetId = selectedProperty["Asset ID"];
        const selectedPropertyId = selectedProperty.PropertyId;
        
        if (invAssetId && selectedAssetId && invAssetId === selectedAssetId) return true;
        if (invPropertyId && selectedPropertyId) {
          return invPropertyId.toString() === selectedPropertyId.toString();
        }
        return false;
      });
      
      if (property) {
        // Helper function to parse currency strings
        const parseCurrency = (value: string | number): number => {
          if (!value) return 0;
          if (typeof value === 'number') return value;
          const cleaned = value.toString().replace(/[\$,\s]/g, '');
          return parseFloat(cleaned) || 0;
        };

        const parsePercent = (value: string | number): number => {
          if (!value) return 0;
          if (typeof value === 'number') return value;
          const cleaned = value.toString().replace('%', '');
          return parseFloat(cleaned) || 0;
        };

        const revenue = parseCurrency(property["Proforma Revenue"]);
        const noi = parseCurrency(property["NOI"]);
        const units = parseInt(property["Units"]) || 1;
        const debtService = parseCurrency(property["Debt Service"]);
        const operatingExpenses = parseCurrency(property["Proforma Operating Expenses"]);

        const metrics: PropertyMetrics = {
          revenue,
          noi,
          units,
          capRate: parsePercent(property["Going-In Cap Rate"]),
          debtService,
          netCashFlow: noi - debtService,
          expenseRatio: revenue > 0 ? (operatingExpenses / revenue) * 100 : 0
        };
        
        setPropertyMetrics(metrics);
      }
    } catch (error) {
      console.error('Error fetching property metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (displayMode === 'portfolio' && (!currentPortfolio || !portfolioSummary)) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(value));
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (loading) {
    return (
      <Card className="bg-institutional-accent border-2 border-institutional-black mb-5">
        <CardContent className="p-5">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-institutional-black"></div>
            <span className="ml-3">Loading metrics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-institutional-accent border-2 border-institutional-black mb-5">
      <CardContent className="p-5">
        <div className="text-sm font-bold uppercase text-institutional-black mb-4">
          {displayMode === 'property' && selectedProperty
            ? `${selectedProperty["Asset ID + Name"] || 'Selected Property'} - Property Overview`
            : `${currentPortfolio?.name || 'Portfolio'} - Portfolio Overview`
          }
        </div>
        <div className="grid grid-cols-6 gap-1 bg-institutional-border">
          {/* NOI Metric */}
          <div 
            onClick={() => onHandleClick('kpi-noi')} 
            className={`kpi-card bg-institutional-white p-4 text-center cursor-pointer hover:bg-institutional-accent transition-all ${
              clickedElements.has('kpi-noi') ? 'click-highlight' : ''
            }`}
          >
            <div className="text-xs uppercase text-gray-600 mb-2 font-bold">
              {displayMode === 'property' ? 'NOI' : 'Total NOI'}
            </div>
            <div className="text-2xl font-bold text-institutional-black font-mono-data mb-1">
              {displayMode === 'property' && propertyMetrics 
                ? formatCurrency(propertyMetrics.noi)
                : `$${portfolioSummary?.total_noi?.toLocaleString() || '0'}`
              }
            </div>
            <div className="text-xs font-bold text-success-green">
              {displayMode === 'property' ? 'Annual' : 'Portfolio'}
            </div>
          </div>
          
          {/* Properties/Units */}
          <div 
            onClick={() => onHandleClick('kpi-properties')} 
            className={`kpi-card bg-institutional-white p-4 text-center cursor-pointer hover:bg-institutional-accent transition-all ${
              clickedElements.has('kpi-properties') ? 'click-highlight' : ''
            }`}
          >
            <div className="text-xs uppercase text-gray-600 mb-2 font-bold">
              {displayMode === 'property' ? 'Units' : 'Properties'}
            </div>
            <div className="text-2xl font-bold text-institutional-black font-mono-data mb-1">
              {displayMode === 'property' && propertyMetrics 
                ? formatNumber(propertyMetrics.units)
                : formatNumber(portfolioSummary?.total_properties || 0)
              }
            </div>
            <div className="text-xs font-bold text-success-green">
              {displayMode === 'property' ? 'Total' : 'Assets'}
            </div>
          </div>
          
          {/* Revenue */}
          <div 
            onClick={() => onHandleClick('kpi-revenue')} 
            className={`kpi-card bg-institutional-white p-4 text-center cursor-pointer hover:bg-institutional-accent transition-all ${
              clickedElements.has('kpi-revenue') ? 'click-highlight' : ''
            }`}
          >
            <div className="text-xs uppercase text-gray-600 mb-2 font-bold">
              {displayMode === 'property' ? 'Revenue' : 'Total Units'}
            </div>
            <div className="text-2xl font-bold text-institutional-black font-mono-data mb-1">
              {displayMode === 'property' && propertyMetrics 
                ? formatCurrency(propertyMetrics.revenue)
                : formatNumber(portfolioSummary?.total_units || 0)
              }
            </div>
            <div className="text-xs font-bold text-success-green">
              {displayMode === 'property' ? 'Annual' : 'Units'}
            </div>
          </div>
          
          {/* Cash Flow/Total Revenue */}
          <div 
            onClick={() => onHandleClick('kpi-cashflow')} 
            className={`kpi-card bg-institutional-white p-4 text-center cursor-pointer hover:bg-institutional-accent transition-all ${
              clickedElements.has('kpi-cashflow') ? 'click-highlight' : ''
            }`}
          >
            <div className="text-xs uppercase text-gray-600 mb-2 font-bold">
              {displayMode === 'property' ? 'Cash Flow' : 'Total Revenue'}
            </div>
            <div className="text-2xl font-bold text-institutional-black font-mono-data mb-1">
              {displayMode === 'property' && propertyMetrics 
                ? formatCurrency(propertyMetrics.netCashFlow)
                : `$${portfolioSummary?.total_revenue?.toLocaleString() || '0'}`
              }
            </div>
            <div className="text-xs font-bold text-success-green">
              {displayMode === 'property' ? 'Annual' : 'Annual'}
            </div>
          </div>
          
          {/* Cap Rate */}
          <div 
            onClick={() => onHandleClick('kpi-cap')} 
            className={`kpi-card bg-institutional-white p-4 text-center cursor-pointer hover:bg-institutional-accent transition-all ${
              clickedElements.has('kpi-cap') ? 'click-highlight' : ''
            }`}
          >
            <div className="text-xs uppercase text-gray-600 mb-2 font-bold">
              {displayMode === 'property' ? 'Cap Rate' : 'Avg Cap Rate'}
            </div>
            <div className="text-2xl font-bold text-institutional-black font-mono-data mb-1">
              {displayMode === 'property' && propertyMetrics 
                ? `${propertyMetrics.capRate.toFixed(1)}%`
                : `${portfolioSummary?.avg_cap_rate?.toFixed(1) || '0.0'}%`
              }
            </div>
            <div className="text-xs font-bold text-success-green">
              {displayMode === 'property' ? 'Going-In' : 'Weighted'}
            </div>
          </div>
          
          {/* Expense Ratio/Occupancy */}
          <div 
            onClick={() => onHandleClick('kpi-ratio')} 
            className={`kpi-card bg-institutional-white p-4 text-center cursor-pointer hover:bg-institutional-accent transition-all ${
              clickedElements.has('kpi-ratio') ? 'click-highlight' : ''
            }`}
          >
            <div className="text-xs uppercase text-gray-600 mb-2 font-bold">
              {displayMode === 'property' ? 'Expense Ratio' : 'Occupancy'}
            </div>
            <div className="text-2xl font-bold text-institutional-black font-mono-data mb-1">
              {displayMode === 'property' && propertyMetrics 
                ? `${propertyMetrics.expenseRatio.toFixed(1)}%`
                : `${portfolioSummary?.avg_occupancy?.toFixed(0) || '95'}%`
              }
            </div>
            <div className="text-xs font-bold text-success-green">
              {displayMode === 'property' ? 'OpEx/Revenue' : 'Rate'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}