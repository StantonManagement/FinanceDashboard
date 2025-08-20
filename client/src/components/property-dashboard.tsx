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
import { Upload, Download, FileText, RefreshCw, Flag, AlertTriangle } from 'lucide-react';
import type { Portfolio, Property, GLAccount, Note, ActionItem } from '@shared/schema';
import { ExportUtils } from '@/lib/export-utils';
import { ExcelProcessor } from '@/lib/excel-processor';

interface PropertyDashboardProps {}

export function PropertyDashboard({}: PropertyDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedPortfolio, setSelectedPortfolio] = useState('hartford1');
  const [activeTab, setActiveTab] = useState('performance');
  const [clickedElements, setClickedElements] = useState<Set<string>>(new Set());
  const [cellNotes, setCellNotes] = useState<Record<string, string>>({});

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
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-5">
        {/* Portfolio Navigation */}
        <Card className="mb-5 border-2 border-institutional-black">
          <CardHeader className="bg-institutional-black text-institutional-white p-3">
            <CardTitle className="font-bold text-xs uppercase">Portfolio Selection</CardTitle>
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
                    <span>${Math.round(portfolio.totalNOI / 1000)}K NOI</span>
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
                <h3 className="text-lg font-bold uppercase text-institutional-black mb-4">
                  Hartford 1 - GL Account Detail
                </h3>
                
                <div className="overflow-hidden border-2 border-institutional-black">
                  <table className="institutional-table">
                    <thead>
                      <tr>
                        <th>GL Account</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Type</th>
                        <th>Notes</th>
                        <th>Actions</th>
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
                            <td className="text-xs uppercase font-bold">
                              {account.type.toUpperCase()}
                            </td>
                            <td className="relative">
                              <Input 
                                type="text" 
                                placeholder="Add note..." 
                                className="border border-institutional-border p-2 text-sm w-full" 
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
                            <td>
                              <Button 
                                onClick={() => flagIssue(cellId)} 
                                className="bg-orange-600 text-institutional-white border-none px-3 py-1 text-xs uppercase font-bold"
                                size="sm"
                              >
                                <Flag className="w-3 h-3 mr-1" />
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
                <h3 className="text-lg font-bold uppercase text-institutional-black mb-4">
                  Hartford 1 - Detailed Cash Flow by GL Account
                </h3>
                
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
                              <td 
                                onClick={() => handleClick(`${cellId}-code`)}
                                className={`font-mono-data font-bold text-center cursor-pointer transition-all ${
                                  clickedElements.has(`${cellId}-code`) ? 'click-highlight' : ''
                                }`}
                              >
                                {account.code}
                              </td>
                              <td 
                                onClick={() => handleClick(`${cellId}-desc`)}
                                className={`cursor-pointer transition-all ${
                                  clickedElements.has(`${cellId}-desc`) ? 'click-highlight' : ''
                                }`}
                              >
                                {account.description}
                              </td>
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
