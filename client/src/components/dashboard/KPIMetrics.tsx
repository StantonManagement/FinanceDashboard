import { Card, CardContent } from '@/components/ui/card';
import type { Portfolio, Property } from '@shared/schema';

interface KPIMetricsProps {
  currentPortfolio: Portfolio | undefined;
  portfolioSummary: any;
  clickedElements: Set<string>;
  onHandleClick: (elementId: string) => void;
}

export function KPIMetrics({
  currentPortfolio,
  portfolioSummary,
  clickedElements,
  onHandleClick
}: KPIMetricsProps) {
  if (!currentPortfolio || !portfolioSummary) {
    return null;
  }

  return (
    <Card className="bg-institutional-accent border-2 border-institutional-black mb-5">
      <CardContent className="p-5">
        <div className="text-sm font-bold uppercase text-institutional-black mb-4">
          {currentPortfolio.name} Portfolio Metrics - Portfolio Overview
        </div>
        <div className="grid grid-cols-6 gap-1 bg-institutional-border">
          <div 
            onClick={() => onHandleClick('kpi-noi')} 
            className={`kpi-card bg-institutional-white p-4 text-center cursor-pointer hover:bg-institutional-accent transition-all ${
              clickedElements.has('kpi-noi') ? 'click-highlight' : ''
            }`}
          >
            <div className="text-xs uppercase text-gray-600 mb-2 font-bold">Total NOI</div>
            <div className="text-2xl font-bold text-institutional-black font-mono-data mb-1">
              ${portfolioSummary.total_noi?.toLocaleString() || '0'}
            </div>
            <div className="text-xs font-bold text-success-green">Portfolio</div>
          </div>
          
          <div 
            onClick={() => onHandleClick('kpi-margin')} 
            className={`kpi-card bg-institutional-white p-4 text-center cursor-pointer hover:bg-institutional-accent transition-all ${
              clickedElements.has('kpi-margin') ? 'click-highlight' : ''
            }`}
          >
            <div className="text-xs uppercase text-gray-600 mb-2 font-bold">Properties</div>
            <div className="text-2xl font-bold text-institutional-black font-mono-data mb-1">
              {portfolioSummary.total_properties || '0'}
            </div>
            <div className="text-xs font-bold text-success-green">Assets</div>
          </div>
          
          <div 
            onClick={() => onHandleClick('kpi-occupancy')} 
            className={`kpi-card bg-institutional-white p-4 text-center cursor-pointer hover:bg-institutional-accent transition-all ${
              clickedElements.has('kpi-occupancy') ? 'click-highlight' : ''
            }`}
          >
            <div className="text-xs uppercase text-gray-600 mb-2 font-bold">Total Units</div>
            <div className="text-2xl font-bold text-institutional-black font-mono-data mb-1">
              {portfolioSummary.total_units || '0'}
            </div>
            <div className="text-xs font-bold text-success-green">Units</div>
          </div>
          
          <div 
            onClick={() => onHandleClick('kpi-revenue')} 
            className={`kpi-card bg-institutional-white p-4 text-center cursor-pointer hover:bg-institutional-accent transition-all ${
              clickedElements.has('kpi-revenue') ? 'click-highlight' : ''
            }`}
          >
            <div className="text-xs uppercase text-gray-600 mb-2 font-bold">Total Revenue</div>
            <div className="text-2xl font-bold text-institutional-black font-mono-data mb-1">
              ${portfolioSummary.total_revenue?.toLocaleString() || '0'}
            </div>
            <div className="text-xs font-bold text-success-green">Annual</div>
          </div>
          
          <div 
            onClick={() => onHandleClick('kpi-cap')} 
            className={`kpi-card bg-institutional-white p-4 text-center cursor-pointer hover:bg-institutional-accent transition-all ${
              clickedElements.has('kpi-cap') ? 'click-highlight' : ''
            }`}
          >
            <div className="text-xs uppercase text-gray-600 mb-2 font-bold">Avg Cap Rate</div>
            <div className="text-2xl font-bold text-institutional-black font-mono-data mb-1">
              {portfolioSummary.avg_cap_rate?.toFixed(1) || '0.0'}%
            </div>
            <div className="text-xs font-bold text-success-green">Weighted</div>
          </div>
          
          <div 
            onClick={() => onHandleClick('kpi-dscr')} 
            className={`kpi-card bg-institutional-white p-4 text-center cursor-pointer hover:bg-institutional-accent transition-all ${
              clickedElements.has('kpi-dscr') ? 'click-highlight' : ''
            }`}
          >
            <div className="text-xs uppercase text-gray-600 mb-2 font-bold">Occupancy</div>
            <div className="text-2xl font-bold text-institutional-black font-mono-data mb-1">
              {portfolioSummary.avg_occupancy?.toFixed(0) || '95'}%
            </div>
            <div className="text-xs font-bold text-success-green">Rate</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}