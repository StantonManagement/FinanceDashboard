import { Button } from '@/components/ui/button';
import { Upload, Download, FileText, RefreshCw, MessageSquare, Wrench } from 'lucide-react';
import { Link } from 'wouter';

interface DashboardHeaderProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLenderPackageExport: () => void;
  onExcelExport: () => void;
  onRefreshData: () => void;
}

export function DashboardHeader({
  onFileUpload,
  onLenderPackageExport,
  onExcelExport,
  onRefreshData
}: DashboardHeaderProps) {
  return (
    <div className="bg-institutional-accent border-b-2 border-institutional-black py-4">
      <div className="max-w-7xl mx-auto px-5 flex justify-between items-center">
        <div>
          <div className="text-xl font-bold text-institutional-black uppercase tracking-wide">
            Stanton Management LLC
          </div>
          <div className="text-xs text-gray-700 uppercase mt-1">
            Financial Analysis & Reporting Dashboard
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative">
            <input 
              type="file" 
              id="excelUpload" 
              accept=".xlsx,.xls" 
              className="hidden" 
              onChange={onFileUpload}
            />
            <Button
              onClick={() => document.getElementById('excelUpload')?.click()}
              className="btn-secondary"
              size="sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              UPLOAD EXCEL
            </Button>
          </div>
          <Button onClick={onLenderPackageExport} className="btn-institutional" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            LENDER PACKAGE
          </Button>
          <Button onClick={onExcelExport} className="btn-secondary" size="sm">
            <Download className="w-4 h-4 mr-2" />
            EXPORT EXCEL
          </Button>
          <Button onClick={onRefreshData} className="btn-secondary" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            REFRESH DATA
          </Button>
          <Link href="/accounting-notes">
            <Button className="btn-institutional" size="sm">
              <MessageSquare className="w-4 h-4 mr-2" />
              ACCOUNTING NOTES
            </Button>
          </Link>
          <Link href="/property-management-notes">
            <Button className="btn-secondary" size="sm">
              <Wrench className="w-4 h-4 mr-2" />
              PM DASHBOARD
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}