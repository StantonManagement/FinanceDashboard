import { AlertTriangle } from 'lucide-react';

export function OperationsTab() {
  return (
    <div>
      <h3 className="text-lg font-bold uppercase text-institutional-black mb-4">
        Operational Variance Analysis
      </h3>
      
      <div className="overflow-hidden border-2 border-institutional-black">
        <table className="institutional-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Current Month</th>
              <th>Prior Month</th>
              <th>Variance</th>
              <th>Threshold</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Maintenance/Unit</td>
              <td className="font-mono-data">$308.33</td>
              <td className="font-mono-data">$125.00</td>
              <td className="font-mono-data text-red-600">+146.7%</td>
              <td className="font-mono-data">+25%</td>
              <td>
                <span className="alert-indicator">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  REVIEW
                </span>
              </td>
            </tr>
            <tr>
              <td>Utilities/Unit</td>
              <td className="font-mono-data">$70.00</td>
              <td className="font-mono-data">$65.00</td>
              <td className="font-mono-data text-success-green">+7.7%</td>
              <td className="font-mono-data">+15%</td>
              <td>
                <span className="text-success-green font-bold">✓ NORMAL</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}