import { Input } from '@/components/ui/input';
import ClickableCell from '../../clickable-cell';

interface BalanceSheetTabProps {
  getCellComments?: (cellReference: string) => any[];
  handleCommentAdded?: () => void;
  selectedProperty?: any;
}

export function BalanceSheetTab({ getCellComments, handleCommentAdded, selectedProperty }: BalanceSheetTabProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold uppercase text-institutional-black">
          Balance Sheet Analysis & DSCR Calculations
        </h3>
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
              <tr>
                <td>Property Value (Appraised)</td>
                <td className="font-mono-data font-bold">${selectedProperty?.appraised_value?.toLocaleString() || '2,840,000'}</td>
                <td className="font-mono-data">87.2%</td>
                <td><span className="text-success-green font-bold">LOW</span></td>
              </tr>
              <tr>
                <td>Cash & Equivalents</td>
                <td className="font-mono-data font-bold">$156,000</td>
                <td className="font-mono-data">4.8%</td>
                <td><span className="text-success-green font-bold">LOW</span></td>
              </tr>
              <tr>
                <td>Tenant Security Deposits</td>
                <td className="font-mono-data font-bold">$48,200</td>
                <td className="font-mono-data">1.5%</td>
                <td><span className="text-success-green font-bold">LOW</span></td>
              </tr>
              <tr>
                <td>Accounts Receivable</td>
                <td className="font-mono-data font-bold">$21,800</td>
                <td className="font-mono-data">0.7%</td>
                <td><span className="text-red-600 font-bold">MEDIUM</span></td>
              </tr>
              <tr className="bg-blue-50 border-t-2 border-institutional-black">
                <td className="font-bold">TOTAL ASSETS</td>
                <td className="font-mono-data font-bold">$3,066,000</td>
                <td className="font-mono-data font-bold">100.0%</td>
                <td></td>
              </tr>
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
              <tr>
                <td>Primary Mortgage</td>
                <td className="font-mono-data font-bold">${selectedProperty?.debt1_initial?.toLocaleString() || '1,820,000'}</td>
                <td className="font-mono-data">{selectedProperty?.debt1_int_rate?.toFixed(2) || '4.25'}%</td>
                <td className="font-mono-data">{selectedProperty?.maturity_date?.split('T')[0] || '2029'}</td>
              </tr>
              <tr>
                <td>Line of Credit</td>
                <td className="font-mono-data font-bold">$125,000</td>
                <td className="font-mono-data">6.75%</td>
                <td className="font-mono-data">Revolving</td>
              </tr>
              <tr>
                <td>Tenant Deposits (Liability)</td>
                <td className="font-mono-data font-bold">$48,200</td>
                <td className="font-mono-data">0.00%</td>
                <td className="font-mono-data">On-Demand</td>
              </tr>
              <tr className="bg-red-50 border-t-2 border-institutional-black">
                <td className="font-bold">TOTAL LIABILITIES</td>
                <td className="font-mono-data font-bold">$1,993,200</td>
                <td className="font-mono-data font-bold">Blended: 4.56%</td>
                <td></td>
              </tr>
              <tr className="bg-green-50">
                <td className="font-bold">OWNER EQUITY</td>
                <td className="font-mono-data font-bold">$1,072,800</td>
                <td className="font-mono-data font-bold">35.0% LTV</td>
                <td></td>
              </tr>
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