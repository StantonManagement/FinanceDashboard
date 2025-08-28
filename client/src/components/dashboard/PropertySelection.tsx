import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Property } from '@shared/schema';

interface PropertySelectionProps {
  properties: any[];
  selectedPropertyId: string;
  onSelectProperty: (propertyId: string) => void;
}

export function PropertySelection({
  properties,
  selectedPropertyId,
  onSelectProperty
}: PropertySelectionProps) {
  if (properties.length <= 1) {
    return null;
  }

  return (
    <Card className="mb-5 border-2 border-institutional-black">
      <CardHeader className="bg-institutional-black text-institutional-white p-3">
        <CardTitle className="font-bold text-xs uppercase">
          Property Selection ({properties.length} properties)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-3">
          {properties.map((property: any) => {
            const propertyKey = property.asset_id;
            const propertyCode = property.asset_id;
            const propertyName = property.asset_id_plus_name;
            
            return (
              <button
                key={propertyKey}
                onClick={() => onSelectProperty(propertyKey)}
                className={`property-item border-r border-institutional-border p-4 text-left hover:bg-institutional-accent transition-all ${
                  selectedPropertyId === propertyKey ? 'active bg-blue-50 border-l-4 border-blue-600' : ''
                }`}
              >
                <div className="text-sm font-bold text-institutional-black mb-1">
                  {propertyCode}
                </div>
                <div className="text-xs text-gray-700 mb-2">
                  {propertyName}
                </div>
                <div className="text-xs text-gray-600">
                  {property.property_type} • {property.units || 0} Units • ${property.noi?.toLocaleString() || '0'} NOI
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}