import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { downloadExcelTemplate } from '@/lib/excel-template-generator';
import type { Portfolio } from '@shared/schema';

interface PortfolioNavigationProps {
  portfolios: Portfolio[];
  selectedPortfolio: string;
  onSelectPortfolio: (portfolioKey: string) => void;
  clickedElements: Set<string>;
}

export function PortfolioNavigation({
  portfolios,
  selectedPortfolio,
  onSelectPortfolio,
  clickedElements
}: PortfolioNavigationProps) {
  return (
    <Card className="mb-5 border-2 border-institutional-black">
      <CardHeader className="bg-institutional-black text-institutional-white p-3 flex flex-row items-center justify-between">
        <CardTitle className="font-bold text-xs uppercase">Portfolio Selection</CardTitle>
        <Button
          onClick={() => downloadExcelTemplate()}
          className="bg-institutional-white text-institutional-black hover:bg-gray-200 font-bold text-xs px-3 py-1"
          size="sm"
        >
          <Download className="w-3 h-3 mr-1" />
          DOWNLOAD TEMPLATE
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-5">
          {portfolios.map((portfolio: Portfolio) => (
            <button
              key={portfolio.key}
              id={`portfolio-${portfolio.key}`}
              onClick={() => onSelectPortfolio(portfolio.key)}
              className={`portfolio-item border-r border-institutional-border p-4 text-left hover:bg-institutional-accent transition-all ${
                selectedPortfolio === portfolio.key ? 'active bg-blue-50 border-l-4 border-blue-600' : ''
              } ${clickedElements.has(`portfolio-${portfolio.key}`) ? 'click-highlight' : ''}`}
            >
              <div className="font-bold text-sm text-institutional-black uppercase mb-2">
                {portfolio.name}
              </div>
              <div className="text-xs text-gray-600 grid grid-cols-3 gap-2">
                <span>{portfolio.totalUnits} Units</span>
                <span>${Math.round(portfolio.totalNOI / 1000).toLocaleString()}K NOI</span>
                <span>{Number(portfolio.capRate.toFixed(2))}% Cap</span>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}