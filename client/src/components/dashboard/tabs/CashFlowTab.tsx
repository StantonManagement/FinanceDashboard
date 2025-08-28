import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flag } from 'lucide-react';
import type { GLAccount, Note } from '@shared/schema';

interface CashFlowTabProps {
  portfolioFinancials: any;
  notes: Note[];
  clickedElements: Set<string>;
  onHandleClick: (elementId: string) => void;
  onHandleNoteChange: (cellId: string, value: string) => void;
  onFlagIssue: (cellId: string) => void;
}

export function CashFlowTab({
  portfolioFinancials,
  notes,
  clickedElements,
  onHandleClick,
  onHandleNoteChange,
  onFlagIssue
}: CashFlowTabProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold uppercase text-institutional-black">
          Portfolio Cash Flow Analysis
        </h3>
      </div>
      
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
            {portfolioFinancials ? (
              // Portfolio cash flow data from investments
              [
                { code: '4000', description: 'Total Portfolio Revenue', amount: portfolioFinancials.total_proforma_revenue || 0, type: 'revenue' },
                { code: '6000', description: 'Total Operating Expenses', amount: portfolioFinancials.total_operating_expenses || 0, type: 'expense' },
                { code: '6100', description: 'Total Property Tax', amount: portfolioFinancials.total_property_tax || 0, type: 'expense' },
                { code: '6200', description: 'Total Property Insurance', amount: portfolioFinancials.total_insurance || 0, type: 'expense' },
                { code: '6300', description: 'Total Repair & Maintenance', amount: portfolioFinancials.total_maintenance || 0, type: 'expense' },
                { code: '6400', description: 'Total Debt Service', amount: portfolioFinancials.total_debt_service || 0, type: 'expense' },
              ]
              .filter((account) => account.amount !== 0)
              .sort((a, b) => {
                // Sort by type (revenue first) then by GL code
                if (a.type !== b.type) {
                  return a.type === 'revenue' ? -1 : 1;
                }
                return a.code.localeCompare(b.code);
              })
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
              })
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  No portfolio financial data available. Please select a portfolio.
                </td>
              </tr>
            )}
            
            {/* Summary rows */}
            {portfolioFinancials && (
              <>
                <tr className="bg-green-50 border-t-2 border-institutional-black">
                  <td colSpan={2} className="font-bold text-right">TOTAL REVENUE:</td>
                  <td className="font-mono-data font-bold text-success-green text-right">
                    +${portfolioFinancials.total_proforma_revenue?.toLocaleString() || '0'}
                  </td>
                  <td colSpan={3}></td>
                </tr>
            
                <tr className="bg-red-50">
                  <td colSpan={2} className="font-bold text-right">TOTAL EXPENSES:</td>
                  <td className="font-mono-data font-bold text-red-600 text-right">
                    -${(
                      (portfolioFinancials.total_operating_expenses || 0) +
                      (portfolioFinancials.total_property_tax || 0) +
                      (portfolioFinancials.total_insurance || 0) +
                      (portfolioFinancials.total_maintenance || 0) +
                      (portfolioFinancials.total_debt_service || 0)
                    ).toLocaleString()}
                  </td>
                  <td colSpan={3}></td>
                </tr>
                
                <tr className="bg-blue-50 border-t-2 border-institutional-black">
                  <td colSpan={2} className="font-bold text-right">NET OPERATING INCOME:</td>
                  <td className="font-mono-data font-bold text-institutional-black text-right">
                    ${portfolioFinancials.total_noi?.toLocaleString() || '0'}
                  </td>
                  <td colSpan={3}></td>
                </tr>
                
                <tr className="bg-green-50 border-t-2 border-institutional-black">
                  <td colSpan={2} className="font-bold text-right">NET CASH FLOW:</td>
                  <td className="font-mono-data font-bold text-green-700 text-right">
                    ${((portfolioFinancials.total_noi || 0) - (portfolioFinancials.total_debt_service || 0)).toLocaleString()}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}