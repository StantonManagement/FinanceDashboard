import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Download, FileText, RefreshCw, Flag, AlertTriangle, MessageSquare, Wrench, Settings, Eye, EyeOff } from 'lucide-react';
import { Link } from 'wouter';
import type { Portfolio, Property, GLAccount, Note, ActionItem } from '@shared/schema';
import { ExportUtils } from '@/lib/export-utils';
import { ExcelProcessor } from '@/lib/excel-processor';
import { downloadExcelTemplate } from '@/lib/excel-template-generator';
import ClickableCell from './clickable-cell';

interface PropertyDashboardProps {}

export function PropertyDashboard({}: PropertyDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedPortfolio, setSelectedPortfolio] = useState('hartford1');
  const [activeTab, setActiveTab] = useState('performance');
  const [clickedElements, setClickedElements] = useState<Set<string>>(new Set());
  const [cellNotes, setCellNotes] = useState<Record<string, string>>({});
  
  // Column visibility states for different tables
  const [visibleColumns, setVisibleColumns] = useState({
    balanceSheet: {
      account: true,
      balance: true,
      percentage: true,
      notes: true,
      actions: true
    },
    performance: {
      metric: true,
      current: true,
      budget: true,
      variance: true,
      ytd: true,
      notes: true,
      actions: true
    },
    cashFlow: {
      account: true,
      amount: true,
      percentage: true,
      notes: true,
      actions: true
    },
    marketValuation: {
      scenario: true,
      capRate: true,
      impliedValue: true,
      variance: true,
      notes: true
    }
  });

  // Queries
  const { data: portfolios = [] } = useQuery({
    queryKey: ['/api/portfolios'],
  });

  const { data: currentPortfolio } = useQuery({
    queryKey: ['/api/portfolios', selectedPortfolio],
    enabled: !!selectedPortfolio,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['/api/properties'],
    queryFn: async () => {
      if (!currentPortfolio?.id) return [];
      const response = await fetch(`/api/properties?portfolioId=${currentPortfolio.id}`);
      if (!response.ok) throw new Error('Failed to fetch properties');
      return response.json();
    },
    enabled: !!currentPortfolio?.id,
  });

  const hartfordProperty = properties.find((p: Property) => p.code === 'S0010');

  const { data: glAccounts = [] } = useQuery({
    queryKey: ['/api/properties', hartfordProperty?.id, 'gl-accounts'],
    enabled: !!hartfordProperty?.id,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['/api/properties', hartfordProperty?.id, 'notes'],
    enabled: !!hartfordProperty?.id,
  });

  const { data: actionItems = [] } = useQuery({
    queryKey: ['/api/action-items'],
    queryFn: async () => {
      const response = await fetch(`/api/action-items${hartfordProperty?.id ? `?propertyId=${hartfordProperty.id}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch action items');
      return response.json();
    },
    enabled: !!hartfordProperty?.id,
  });

  // Cell comments query
  const { data: cellComments = [], refetch: refetchComments } = useQuery({
    queryKey: ['/api/cell-comments'],
    queryFn: async () => {
      const response = await fetch(`/api/cell-comments${hartfordProperty?.id ? `?propertyId=${hartfordProperty.id}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch cell comments');
      return response.json();
    },
    enabled: !!hartfordProperty?.id,
  });

  // Helper function to get comments for a specific cell
  const getCellComments = (cellReference: string) => {
    return cellComments.filter((comment: any) => comment.cellReference === cellReference);
  };

  // Handle comment creation
  const handleCommentAdded = () => {
    refetchComments();
  };

  // Mutations
  const createNoteMutation = useMutation({
    mutationFn: async (noteData: { cellId: string; propertyId: string; text: string }) => {
      return apiRequest('POST', '/api/notes', noteData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', hartfordProperty?.id, 'notes'] });
      toast({ title: 'Note added successfully', variant: 'default' });
    },
    onError: () => {
      toast({ title: 'Failed to add note', variant: 'destructive' });
    },
  });

  const createActionItemMutation = useMutation({
    mutationFn: async (actionData: { itemId: string; propertyId: string; description: string; priority: string }) => {
      return apiRequest('POST', '/api/action-items', actionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/action-items'] });
      toast({ title: 'Action item created successfully', variant: 'default' });
    },
    onError: () => {
      toast({ title: 'Failed to create action item', variant: 'destructive' });
    },
  });

  // Click highlighting function
  const handleClick = (elementId: string) => {
    setClickedElements(prev => new Set([...prev, elementId]));
    setTimeout(() => {
      setClickedElements(prev => {
        const newSet = new Set(prev);
        newSet.delete(elementId);
        return newSet;
      });
    }, 5000);
  };

  // Portfolio selection
  const selectPortfolio = (portfolioKey: string) => {
    setSelectedPortfolio(portfolioKey);
    handleClick(`portfolio-${portfolioKey}`);
  };

  // Note handling
  const handleNoteChange = (cellId: string, value: string) => {
    setCellNotes(prev => ({ ...prev, [cellId]: value }));
    
    if (value.trim() && hartfordProperty?.id) {
      createNoteMutation.mutate({
        cellId,
        propertyId: hartfordProperty.id,
        text: value.trim()
      });
    }
  };

  // Flag issue
  const flagIssue = (cellId: string) => {
    if (!hartfordProperty?.id) return;
    
    const description = `Review flagged item for GL account ${cellId.replace('gl-', '')}`;
    const itemId = `AI-${Date.now()}`;
    
    createActionItemMutation.mutate({
      itemId,
      propertyId: hartfordProperty.id,
      description,
      priority: 'HIGH'
    });
  };

  // File upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('excel', file);

    try {
      const response = await fetch('/api/excel/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      // Process the file on the frontend
      const buffer = Uint8Array.from(atob(result.fileBuffer), c => c.charCodeAt(0)).buffer;
      const processor = new ExcelProcessor();
      const processedData = await processor.processFile(buffer);
      
      console.log('Processed Excel data:', processedData);
      toast({ title: `Excel file processed: ${result.filename}`, variant: 'default' });
      
      // Refresh data
      queryClient.invalidateQueries();
      
    } catch (error) {
      toast({ title: 'Failed to upload Excel file', variant: 'destructive' });
    }
  };

  // Export functions
  const handleLenderPackageExport = async () => {
    try {
      await ExportUtils.exportLenderPackage(selectedPortfolio);
      toast({ title: 'Lender package exported successfully', variant: 'default' });
    } catch (error) {
      toast({ title: 'Failed to export lender package', variant: 'destructive' });
    }
  };

  const handleExcelExport = async () => {
    try {
      await ExportUtils.exportToExcel(selectedPortfolio);
      toast({ title: 'Excel export completed successfully', variant: 'default' });
    } catch (error) {
      toast({ title: 'Failed to export Excel file', variant: 'destructive' });
    }
  };

  const refreshData = () => {
    queryClient.invalidateQueries();
    toast({ title: 'Data refreshed', variant: 'default' });
  };

  // Column visibility toggle functions
  const toggleColumn = (tableType: string, column: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [tableType]: {
        ...prev[tableType as keyof typeof prev],
        [column]: !prev[tableType as keyof typeof prev][column as keyof typeof prev.balanceSheet]
      }
    }));
  };

  // Column visibility controls component
  const ColumnVisibilityControls = ({ tableType, columns }: { 
    tableType: string, 
    columns: Array<{ key: string, label: string }> 
  }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="bg-white border-gray-300">
          <Settings className="w-4 h-4 mr-2" />
          COLUMNS
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4">
        <h4 className="font-bold text-sm mb-3 uppercase">Show/Hide Columns</h4>
        <div className="space-y-3">
          {columns.map(({ key, label }) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={`${tableType}-${key}`}
                checked={visibleColumns[tableType as keyof typeof visibleColumns]?.[key as keyof typeof visibleColumns.balanceSheet] || false}
                onCheckedChange={() => toggleColumn(tableType, key)}
              />
              <label
                htmlFor={`${tableType}-${key}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
              </label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="font-segoe bg-institutional-white min-h-screen">
      {/* Header */}
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
          <div className="flex gap-3">
            <div className="relative">
              <input 
                type="file" 
                id="excelUpload" 
                accept=".xlsx,.xls" 
                className="hidden" 
                onChange={handleFileUpload}
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
            <Button onClick={handleLenderPackageExport} className="btn-institutional" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              LENDER PACKAGE
            </Button>
            <Button onClick={handleExcelExport} className="btn-secondary" size="sm">
              <Download className="w-4 h-4 mr-2" />
              EXPORT EXCEL
            </Button>
            <Button onClick={refreshData} className="btn-secondary" size="sm">
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

      <div className="max-w-7xl mx-auto p-5">
        {/* Portfolio Navigation */}
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
                  onClick={() => selectPortfolio(portfolio.key)}
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
                    <span>{portfolio.capRate}% Cap</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hartford 1 KPI Section */}
        {selectedPortfolio === 'hartford1' && hartfordProperty && (
          <Card className="bg-institutional-accent border-2 border-institutional-black mb-5">
            <CardContent className="p-5">
              <div className="text-sm font-bold uppercase text-institutional-black mb-4">
                Hartford 1 Portfolio Metrics - S0010: {hartfordProperty.name}
              </div>
              <div className="grid grid-cols-6 gap-1 bg-institutional-border">
                <div 
                  onClick={() => handleClick('kpi-noi')} 
                  className={`kpi-card bg-institutional-white p-4 text-center cursor-pointer hover:bg-institutional-accent transition-all ${
                    clickedElements.has('kpi-noi') ? 'click-highlight' : ''
                  }`}
                >
                  <div className="text-xs uppercase text-gray-600 mb-2 font-bold">Monthly NOI</div>
                  <div className="text-2xl font-bold text-institutional-black font-mono-data mb-1">
                    ${hartfordProperty.monthlyNOI?.toLocaleString()}
                  </div>
                  <div className="text-xs font-bold text-success-green">+8.2% MoM</div>
                </div>
                
                <div 
                  onClick={() => handleClick('kpi-margin')} 
                  className={`kpi-card bg-institutional-white p-4 text-center cursor-pointer hover:bg-institutional-accent transition-all ${
                    clickedElements.has('kpi-margin') ? 'click-highlight' : ''
                  }`}
                >
                  <div className="text-xs uppercase text-gray-600 mb-2 font-bold">NOI Margin</div>
                  <div className="text-2xl font-bold text-institutional-black font-mono-data mb-1">
                    {hartfordProperty.noiMargin}%
                  </div>
                  <div className="text-xs font-bold text-success-green">+2.1pp YoY</div>
                </div>
                
                <div 
                  onClick={() => handleClick('kpi-occupancy')} 
                  className={`kpi-card bg-institutional-white p-4 text-center cursor-pointer hover:bg-institutional-accent transition-all ${
                    clickedElements.has('kpi-occupancy') ? 'click-highlight' : ''
                  }`}
                >
                  <div className="text-xs uppercase text-gray-600 mb-2 font-bold">Occupancy</div>
                  <div className="text-2xl font-bold text-institutional-black font-mono-data mb-1">
                    {hartfordProperty.occupancy}%
                  </div>
                  <div className="text-xs font-bold text-success-green">+1.2pp MoM</div>
                </div>
                
                <div 
                  onClick={() => handleClick('kpi-revenue')} 
                  className={`kpi-card bg-institutional-white p-4 text-center cursor-pointer hover:bg-institutional-accent transition-all ${
                    clickedElements.has('kpi-revenue') ? 'click-highlight' : ''
                  }`}
                >
                  <div className="text-xs uppercase text-gray-600 mb-2 font-bold">Revenue/Unit</div>
                  <div className="text-2xl font-bold text-institutional-black font-mono-data mb-1">
                    ${hartfordProperty.revenuePerUnit}
                  </div>
                  <div className="text-xs font-bold text-success-green">+3.8% MoM</div>
                </div>
                
                <div 
                  onClick={() => handleClick('kpi-cap')} 
                  className={`kpi-card bg-institutional-white p-4 text-center cursor-pointer hover:bg-institutional-accent transition-all ${
                    clickedElements.has('kpi-cap') ? 'click-highlight' : ''
                  }`}
                >
                  <div className="text-xs uppercase text-gray-600 mb-2 font-bold">Cap Rate</div>
                  <div className="text-2xl font-bold text-institutional-black font-mono-data mb-1">
                    {hartfordProperty.capRate}%
                  </div>
                  <div className="text-xs font-bold text-success-green">Above Market</div>
                </div>
                
                <div 
                  onClick={() => handleClick('kpi-dscr')} 
                  className={`kpi-card bg-institutional-white p-4 text-center cursor-pointer hover:bg-institutional-accent transition-all ${
                    clickedElements.has('kpi-dscr') ? 'click-highlight' : ''
                  }`}
                >
                  <div className="text-xs uppercase text-gray-600 mb-2 font-bold">DSCR</div>
                  <div className="text-2xl font-bold text-institutional-black font-mono-data mb-1">
                    {hartfordProperty.dscr}x
                  </div>
                  <div className="text-xs font-bold text-success-green">Strong</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab Navigation */}
        <Card className="border-2 border-institutional-black mb-5">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex bg-institutional-accent border-b border-institutional-border w-full h-auto p-0 rounded-none">
              <TabsTrigger 
                value="performance" 
                className="flex-1 bg-institutional-black text-institutional-white border-r border-institutional-border p-4 font-bold text-xs uppercase data-[state=active]:bg-institutional-black data-[state=active]:text-institutional-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-700"
                onClick={() => handleClick('tab-performance')}
              >
                Performance Analysis
              </TabsTrigger>
              <TabsTrigger 
                value="operations" 
                className="flex-1 bg-transparent text-gray-700 border-r border-institutional-border p-4 font-bold text-xs uppercase hover:bg-institutional-accent data-[state=active]:bg-institutional-black data-[state=active]:text-institutional-white"
                onClick={() => handleClick('tab-operations')}
              >
                Operational Review
              </TabsTrigger>
              <TabsTrigger 
                value="cashflow" 
                className="flex-1 bg-transparent text-gray-700 border-r border-institutional-border p-4 font-bold text-xs uppercase hover:bg-institutional-accent data-[state=active]:bg-institutional-black data-[state=active]:text-institutional-white"
                onClick={() => handleClick('tab-cashflow')}
              >
                Cash Flow Detail
              </TabsTrigger>
              <TabsTrigger 
                value="balance" 
                className="flex-1 bg-transparent text-gray-700 border-r border-institutional-border p-4 font-bold text-xs uppercase hover:bg-institutional-accent data-[state=active]:bg-institutional-black data-[state=active]:text-institutional-white"
                onClick={() => handleClick('tab-balance')}
              >
                Balance Sheet
              </TabsTrigger>
              <TabsTrigger 
                value="t12" 
                className="flex-1 bg-transparent text-gray-700 border-r border-institutional-border p-4 font-bold text-xs uppercase hover:bg-institutional-accent data-[state=active]:bg-institutional-black data-[state=active]:text-institutional-white"
                onClick={() => handleClick('tab-t12')}
              >
                T12 Performance
              </TabsTrigger>

              <TabsTrigger 
                value="notes" 
                className="flex-1 bg-transparent text-gray-700 p-4 font-bold text-xs uppercase hover:bg-institutional-accent data-[state=active]:bg-institutional-black data-[state=active]:text-institutional-white"
                onClick={() => handleClick('tab-notes')}
              >
                Notes & Actions
              </TabsTrigger>
            </TabsList>

            <div className="p-5">
              {/* Performance Analysis Tab */}
              <TabsContent value="performance" className="mt-0">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold uppercase text-institutional-black">
                    Hartford 1 - GL Account Detail
                  </h3>
                  <ColumnVisibilityControls 
                    tableType="performance"
                    columns={[
                      { key: 'account', label: 'GL Account' },
                      { key: 'current', label: 'Current Period' },
                      { key: 'budget', label: 'Budget' },
                      { key: 'variance', label: 'Variance' },
                      { key: 'ytd', label: 'YTD' },
                      { key: 'notes', label: 'Notes' },
                      { key: 'actions', label: 'Actions' }
                    ]}
                  />
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
                      {glAccounts.map((account: GLAccount) => {
                        const cellId = `gl-${account.code}`;
                        const hasNote = notes.find((note: Note) => note.cellId === cellId);
                        const isHighMaintenance = account.code === '6110';
                        
                        return (
                          <tr key={account.id}>
                            <td 
                              onClick={() => handleClick(cellId)} 
                              className={`font-mono-data font-semibold cursor-pointer ${
                                clickedElements.has(cellId) ? 'click-highlight' : ''
                              }`}
                            >
                              {account.code}
                            </td>
                            <td 
                              onClick={() => handleClick(`desc-${account.code}`)} 
                              className={`cursor-pointer ${
                                clickedElements.has(`desc-${account.code}`) ? 'click-highlight' : ''
                              }`}
                            >
                              {account.description}
                            </td>
                            <td 
                              onClick={() => handleClick(`amt-${account.code}`)} 
                              className={`font-mono-data font-semibold cursor-pointer ${
                                account.type === 'revenue' ? 'text-success-green' : 'text-red-600'
                              } ${clickedElements.has(`amt-${account.code}`) ? 'click-highlight' : ''}`}
                            >
                              {account.type === 'revenue' ? '+' : '-'}${account.amount.toLocaleString()}
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
                                type="text" 
                                placeholder="Add note..." 
                                className="text-xs border-institutional-border h-6 px-2" 
                                value={cellNotes[cellId] || ''}
                                onChange={(e) => handleNoteChange(cellId, e.target.value)}
                              />
                              {hasNote && (
                                <span className="note-indicator">📝 NOTE</span>
                              )}
                              {isHighMaintenance && (
                                <span className="alert-indicator">
                                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                                  WATCH
                                </span>
                              )}
                            </td>
                            <td className="text-center">
                              <Button 
                                onClick={() => flagIssue(cellId)} 
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
                      })}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* Operational Review Tab */}
              <TabsContent value="operations" className="mt-0">
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
              </TabsContent>

              {/* Cash Flow Detail Tab */}
              <TabsContent value="cashflow" className="mt-0">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold uppercase text-institutional-black">
                    Hartford 1 - Detailed Cash Flow by GL Account
                  </h3>
                  <ColumnVisibilityControls 
                    tableType="cashFlow"
                    columns={[
                      { key: 'account', label: 'GL Account' },
                      { key: 'amount', label: 'Amount & Type' },
                      { key: 'notes', label: 'Notes' },
                      { key: 'actions', label: 'Actions' }
                    ]}
                  />
                </div>
                
                <div className="overflow-hidden border-2 border-institutional-black">
                  <table className="institutional-table">
                    <thead>
                      <tr>
                        {visibleColumns.cashFlow.account && <th>GL Code</th>}
                        {visibleColumns.cashFlow.account && <th>Account Description</th>}
                        {visibleColumns.cashFlow.amount && <th>Amount</th>}
                        {visibleColumns.cashFlow.amount && <th>Type</th>}
                        {visibleColumns.cashFlow.notes && <th>Notes</th>}
                        {visibleColumns.cashFlow.actions && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {glAccounts
                        .filter((account: GLAccount) => account.amount !== 0)
                        .sort((a: GLAccount, b: GLAccount) => {
                          // Sort by type (revenue first) then by GL code
                          if (a.type !== b.type) {
                            return a.type === 'revenue' ? -1 : 1;
                          }
                          return a.code.localeCompare(b.code);
                        })
                        .map((account: GLAccount) => {
                          const cellId = `cashflow-gl-${account.code}`;
                          const hasNote = notes.some((note: Note) => note.cellId === cellId);
                          
                          return (
                            <tr key={account.id}>
                              {visibleColumns.cashFlow.account && (
                                <td 
                                  onClick={() => handleClick(`${cellId}-code`)}
                                  className={`font-mono-data font-bold text-center cursor-pointer transition-all ${
                                    clickedElements.has(`${cellId}-code`) ? 'click-highlight' : ''
                                  }`}
                                >
                                  {account.code}
                                </td>
                              )}
                              {visibleColumns.cashFlow.account && (
                                <td 
                                  onClick={() => handleClick(`${cellId}-desc`)}
                                  className={`cursor-pointer transition-all ${
                                    clickedElements.has(`${cellId}-desc`) ? 'click-highlight' : ''
                                  }`}
                                >
                                  {account.description}
                                </td>
                              )}
                              {visibleColumns.cashFlow.amount && (
                                <td 
                                  onClick={() => handleClick(cellId)}
                                  className={`font-mono-data font-bold text-right cursor-pointer transition-all ${
                                    account.type === 'revenue' ? 'text-success-green' : 'text-red-600'
                                  } ${clickedElements.has(cellId) ? 'click-highlight' : ''}`}
                                >
                                  {account.type === 'revenue' ? '+' : '-'}${Math.abs(account.amount).toLocaleString()}
                                  {hasNote && (
                                    <span className="note-indicator ml-2">📝 NOTE</span>
                                  )}
                                </td>
                              )}
                              {visibleColumns.cashFlow.amount && (
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
                              )}
                              {visibleColumns.cashFlow.notes && (
                                <td className="text-center">
                                  <Input
                                    placeholder="Add note..."
                                    className="text-xs border-institutional-border h-6 px-2"
                                    onBlur={(e) => {
                                      if (e.target.value.trim()) {
                                        handleNoteChange(cellId, e.target.value);
                                        e.target.value = '';
                                      }
                                    }}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        const input = e.target as HTMLInputElement;
                                        if (input.value.trim()) {
                                          handleNoteChange(cellId, input.value);
                                          input.value = '';
                                        }
                                      }
                                    }}
                                  />
                                </td>
                              )}
                              {visibleColumns.cashFlow.actions && (
                                <td className="text-center">
                                  <Button
                                    onClick={() => flagIssue(cellId)}
                                    variant="destructive"
                                    size="sm"
                                    className="bg-orange-500 hover:bg-orange-600 text-white text-[8px] font-bold px-1.5 py-0 h-5"
                                  >
                                    <Flag className="w-2 h-2 mr-0.5" />
                                    FLAG
                                  </Button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      
                      {/* Summary rows */}
                      <tr className="bg-green-50 border-t-2 border-institutional-black">
                        <td colSpan={2} className="font-bold text-right">TOTAL REVENUE:</td>
                        <td className="font-mono-data font-bold text-success-green text-right">
                          +${glAccounts
                            .filter((acc: GLAccount) => acc.type === 'revenue')
                            .reduce((sum: number, acc: GLAccount) => sum + acc.amount, 0)
                            .toLocaleString()}
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                      
                      <tr className="bg-red-50">
                        <td colSpan={2} className="font-bold text-right">TOTAL EXPENSES:</td>
                        <td className="font-mono-data font-bold text-red-600 text-right">
                          -${glAccounts
                            .filter((acc: GLAccount) => acc.type === 'expense')
                            .reduce((sum: number, acc: GLAccount) => sum + acc.amount, 0)
                            .toLocaleString()}
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                      
                      <tr className="bg-blue-50 border-t-2 border-institutional-black">
                        <td colSpan={2} className="font-bold text-right">NET OPERATING INCOME:</td>
                        <td className="font-mono-data font-bold text-institutional-black text-right">
                          ${(
                            glAccounts
                              .filter((acc: GLAccount) => acc.type === 'revenue')
                              .reduce((sum: number, acc: GLAccount) => sum + acc.amount, 0) -
                            glAccounts
                              .filter((acc: GLAccount) => acc.type === 'expense')
                              .reduce((sum: number, acc: GLAccount) => sum + acc.amount, 0)
                          ).toLocaleString()}
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Detailed Line Item Breakdown */}
                <div className="mt-5 overflow-hidden border-2 border-institutional-black">
                  <div className="bg-institutional-black text-institutional-white p-2">
                    <h4 className="font-bold text-xs uppercase">Every Non-Zero Line Item Detail</h4>
                  </div>
                  <table className="institutional-table">
                    <thead>
                      <tr>
                        <th>GL Code</th>
                        <th>Description</th>
                        <th>Current</th>
                        <th>Prior Month</th>
                        <th>Variance $</th>
                        <th>Variance %</th>
                        <th>YTD</th>
                        <th>Budget vs Actual</th>
                        <th>Per Unit</th>
                        <th>Risk Flag</th>
                        <th>Notes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-mono-data font-bold text-center">4105</td>
                        <td>Rental Income - Gross</td>
                        <td className="font-mono-data font-bold text-success-green">+$10,200</td>
                        <td className="font-mono-data">+$9,950</td>
                        <td className="font-mono-data text-success-green">+$250</td>
                        <td className="font-mono-data text-success-green">+2.5%</td>
                        <td className="font-mono-data font-bold">$121,800</td>
                        <td className="font-mono-data text-success-green">+3.2% vs Budget</td>
                        <td className="font-mono-data">$1,700</td>
                        <td><span className="text-success-green font-bold">✓ NORMAL</span></td>
                        <td>
                          <Input
                            placeholder="Add note..."
                            className="text-xs border-institutional-border h-6 px-2"
                          />
                        </td>
                        <td className="text-center">
                          <Button
                            onClick={() => flagIssue('gl-4105')}
                            variant="destructive"
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600 text-white text-[8px] font-bold px-1.5 py-0 h-5"
                          >
                            <Flag className="w-2 h-2 mr-0.5" />
                            FLAG
                          </Button>
                        </td>
                      </tr>
                      <tr>
                        <td className="font-mono-data font-bold text-center">4110</td>
                        <td>Section 8 Housing Assistance</td>
                        <td className="font-mono-data font-bold text-success-green">+$300</td>
                        <td className="font-mono-data">+$300</td>
                        <td className="font-mono-data">$0</td>
                        <td className="font-mono-data">0.0%</td>
                        <td className="font-mono-data font-bold">$3,600</td>
                        <td className="font-mono-data text-success-green">On Budget</td>
                        <td className="font-mono-data">$50</td>
                        <td><span className="text-success-green font-bold">✓ STABLE</span></td>
                        <td>
                          <Input
                            placeholder="Add note..."
                            className="text-xs border-institutional-border h-6 px-2"
                          />
                        </td>
                        <td className="text-center">
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
                        <td className="font-mono-data font-bold text-center">4120</td>
                        <td>Late Fees & Other Income</td>
                        <td className="font-mono-data font-bold text-success-green">+$85</td>
                        <td className="font-mono-data">+$45</td>
                        <td className="font-mono-data text-orange-600">+$40</td>
                        <td className="font-mono-data text-orange-600">+88.9%</td>
                        <td className="font-mono-data font-bold">$720</td>
                        <td className="font-mono-data text-orange-600">+45% vs Budget</td>
                        <td className="font-mono-data">$14</td>
                        <td><span className="text-orange-600 font-bold">⚠ WATCH</span></td>
                        <td>
                          <Input
                            placeholder="Add note..."
                            className="text-xs border-institutional-border h-6 px-2"
                          />
                        </td>
                        <td className="text-center">
                          <Button
                            onClick={() => flagIssue('gl-4120')}
                            variant="destructive"
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600 text-white text-[8px] font-bold px-1.5 py-0 h-5"
                          >
                            <Flag className="w-2 h-2 mr-0.5" />
                            REVIEW
                          </Button>
                        </td>
                      </tr>
                      <tr>
                        <td className="font-mono-data font-bold text-center">6105</td>
                        <td>Property Management Fees</td>
                        <td className="font-mono-data font-bold text-red-600">-$630</td>
                        <td className="font-mono-data">-$598</td>
                        <td className="font-mono-data text-red-600">-$32</td>
                        <td className="font-mono-data text-red-600">-5.3%</td>
                        <td className="font-mono-data font-bold">-$7,320</td>
                        <td className="font-mono-data text-success-green">-2.1% vs Budget</td>
                        <td className="font-mono-data">-$105</td>
                        <td><span className="text-success-green font-bold">✓ NORMAL</span></td>
                        <td>
                          <Input
                            placeholder="Add note..."
                            className="text-xs border-institutional-border h-6 px-2"
                          />
                        </td>
                        <td className="text-center">
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
                        <td className="font-mono-data font-bold text-center">6110</td>
                        <td>Maintenance & Repairs</td>
                        <td className="font-mono-data font-bold text-red-600">-$1,850</td>
                        <td className="font-mono-data">-$750</td>
                        <td className="font-mono-data text-red-600">-$1,100</td>
                        <td className="font-mono-data text-red-600">-146.7%</td>
                        <td className="font-mono-data font-bold">-$14,200</td>
                        <td className="font-mono-data text-red-600">+67% vs Budget</td>
                        <td className="font-mono-data">-$308</td>
                        <td><span className="text-red-600 font-bold">🚨 CRITICAL</span></td>
                        <td>
                          <Input
                            placeholder="HVAC repairs, plumbing..."
                            className="text-xs border-institutional-border h-6 px-2"
                          />
                        </td>
                        <td className="text-center">
                          <Button
                            onClick={() => flagIssue('gl-6110')}
                            variant="destructive"
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white text-[8px] font-bold px-1.5 py-0 h-5"
                          >
                            <Flag className="w-2 h-2 mr-0.5" />
                            URGENT
                          </Button>
                        </td>
                      </tr>
                      <tr>
                        <td className="font-mono-data font-bold text-center">6115</td>
                        <td>Landscaping & Grounds</td>
                        <td className="font-mono-data font-bold text-red-600">-$285</td>
                        <td className="font-mono-data">-$200</td>
                        <td className="font-mono-data text-red-600">-$85</td>
                        <td className="font-mono-data text-red-600">-42.5%</td>
                        <td className="font-mono-data font-bold">-$2,850</td>
                        <td className="font-mono-data text-orange-600">+15% vs Budget</td>
                        <td className="font-mono-data">-$48</td>
                        <td><span className="text-orange-600 font-bold">⚠ SEASONAL</span></td>
                        <td>
                          <Input
                            placeholder="Winter prep work..."
                            className="text-xs border-institutional-border h-6 px-2"
                          />
                        </td>
                        <td className="text-center">
                          <Button
                            onClick={() => flagIssue('gl-6115')}
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
                        <td className="font-mono-data font-bold text-center">6120</td>
                        <td>Utilities - Common Areas</td>
                        <td className="font-mono-data font-bold text-red-600">-$420</td>
                        <td className="font-mono-data">-$390</td>
                        <td className="font-mono-data text-red-600">-$30</td>
                        <td className="font-mono-data text-red-600">-7.7%</td>
                        <td className="font-mono-data font-bold">-$4,680</td>
                        <td className="font-mono-data text-success-green">-5% vs Budget</td>
                        <td className="font-mono-data">-$70</td>
                        <td><span className="text-success-green font-bold">✓ NORMAL</span></td>
                        <td>
                          <Input
                            placeholder="Add note..."
                            className="text-xs border-institutional-border h-6 px-2"
                          />
                        </td>
                        <td className="text-center">
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
                        <td className="font-mono-data font-bold text-center">6140</td>
                        <td>Real Estate Taxes</td>
                        <td className="font-mono-data font-bold text-red-600">-$815</td>
                        <td className="font-mono-data">-$815</td>
                        <td className="font-mono-data">$0</td>
                        <td className="font-mono-data">0.0%</td>
                        <td className="font-mono-data font-bold">-$9,780</td>
                        <td className="font-mono-data text-success-green">On Budget</td>
                        <td className="font-mono-data">-$136</td>
                        <td><span className="text-success-green font-bold">✓ STABLE</span></td>
                        <td>
                          <Input
                            placeholder="Add note..."
                            className="text-xs border-institutional-border h-6 px-2"
                          />
                        </td>
                        <td className="text-center">
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
                        <td className="font-mono-data font-bold text-center">6130</td>
                        <td>Property Insurance</td>
                        <td className="font-mono-data font-bold text-red-600">-$285</td>
                        <td className="font-mono-data">-$285</td>
                        <td className="font-mono-data">$0</td>
                        <td className="font-mono-data">0.0%</td>
                        <td className="font-mono-data font-bold">-$3,420</td>
                        <td className="font-mono-data text-success-green">On Budget</td>
                        <td className="font-mono-data">-$48</td>
                        <td><span className="text-success-green font-bold">✓ STABLE</span></td>
                        <td>
                          <Input
                            placeholder="Add note..."
                            className="text-xs border-institutional-border h-6 px-2"
                          />
                        </td>
                        <td className="text-center">
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
                        <td className="font-mono-data font-bold text-center">6145</td>
                        <td>Legal & Professional</td>
                        <td className="font-mono-data font-bold text-red-600">-$125</td>
                        <td className="font-mono-data">-$0</td>
                        <td className="font-mono-data text-red-600">-$125</td>
                        <td className="font-mono-data text-red-600">New Expense</td>
                        <td className="font-mono-data font-bold">-$450</td>
                        <td className="font-mono-data text-red-600">+200% vs Budget</td>
                        <td className="font-mono-data">-$21</td>
                        <td><span className="text-orange-600 font-bold">⚠ NEW</span></td>
                        <td>
                          <Input
                            placeholder="Eviction proceedings..."
                            className="text-xs border-institutional-border h-6 px-2"
                          />
                        </td>
                        <td className="text-center">
                          <Button
                            onClick={() => flagIssue('gl-6145')}
                            variant="destructive"
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600 text-white text-[8px] font-bold px-1.5 py-0 h-5"
                          >
                            <Flag className="w-2 h-2 mr-0.5" />
                            REVIEW
                          </Button>
                        </td>
                      </tr>
                      <tr>
                        <td className="font-mono-data font-bold text-center">6150</td>
                        <td>Marketing & Leasing</td>
                        <td className="font-mono-data font-bold text-red-600">-$45</td>
                        <td className="font-mono-data">-$85</td>
                        <td className="font-mono-data text-success-green">+$40</td>
                        <td className="font-mono-data text-success-green">+47.1%</td>
                        <td className="font-mono-data font-bold">-$720</td>
                        <td className="font-mono-data text-success-green">-15% vs Budget</td>
                        <td className="font-mono-data">-$8</td>
                        <td><span className="text-success-green font-bold">✓ LOW</span></td>
                        <td>
                          <Input
                            placeholder="Add note..."
                            className="text-xs border-institutional-border h-6 px-2"
                          />
                        </td>
                        <td className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[8px] font-bold px-1.5 py-0 h-5"
                          >
                            MONITOR
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* Balance Sheet Analysis Tab */}
              <TabsContent value="balance" className="mt-0">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold uppercase text-institutional-black">
                    Balance Sheet Analysis & DSCR Calculations
                  </h3>
                  <ColumnVisibilityControls 
                    tableType="balanceSheet"
                    columns={[
                      { key: 'account', label: 'Account & Description' },
                      { key: 'balance', label: 'Balance & Value' },
                      { key: 'percentage', label: 'Percentage & Ratios' },
                      { key: 'notes', label: 'Notes & Commentary' },
                      { key: 'actions', label: 'Actions & Status' }
                    ]}
                  />
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
                          <td className="font-mono-data font-bold">$2,840,000</td>
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
                          <td className="font-mono-data font-bold">$1,820,000</td>
                          <td className="font-mono-data">4.25%</td>
                          <td className="font-mono-data">2029</td>
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
                      <tr>
                        <td>Stabilized NOI (T12)</td>
                        <td className="font-mono-data">12.20%</td>
                        <td className="font-mono-data">$87,200</td>
                        <td className="font-mono-data font-bold text-success-green">$714,754</td>
                        <td className="font-mono-data text-red-600">-23.2%</td>
                        <td><span className="text-success-green font-bold">UNDERVALUED</span></td>
                        <td><span className="text-success-green font-bold">HIGH</span></td>
                      </tr>
                      <tr>
                        <td>Pro-Forma (Full Occupancy)</td>
                        <td className="font-mono-data">12.20%</td>
                        <td className="font-mono-data">$91,800</td>
                        <td className="font-mono-data font-bold text-success-green">$752,459</td>
                        <td className="font-mono-data text-red-600">-19.1%</td>
                        <td><span className="text-success-green font-bold">UNDERVALUED</span></td>
                        <td><span className="text-orange-600 font-bold">MEDIUM</span></td>
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

                {/* Cap Rate Sensitivity Analysis */}
                <div className="mt-5 overflow-hidden border-2 border-institutional-black">
                  <div className="bg-institutional-black text-institutional-white p-2">
                    <h4 className="font-bold text-xs uppercase">Cap Rate Sensitivity Matrix</h4>
                  </div>
                  <table className="institutional-table">
                    <thead>
                      <tr>
                        <th>NOI Scenario</th>
                        <th>9.50% Cap</th>
                        <th>10.75% Cap</th>
                        <th>12.20% Cap</th>
                        <th>13.50% Cap</th>
                        <th>15.00% Cap</th>
                        <th>Market Commentary</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Bear Case ($75K NOI)</td>
                        <td className="font-mono-data">$789,474</td>
                        <td className="font-mono-data">$697,674</td>
                        <td className="font-mono-data">$614,754</td>
                        <td className="font-mono-data">$555,556</td>
                        <td className="font-mono-data">$500,000</td>
                        <td className="text-red-600 text-xs">Recession scenario</td>
                      </tr>
                      <tr>
                        <td>Current NOI ($81.6K)</td>
                        <td className="font-mono-data">$858,947</td>
                        <td className="font-mono-data">$759,070</td>
                        <td className="font-mono-data font-bold">$668,852</td>
                        <td className="font-mono-data">$604,444</td>
                        <td className="font-mono-data">$544,000</td>
                        <td className="text-institutional-black text-xs">Current performance</td>
                      </tr>
                      <tr>
                        <td>Stabilized ($87.2K)</td>
                        <td className="font-mono-data">$918,421</td>
                        <td className="font-mono-data">$811,163</td>
                        <td className="font-mono-data font-bold">$714,754</td>
                        <td className="font-mono-data">$645,926</td>
                        <td className="font-mono-data">$581,333</td>
                        <td className="text-success-green text-xs">12-month target</td>
                      </tr>
                      <tr>
                        <td>Bull Case ($95K NOI)</td>
                        <td className="font-mono-data">$1,000,000</td>
                        <td className="font-mono-data">$883,721</td>
                        <td className="font-mono-data font-bold">$778,689</td>
                        <td className="font-mono-data">$703,704</td>
                        <td className="font-mono-data">$633,333</td>
                        <td className="text-success-green text-xs">Full optimization</td>
                      </tr>
                      <tr className="bg-yellow-50">
                        <td className="font-bold">Book Value Reference</td>
                        <td className="font-mono-data font-bold">$930,000</td>
                        <td className="font-mono-data font-bold">$930,000</td>
                        <td className="font-mono-data font-bold">$930,000</td>
                        <td className="font-mono-data font-bold">$930,000</td>
                        <td className="font-mono-data font-bold">$930,000</td>
                        <td className="text-institutional-black text-xs font-bold">Current book basis</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Detailed Asset Line Items beneath Balance Sheet */}
                <div className="mt-5 overflow-hidden border-2 border-institutional-black">
                  <div className="bg-institutional-black text-institutional-white p-2">
                    <h4 className="font-bold text-xs uppercase">Detailed Asset Line Items</h4>
                  </div>
                  <table className="institutional-table">
                    <thead>
                      <tr>
                        <th>Asset Code</th>
                        <th>Description</th>
                        <th>Current Value</th>
                        <th>Prior Period</th>
                        <th>Variance</th>
                        <th>Appreciation</th>
                        <th>Risk Level</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-mono-data font-bold text-center">1100</td>
                        <td>Land Value</td>
                        <td className="font-mono-data font-bold">$850,000</td>
                        <td className="font-mono-data">$840,000</td>
                        <td className="font-mono-data text-success-green">+$10,000</td>
                        <td className="font-mono-data text-success-green">+1.2%</td>
                        <td><span className="text-success-green font-bold">LOW</span></td>
                        <td>
                          <Input
                            placeholder="Market comp analysis..."
                            className="text-xs border-institutional-border h-6 px-2"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="font-mono-data font-bold text-center">1200</td>
                        <td>Building & Improvements</td>
                        <td className="font-mono-data font-bold">$1,990,000</td>
                        <td className="font-mono-data">$2,010,000</td>
                        <td className="font-mono-data text-red-600">-$20,000</td>
                        <td className="font-mono-data text-red-600">-1.0%</td>
                        <td><span className="text-orange-600 font-bold">MEDIUM</span></td>
                        <td>
                          <Input
                            placeholder="Depreciation schedule..."
                            className="text-xs border-institutional-border h-6 px-2"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="font-mono-data font-bold text-center">1110</td>
                        <td>Operating Cash</td>
                        <td className="font-mono-data font-bold">$156,000</td>
                        <td className="font-mono-data">$142,000</td>
                        <td className="font-mono-data text-success-green">+$14,000</td>
                        <td className="font-mono-data text-success-green">+9.9%</td>
                        <td><span className="text-success-green font-bold">LOW</span></td>
                        <td>
                          <Input
                            placeholder="Cash flow timing..."
                            className="text-xs border-institutional-border h-6 px-2"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* T12 Performance Tab */}
              <TabsContent value="t12" className="mt-0">
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
                            onClick={() => flagIssue('forecast-noi')}
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
                            onClick={() => flagIssue('weather-correlation')}
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
                
                {/* Detailed Asset Breakdown */}
                <div className="mt-5 overflow-hidden border-2 border-institutional-black">
                  <div className="bg-institutional-black text-institutional-white p-2">
                    <h4 className="font-bold text-xs uppercase">Detailed Asset Line Items</h4>
                  </div>
                  <table className="institutional-table">
                    <thead>
                      <tr>
                        <th>Asset Code</th>
                        <th>Description</th>
                        <th>Current Value</th>
                        <th>Prior Period</th>
                        <th>Variance</th>
                        <th>Appreciation</th>
                        <th>Risk Level</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-mono-data font-bold text-center">1100</td>
                        <td>Land Value</td>
                        <td className="font-mono-data font-bold">$850,000</td>
                        <td className="font-mono-data">$840,000</td>
                        <td className="font-mono-data text-success-green">+$10,000</td>
                        <td className="font-mono-data text-success-green">+1.2%</td>
                        <td><span className="text-success-green font-bold">LOW</span></td>
                        <td>
                          <Input
                            placeholder="Market comp analysis..."
                            className="text-xs border-institutional-border h-6 px-2"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="font-mono-data font-bold text-center">1200</td>
                        <td>Building & Improvements</td>
                        <td className="font-mono-data font-bold">$1,990,000</td>
                        <td className="font-mono-data">$2,010,000</td>
                        <td className="font-mono-data text-red-600">-$20,000</td>
                        <td className="font-mono-data text-red-600">-1.0%</td>
                        <td><span className="text-orange-600 font-bold">MEDIUM</span></td>
                        <td>
                          <Input
                            placeholder="Depreciation schedule..."
                            className="text-xs border-institutional-border h-6 px-2"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="font-mono-data font-bold text-center">1110</td>
                        <td>Operating Cash</td>
                        <td className="font-mono-data font-bold">$156,000</td>
                        <td className="font-mono-data">$142,000</td>
                        <td className="font-mono-data text-success-green">+$14,000</td>
                        <td className="font-mono-data text-success-green">+9.9%</td>
                        <td><span className="text-success-green font-bold">LOW</span></td>
                        <td>
                          <Input
                            placeholder="Cash flow timing..."
                            className="text-xs border-institutional-border h-6 px-2"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="font-mono-data font-bold text-center">1300</td>
                        <td>Tenant Receivables</td>
                        <td className="font-mono-data font-bold">$21,800</td>
                        <td className="font-mono-data">$18,200</td>
                        <td className="font-mono-data text-red-600">+$3,600</td>
                        <td className="font-mono-data text-red-600">+19.8%</td>
                        <td><span className="text-red-600 font-bold">HIGH</span></td>
                        <td>
                          <Input
                            placeholder="Collections aging..."
                            className="text-xs border-institutional-border h-6 px-2"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="font-mono-data font-bold text-center">1400</td>
                        <td>Security Deposits Held</td>
                        <td className="font-mono-data font-bold">$48,200</td>
                        <td className="font-mono-data">$47,800</td>
                        <td className="font-mono-data text-success-green">+$400</td>
                        <td className="font-mono-data text-success-green">+0.8%</td>
                        <td><span className="text-success-green font-bold">LOW</span></td>
                        <td>
                          <Input
                            placeholder="New lease deposits..."
                            className="text-xs border-institutional-border h-6 px-2"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                </div>
              </TabsContent>

              {/* Notes & Actions Tab */}
              <TabsContent value="notes" className="mt-0">
                <h3 className="text-lg font-bold uppercase text-institutional-black mb-4">
                  Action Items & Notes
                </h3>
                
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <h4 className="font-bold text-sm uppercase mb-3">Open Action Items</h4>
                    <div className="space-y-2">
                      {actionItems.map((item: ActionItem) => (
                        <Card key={item.id} className="border border-institutional-border bg-institutional-accent">
                          <CardContent className="p-3">
                            <div className="text-sm font-bold">{item.itemId}: Review Action Item</div>
                            <div className="text-xs text-gray-600">
                              Property: S0010 | Priority: {item.priority} | Created: {new Date(item.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-sm mt-1">{item.description}</div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-sm uppercase mb-3">Recent Notes</h4>
                    <div className="space-y-2">
                      {notes.map((note: Note) => (
                        <Card key={note.id} className="border border-institutional-border bg-institutional-accent">
                          <CardContent className="p-3">
                            <div className="text-sm font-bold">GL {note.cellId.replace('gl-', '')} Note</div>
                            <div className="text-xs text-gray-600">
                              Added: {new Date(note.createdAt).toLocaleString()}
                            </div>
                            <div className="text-sm mt-1">{note.text}</div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </Card>

        {/* Export Summary */}
        <Card className="bg-institutional-accent border-2 border-institutional-black">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-sm font-bold uppercase">
                Export Summary: <span>{notes.length}</span> Notes, <span>{actionItems.length}</span> Action Items
              </div>
              <div className="flex gap-3">
                <Button onClick={() => toast({ title: 'Report generated', variant: 'default' })} className="btn-institutional">
                  GENERATE REPORT
                </Button>
                <Button onClick={() => toast({ title: 'Summary emailed', variant: 'default' })} className="btn-secondary">
                  EMAIL SUMMARY
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
