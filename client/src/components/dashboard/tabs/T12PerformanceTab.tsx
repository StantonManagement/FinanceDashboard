import { Button } from '@/components/ui/button';
import { Flag } from 'lucide-react';

interface T12PerformanceTabProps {
  onFlagIssue: (cellId: string) => void;
}

export function T12PerformanceTab({ onFlagIssue }: T12PerformanceTabProps) {
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
                <td>Monthly Gross Rent</td>
                <td className="font-mono-data">$10,483</td>
                <td className="font-mono-data">$287</td>
                <td><span className="text-success-green font-bold">LOW (2.7%)</span></td>
              </tr>
              <tr>
                <td>Occupancy Rate</td>
                <td className="font-mono-data">92.8%</td>
                <td className="font-mono-data">3.1pp</td>
                <td><span className="text-success-green font-bold">LOW (3.3%)</span></td>
              </tr>
              <tr>
                <td>Other Income</td>
                <td className="font-mono-data">$127</td>
                <td className="font-mono-data">$89</td>
                <td><span className="text-orange-600 font-bold">HIGH (70.1%)</span></td>
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
              <tr>
                <td>Q1 (Winter)</td>
                <td className="font-mono-data">$6,425</td>
                <td className="font-mono-data text-red-600">-6.3%</td>
                <td><span className="text-orange-600 font-bold">HEATING COSTS</span></td>
              </tr>
              <tr>
                <td>Q2 (Spring)</td>
                <td className="font-mono-data">$6,890</td>
                <td className="font-mono-data text-success-green">+0.5%</td>
                <td><span className="text-success-green font-bold">NORMAL</span></td>
              </tr>
              <tr>
                <td>Q3 (Summer)</td>
                <td className="font-mono-data">$7,240</td>
                <td className="font-mono-data text-success-green">+5.6%</td>
                <td><span className="text-success-green font-bold">PEAK SEASON</span></td>
              </tr>
              <tr>
                <td>Q4 (Fall)</td>
                <td className="font-mono-data">$6,980</td>
                <td className="font-mono-data text-success-green">+1.8%</td>
                <td><span className="text-success-green font-bold">STABLE</span></td>
              </tr>
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
              <td>Risk-Adjusted Returns</td>
              <td>Sharpe Ratio (NOI)</td>
              <td className="font-mono-data font-bold">1.87</td>
              <td className="font-mono-data text-success-green">82nd</td>
              <td><span className="text-success-green font-bold">LOW</span></td>
              <td>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[8px] font-bold px-1.5 py-0 h-5"
                >
                  MONITOR
                </Button>
              </td>
            </tr>
            <tr>
              <td>Concentration Risk</td>
              <td>Single Tenant Max %</td>
              <td className="font-mono-data font-bold">16.7%</td>
              <td className="font-mono-data text-success-green">45th</td>
              <td><span className="text-success-green font-bold">LOW</span></td>
              <td>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[8px] font-bold px-1.5 py-0 h-5"
                >
                  MONITOR
                </Button>
              </td>
            </tr>
            <tr>
              <td>Predictive Forecasting</td>
              <td>12M NOI Forecast</td>
              <td className="font-mono-data font-bold text-success-green">$85,200</td>
              <td className="font-mono-data">N/A</td>
              <td><span className="text-success-green font-bold">POSITIVE TREND</span></td>
              <td>
                <Button
                  onClick={() => onFlagIssue('forecast-noi')}
                  variant="destructive"
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white text-[8px] font-bold px-1.5 py-0 h-5"
                >
                  <Flag className="w-2 h-2 mr-0.5" />
                  TRACK
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