import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import type { Portfolio, Property } from '@shared/schema';
import { ExportUtils } from '@/lib/export-utils';
import { ExcelProcessor } from '@/lib/excel-processor';

// Import our new components
import { DashboardHeader } from './dashboard/DashboardHeader';
import { PortfolioNavigation } from './dashboard/PortfolioNavigation';
import { KPIMetrics } from './dashboard/KPIMetrics';
import { PerformanceTab } from './dashboard/tabs/PerformanceTab';
import { OperationsTab } from './dashboard/tabs/OperationsTab';
import { CashFlowTab } from './dashboard/tabs/CashFlowTab';
import { BalanceSheetTab } from './dashboard/tabs/BalanceSheetTab';
import { T12PerformanceTab } from './dashboard/tabs/T12PerformanceTab';
import { NotesTab } from './dashboard/tabs/NotesTab';

interface PropertyDashboardProps {
  // No props needed currently
}

export function PropertyDashboard({}: PropertyDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [selectedPortfolio, setSelectedPortfolio] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('performance');
  const [clickedElements, setClickedElements] = useState<Set<string>>(new Set());
  const [cellNotes, setCellNotes] = useState<Record<string, string>>({});
  
  // Column visibility states
  const [visibleColumns] = useState({
    performance: {
      account: true,
      current: true,
      notes: true,
      actions: true
    }
  });

  // Queries - Use Supabase investment portfolios
  const { data: portfolios = [] } = useQuery<{ key: string; id: string; name: string; totalUnits: number; totalNOI: number; capRate: number; }[]>({
    queryKey: ['/api/investments/portfolios'],
    queryFn: async () => {
      const response = await fetch('/api/investments/portfolios');
      if (!response.ok) throw new Error('Failed to fetch portfolios');
      return response.json();
    },
  });

  const currentPortfolio = portfolios.find(p => p.key === selectedPortfolio);

  // Portfolio summary with aggregated data
  const { data: portfolioSummary } = useQuery({
    queryKey: ['/api/investments/portfolio-summary', selectedPortfolio],
    queryFn: async () => {
      const url = selectedPortfolio !== 'all' 
        ? `/api/investments/portfolio-summary?portfolio=${encodeURIComponent(currentPortfolio?.name || selectedPortfolio)}`
        : '/api/investments/portfolio-summary';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch portfolio summary');
      return response.json();
    },
    enabled: !!selectedPortfolio,
  });

  // Auto-select first portfolio when portfolios load
  useEffect(() => {
    if (portfolios.length > 0 && !selectedPortfolio) {
      setSelectedPortfolio(portfolios[0].key);
    }
  }, [portfolios, selectedPortfolio]);

  // Portfolio aggregated financials from Supabase investments
  const { data: portfolioFinancials } = useQuery({
    queryKey: ['/api/investments/portfolio-financials', selectedPortfolio],
    queryFn: async () => {
      const url = selectedPortfolio !== 'all' 
        ? `/api/investments/portfolio-financials?portfolio=${encodeURIComponent(currentPortfolio?.name || selectedPortfolio)}`
        : '/api/investments/portfolio-financials';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch portfolio financials');
      return response.json();
    },
    enabled: !!selectedPortfolio,
  });

  // Fetch properties for the selected portfolio
  const { data: portfolioProperties = [] } = useQuery({
    queryKey: ['/api/investments', selectedPortfolio],
    queryFn: async () => {
      const url = selectedPortfolio !== 'all' 
        ? `/api/investments?portfolio=${encodeURIComponent(currentPortfolio?.name || selectedPortfolio)}`
        : '/api/investments';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch portfolio properties');
      return response.json();
    },
    enabled: !!selectedPortfolio,
  });

  // Auto-select first property when portfolio changes
  useEffect(() => {
    if (portfolioProperties.length > 0 && (!selectedProperty || !portfolioProperties.find((p: any) => p["Asset ID"] === selectedProperty?.["Asset ID"]))) {
      setSelectedProperty(portfolioProperties[0]);
    }
  }, [portfolioProperties]);

  const { data: notes = [] } = useQuery<{ text: string; id: string; propertyId: string; cellId: string; author: string; createdAt: Date; }[]>({
    queryKey: ['/api/notes'],
    queryFn: async () => {
      const response = await fetch('/api/notes');
      if (!response.ok) throw new Error('Failed to fetch notes');
      return response.json();
    },
  });

  const { data: actionItems = [] } = useQuery({
    queryKey: ['/api/action-items'],
    queryFn: async () => {
      const response = await fetch('/api/action-items');
      if (!response.ok) throw new Error('Failed to fetch action items');
      return response.json();
    },
  });

  // Mutations
  const createNoteMutation = useMutation({
    mutationFn: async (noteData: { cellId: string; text: string }) => {
      return apiRequest('POST', '/api/notes', noteData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      toast({ title: 'Note added successfully', variant: 'default' });
    },
    onError: () => {
      toast({ title: 'Failed to add note', variant: 'destructive' });
    },
  });

  const createActionItemMutation = useMutation({
    mutationFn: async (actionData: { itemId: string; description: string; priority: string }) => {
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

  // Event handlers
  const handleClick = (elementId: string) => {
    setClickedElements(prev => new Set([...Array.from(prev), elementId]));
    setTimeout(() => {
      setClickedElements(prev => {
        const newSet = new Set(prev);
        newSet.delete(elementId);
        return newSet;
      });
    }, 5000);
  };

  const selectPortfolio = (portfolioKey: string) => {
    setSelectedPortfolio(portfolioKey);
    handleClick(`portfolio-${portfolioKey}`);
  };

  const handleNoteChange = (cellId: string, value: string) => {
    setCellNotes(prev => ({ ...prev, [cellId]: value }));
    
    if (value.trim()) {
      createNoteMutation.mutate({
        cellId,
        text: value.trim()
      });
    }
  };

  const flagIssue = (cellId: string) => {
    const description = `Review flagged item for GL account ${cellId.replace('gl-', '')} - Portfolio: ${selectedPortfolio}`;
    const itemId = `AI-${Date.now()}`;
    
    createActionItemMutation.mutate({
      itemId,
      description,
      priority: 'HIGH'
    });
  };

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
      
      const buffer = Uint8Array.from(atob(result.fileBuffer), c => c.charCodeAt(0)).buffer;
      const processor = new ExcelProcessor();
      await processor.processFile(buffer);
      
      toast({ title: `Excel file processed: ${result.filename}`, variant: 'default' });
      queryClient.invalidateQueries();
      
    } catch (error) {
      toast({ title: 'Failed to upload Excel file', variant: 'destructive' });
    }
  };

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
      <DashboardHeader
        onFileUpload={handleFileUpload}
        onLenderPackageExport={handleLenderPackageExport}
        onExcelExport={handleExcelExport}
        onRefreshData={refreshData}
      />

      <div className="max-w-7xl mx-auto p-5">
        {/* Portfolio Navigation */}
        <PortfolioNavigation
          portfolios={portfolios}
          selectedPortfolio={selectedPortfolio}
          onSelectPortfolio={selectPortfolio}
          clickedElements={clickedElements}
        />

        {/* Property Selection */}
        {portfolioProperties.length > 0 && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Select Property:</label>
              <select 
                value={selectedProperty?.["Asset ID"] || ''} 
                onChange={(e) => {
                  const property = portfolioProperties.find((p: any) => p["Asset ID"] === e.target.value);
                  setSelectedProperty(property);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {portfolioProperties.map((property: any) => (
                  <option key={property["Asset ID"]} value={property["Asset ID"]}>
                    {property["Asset ID + Name"]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Portfolio KPI Section */}
        <KPIMetrics
          currentPortfolio={currentPortfolio}
          portfolioSummary={portfolioSummary}
          clickedElements={clickedElements}
          onHandleClick={handleClick}
        />

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
                <PerformanceTab
                  portfolioFinancials={portfolioFinancials}
                  notes={notes}
                  clickedElements={clickedElements}
                  cellNotes={cellNotes}
                  visibleColumns={visibleColumns}
                  onHandleClick={handleClick}
                  onHandleNoteChange={handleNoteChange}
                  onFlagIssue={flagIssue}
                />
              </TabsContent>

              {/* Operational Review Tab */}
              <TabsContent value="operations" className="mt-0">
                <OperationsTab />
              </TabsContent>

              {/* Cash Flow Detail Tab */}
              <TabsContent value="cashflow" className="mt-0">
                <CashFlowTab
                  portfolioFinancials={portfolioFinancials}
                  notes={notes}
                  clickedElements={clickedElements}
                  onHandleClick={handleClick}
                  onHandleNoteChange={handleNoteChange}
                  onFlagIssue={flagIssue}
                  selectedProperty={selectedProperty}
                />
              </TabsContent>

              {/* Balance Sheet Tab */}
              <TabsContent value="balance" className="mt-0">
                <BalanceSheetTab 
                  selectedProperty={selectedProperty}
                  getCellComments={() => []}
                  handleCommentAdded={() => {}}
                />
              </TabsContent>

              {/* T12 Performance Tab */}
              <TabsContent value="t12" className="mt-0">
                <T12PerformanceTab onFlagIssue={flagIssue} selectedProperty={selectedProperty} />
              </TabsContent>

              {/* Notes & Actions Tab */}
              <TabsContent value="notes" className="mt-0">
                <NotesTab notes={notes} actionItems={actionItems} />
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