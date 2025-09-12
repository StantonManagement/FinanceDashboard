import { useState, useEffect } from 'react';
import { DataUtils } from '@shared/utils';
import { LoadingState } from '@/components/ui/loading';
import { getCalculatedFinancials } from '@/utils/portfolio-data-validation';

interface CalculatedFinancialsProps {
  selectedProperty: any;
  formatCurrency: (value: number) => string;
}

export function CalculatedFinancials({ selectedProperty, formatCurrency }: CalculatedFinancialsProps) {
  const [calculatedData, setCalculatedData] = useState<any>(null);
  const [loadingCalculated, setLoadingCalculated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchCalculatedData = async () => {
      if (selectedProperty?.PropertyId) {
        setLoadingCalculated(true);
        setError(null);
        try {
          const data = await getCalculatedFinancials(selectedProperty.PropertyId.toString());
          setCalculatedData(data);
        } catch (error) {
          console.error('Error fetching calculated financials:', error);
          setError(error instanceof Error ? error.message : 'Failed to load calculated financials');
        } finally {
          setLoadingCalculated(false);
        }
      }
    };
    
    fetchCalculatedData();
  }, [selectedProperty?.PropertyId]);
  
  if (loadingCalculated) {
    return (
      <div className="mb-5">
        <LoadingState message="Loading real-time rent roll data..." />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="mb-5">
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <p className="text-sm text-yellow-700">
            Unable to fetch real-time rent roll data: {error}. Using fallback calculations.
          </p>
        </div>
      </div>
    );
  }
  
  if (!calculatedData) {
    return null;
  }
  
  return (
    <div className="mb-5">
      <div className="overflow-hidden border-2 border-blue-500">
        <div className="bg-blue-500 text-white p-2">
          <h4 className="font-bold text-xs uppercase">
            {calculatedData.dataSource === 'rent_roll_api' ? 'Real-Time' : 'Calculated'} Financial Summary - {calculatedData.assetName}
          </h4>
          <p className="text-xs opacity-90">
            Data Source: {calculatedData.dataSource === 'rent_roll_api' ? 'AppFolio Rent Roll API' : calculatedData.dataSource}
          </p>
        </div>
        <table className="institutional-table">
          <tbody>
            <tr className="bg-green-50">
              <td className="font-bold text-right py-2">MONTHLY REVENUE:</td>
              <td className="font-mono-data font-bold text-right text-green-700 py-2">
                {formatCurrency(calculatedData.monthlyRevenue)}
              </td>
            </tr>
            <tr className="bg-green-50">
              <td className="font-bold text-right py-2">ANNUAL REVENUE:</td>
              <td className="font-mono-data font-bold text-right text-green-700 py-2">
                {formatCurrency(calculatedData.annualRevenue)}
              </td>
            </tr>
            <tr className="bg-blue-50">
              <td className="font-bold text-right py-2">ESTIMATED NOI (60% margin):</td>
              <td className="font-mono-data font-bold text-right text-blue-700 py-2">
                {formatCurrency(calculatedData.estimatedNOI || 0)}
              </td>
            </tr>
            <tr className="bg-blue-50">
              <td className="font-bold text-right py-2">ESTIMATED CAP RATE:</td>
              <td className="font-mono-data font-bold text-right text-blue-700 py-2">
                {calculatedData.estimatedCapRate?.toFixed(2)}%
              </td>
            </tr>
            <tr className="bg-gray-50">
              <td className="font-bold text-right py-2">OCCUPIED UNITS:</td>
              <td className="font-mono-data font-bold text-right py-2">
                {calculatedData.occupiedUnits}
              </td>
            </tr>
            <tr className="bg-gray-50">
              <td className="font-bold text-right py-2">AVG RENT PER UNIT:</td>
              <td className="font-mono-data font-bold text-right py-2">
                {formatCurrency(calculatedData.avgRentPerUnit)}
              </td>
            </tr>
            <tr className="bg-gray-50">
              <td className="font-bold text-right py-2">PURCHASE PRICE:</td>
              <td className="font-mono-data font-bold text-right py-2">
                {formatCurrency(calculatedData.purchasePrice)}
              </td>
            </tr>
          </tbody>
        </table>
        <div className={`p-3 border-t ${
          calculatedData.dataSource === 'rent_roll_api' ? 'bg-blue-50' : 'bg-yellow-50'
        }`}>
          <p className={`text-xs ${
            calculatedData.dataSource === 'rent_roll_api' ? 'text-blue-800' : 'text-yellow-800'
          }`}>
            <strong>Note:</strong> {
              calculatedData.dataSource === 'rent_roll_api' 
                ? 'Real-time data from AppFolio rent roll API. NOI estimated using 60% margin.' 
                : 'Estimated values calculated from rent roll data.'
            } {calculatedData.missingFields.length > 0 && `Missing fields: ${calculatedData.missingFields.join(', ')}.`}
            {calculatedData.dataSource !== 'rent_roll_api' && ' For accurate reporting, complete the property data in AppFolio.'}
          </p>
        </div>
      </div>
    </div>
  );
}