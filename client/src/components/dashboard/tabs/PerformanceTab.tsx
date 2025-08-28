import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Flag, AlertTriangle } from 'lucide-react';
import type { GLAccount, Note } from '@shared/schema';

interface PerformanceTabProps {
  portfolioFinancials: any;
  notes: Note[];
  clickedElements: Set<string>;
  cellNotes: Record<string, string>;
  visibleColumns: any;
  onHandleClick: (elementId: string) => void;
  onHandleNoteChange: (cellId: string, value: string) => void;
  onFlagIssue: (cellId: string) => void;
}

export function PerformanceTab({
  portfolioFinancials,
  notes,
  clickedElements,
  cellNotes,
  visibleColumns,
  onHandleClick,
  onHandleNoteChange,
  onFlagIssue
}: PerformanceTabProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold uppercase text-institutional-black">
          Portfolio Financial Performance Analysis
        </h3>
      </div>
      
      <div className="overflow-hidden border-2 border-institutional-black">
        <table className="institutional-table">
          <thead>
            <tr>
              {visibleColumns.performance.account && <th>GL Code</th>}
              {visibleColumns.performance.account && <th>Account Description</th>}
              {visibleColumns.performance.current && <th>Current Period</th>}
              {visibleColumns.performance.current && <th>Type</th>}
              {visibleColumns.performance.notes && <th>Notes</th>}
              {visibleColumns.performance.actions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {portfolioFinancials ? (
              // Portfolio investment financial data display
              <>
                <tr>
                  <td className="font-mono-data font-semibold">4000</td>
                  <td>Total Portfolio Revenue</td>
                  <td className="font-mono-data font-semibold text-success-green">
                    +${portfolioFinancials.total_proforma_revenue?.toLocaleString() || portfolioFinancials.total_revenue?.toLocaleString() || '0'}
                  </td>
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
                      value={cellNotes['portfolio-revenue'] || ''}
                      onChange={(e) => onHandleNoteChange('portfolio-revenue', e.target.value)}
                    />
                  </td>
                  <td className="text-center space-x-1">
                    <Button 
                      onClick={() => onFlagIssue('portfolio-revenue')}
                      size="sm" 
                      className="btn-success h-6 px-2 text-[10px]"
                    >
                      <MessageSquare className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
                <tr>
                  <td className="font-mono-data font-semibold">6000</td>
                  <td>Total Operating Expenses</td>
                  <td className="font-mono-data font-semibold text-red-600">
                    -${portfolioFinancials.total_operating_expenses?.toLocaleString() || '0'}
                  </td>
                  <td className="text-center">
                    <Badge className="text-[8px] font-bold px-1 py-0 h-4 bg-red-100 text-red-800">
                      EXP
                    </Badge>
                  </td>
                  <td className="text-center">
                    <Input 
                      type="text" 
                      placeholder="Add note..." 
                      className="text-xs border-institutional-border h-6 px-2"
                      value={cellNotes['portfolio-expenses'] || ''}
                      onChange={(e) => onHandleNoteChange('portfolio-expenses', e.target.value)}
                    />
                  </td>
                  <td className="text-center space-x-1">
                    <Button 
                      onClick={() => onFlagIssue('portfolio-expenses')}
                      size="sm" 
                      className="btn-success h-6 px-2 text-[10px]"
                    >
                      <MessageSquare className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
                <tr>
                  <td className="font-mono-data font-semibold">6100</td>
                  <td>Total Property Tax</td>
                  <td className="font-mono-data font-semibold text-red-600">
                    -${portfolioFinancials.total_property_tax?.toLocaleString() || '0'}
                  </td>
                  <td className="text-center">
                    <Badge className="text-[8px] font-bold px-1 py-0 h-4 bg-red-100 text-red-800">
                      EXP
                    </Badge>
                  </td>
                  <td className="text-center">
                    <Input 
                      type="text" 
                      placeholder="Add note..." 
                      className="text-xs border-institutional-border h-6 px-2"
                      value={cellNotes['portfolio-tax'] || ''}
                      onChange={(e) => onHandleNoteChange('portfolio-tax', e.target.value)}
                    />
                  </td>
                  <td className="text-center space-x-1">
                    <Button 
                      onClick={() => onFlagIssue('portfolio-tax')}
                      size="sm" 
                      className="btn-success h-6 px-2 text-[10px]"
                    >
                      <MessageSquare className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
                <tr>
                  <td className="font-mono-data font-semibold">6200</td>
                  <td>Total Property Insurance</td>
                  <td className="font-mono-data font-semibold text-red-600">
                    -${portfolioFinancials.total_insurance?.toLocaleString() || '0'}
                  </td>
                  <td className="text-center">
                    <Badge className="text-[8px] font-bold px-1 py-0 h-4 bg-red-100 text-red-800">
                      EXP
                    </Badge>
                  </td>
                  <td className="text-center">
                    <Input 
                      type="text" 
                      placeholder="Add note..." 
                      className="text-xs border-institutional-border h-6 px-2"
                      value={cellNotes['portfolio-insurance'] || ''}
                      onChange={(e) => onHandleNoteChange('portfolio-insurance', e.target.value)}
                    />
                  </td>
                  <td className="text-center space-x-1">
                    <Button 
                      onClick={() => onFlagIssue('portfolio-insurance')}
                      size="sm" 
                      className="btn-success h-6 px-2 text-[10px]"
                    >
                      <MessageSquare className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
                <tr>
                  <td className="font-mono-data font-semibold">6300</td>
                  <td>Total Repair & Maintenance</td>
                  <td className="font-mono-data font-semibold text-red-600">
                    -${portfolioFinancials.total_maintenance?.toLocaleString() || '0'}
                  </td>
                  <td className="text-center">
                    <Badge className="text-[8px] font-bold px-1 py-0 h-4 bg-red-100 text-red-800">
                      EXP
                    </Badge>
                  </td>
                  <td className="text-center">
                    <Input 
                      type="text" 
                      placeholder="Add note..." 
                      className="text-xs border-institutional-border h-6 px-2"
                      value={cellNotes['portfolio-maintenance'] || ''}
                      onChange={(e) => onHandleNoteChange('portfolio-maintenance', e.target.value)}
                    />
                  </td>
                  <td className="text-center space-x-1">
                    <Button 
                      onClick={() => onFlagIssue('portfolio-maintenance')}
                      size="sm" 
                      className="btn-danger h-6 px-2 text-[10px]"
                    >
                      <Flag className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
                <tr>
                  <td className="font-mono-data font-semibold">6400</td>
                  <td>Total Debt Service</td>
                  <td className="font-mono-data font-semibold text-red-600">
                    -${portfolioFinancials.total_debt_service?.toLocaleString() || '0'}
                  </td>
                  <td className="text-center">
                    <Badge className="text-[8px] font-bold px-1 py-0 h-4 bg-red-100 text-red-800">
                      EXP
                    </Badge>
                  </td>
                  <td className="text-center">
                    <Input 
                      type="text" 
                      placeholder="Add note..." 
                      className="text-xs border-institutional-border h-6 px-2"
                      value={cellNotes['portfolio-debt'] || ''}
                      onChange={(e) => onHandleNoteChange('portfolio-debt', e.target.value)}
                    />
                  </td>
                  <td className="text-center space-x-1">
                    <Button 
                      onClick={() => onFlagIssue('portfolio-debt')}
                      size="sm" 
                      className="btn-success h-6 px-2 text-[10px]"
                    >
                      <MessageSquare className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
                <tr className="bg-institutional-accent font-bold">
                  <td className="font-mono-data font-semibold">NOI</td>
                  <td>Total Net Operating Income</td>
                  <td className="font-mono-data font-semibold text-institutional-black">
                    ${portfolioFinancials.total_noi?.toLocaleString() || '0'}
                  </td>
                  <td className="text-center">
                    <Badge className="text-[8px] font-bold px-1 py-0 h-4 bg-blue-100 text-blue-800">
                      NOI
                    </Badge>
                  </td>
                  <td></td>
                  <td></td>
                </tr>
                <tr className="bg-green-50 font-semibold">
                  <td className="font-mono-data font-semibold">CASH</td>
                  <td>Net Cash Flow</td>
                  <td className="font-mono-data font-semibold text-green-700">
                    ${((portfolioFinancials.total_noi || 0) - (portfolioFinancials.total_debt_service || 0)).toLocaleString()}
                  </td>
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
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  No portfolio financial data available. Please select a portfolio.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}