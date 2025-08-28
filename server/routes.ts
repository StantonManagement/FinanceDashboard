import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";
import { storage } from "./storage";
import { insertNoteSchema, insertActionItemSchema, insertExcelFileSchema } from "@shared/schema";
import { loadComprehensiveExcelData } from "./comprehensive-excel-loader";
import { SUPABASE_QUERIES } from "./supabase-service";
import { SupabaseIntegration } from "./supabase-integration";
import { INVESTMENT_QUERIES, SUPABASE_PROJECT_ID } from "./investments-service";
import { supabase } from "./supabase-client";

const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Accept Excel files only
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed') as any, false);
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Add request logging for debugging
  app.use('/api/investments', (req, res, next) => {
    console.log('🌐 Incoming request:', req.method, req.url, 'Full path:', req.path);
    next();
  });
  
  // Supabase AppFolio Data Routes - Using SupabaseIntegration service
  app.get("/api/supabase/properties", async (req, res) => {
    try {
      const properties = await SupabaseIntegration.getProperties();
      res.json(properties);
    } catch (error) {
      console.error('Error fetching Supabase properties:', error);
      res.status(500).json({ message: "Failed to fetch properties from Supabase", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/supabase/properties/:propertyId/rent-roll", async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      const rentRoll = await SupabaseIntegration.getRentRollByProperty(propertyId);
      res.json(rentRoll);
    } catch (error) {
      console.error('Error fetching rent roll:', error);
      res.status(500).json({ message: "Failed to fetch rent roll from Supabase" });
    }
  });

  app.get("/api/supabase/properties/:propertyId/financials", async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      const year = parseInt(req.query.year as string) || 2024;
      
      const financials = await SupabaseIntegration.getPropertyFinancials(propertyId, year);
      res.json(financials);
    } catch (error) {
      console.error('Error fetching property financials:', error);
      res.status(500).json({ message: "Failed to fetch property financials from Supabase" });
    }
  });

  app.get("/api/supabase/portfolio-summary", async (req, res) => {
    try {
      const summary = await SupabaseIntegration.getPortfolioSummary();
      res.json(summary);
    } catch (error) {
      console.error('Error fetching portfolio summary:', error);
      res.status(500).json({ message: "Failed to fetch portfolio summary from Supabase" });
    }
  });

  // NEW PORTFOLIO ROUTES - Portfolio-level aggregated data from investments table

  // Get portfolio summary with aggregated data
  app.get("/api/investments/portfolio-summary", async (req, res) => {
    console.log('🔵 HIT /api/investments/portfolio-summary endpoint');
    try {
      const portfolioFilter = req.query.portfolio as string;
      console.log('📊 Portfolio filter:', portfolioFilter);
      
      let query = supabase
        .from('investments')
        .select('noi, proforma_revenue, proforma_operating_expenses, exp_tax_prop, exp_prop_ins, exp_rm, debt_service, units, going_in_cap_rate');

      if (portfolioFilter && portfolioFilter !== 'all') {
        query = query.ilike('portfolio_name', `%${portfolioFilter}%`);
      }

      const { data: investments, error } = await query;
      
      if (error) throw error;

      // Calculate portfolio totals
      const summary = {
        total_properties: investments.length,
        total_units: investments.reduce((sum, inv) => sum + (inv.units || 0), 0),
        total_noi: investments.reduce((sum, inv) => sum + (inv.noi || 0), 0),
        total_revenue: investments.reduce((sum, inv) => sum + (inv.proforma_revenue || 0), 0),
        total_operating_expenses: investments.reduce((sum, inv) => sum + (inv.proforma_operating_expenses || 0), 0),
        total_property_tax: investments.reduce((sum, inv) => sum + (inv.exp_tax_prop || 0), 0),
        total_insurance: investments.reduce((sum, inv) => sum + (inv.exp_prop_ins || 0), 0),
        total_maintenance: investments.reduce((sum, inv) => sum + (inv.exp_rm || 0), 0),
        total_debt_service: investments.reduce((sum, inv) => sum + (inv.debt_service || 0), 0),
        avg_cap_rate: investments.reduce((sum, inv) => sum + (inv.going_in_cap_rate || 0), 0) / investments.length,
        avg_occupancy: 95 // Placeholder - would need actual occupancy data
      };

      console.log('📊 Portfolio summary calculated:', summary);
      res.json(summary);
    } catch (error) {
      console.error('❌ Error fetching portfolio summary:', error);
      res.status(500).json({ message: "Failed to fetch portfolio summary", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get portfolio financials aggregated
  app.get("/api/investments/portfolio-financials", async (req, res) => {
    console.log('🔵 HIT /api/investments/portfolio-financials endpoint');
    try {
      const portfolioFilter = req.query.portfolio as string;
      console.log('📊 Portfolio filter:', portfolioFilter);
      
      let query = supabase
        .from('investments')
        .select('*');

      if (portfolioFilter && portfolioFilter !== 'all') {
        query = query.ilike('portfolio_name', `%${portfolioFilter}%`);
      }

      const { data: investments, error } = await query;
      
      if (error) throw error;

      // Calculate aggregated financials
      const financials = {
        total_proforma_revenue: investments.reduce((sum, inv) => sum + (inv.proforma_revenue || 0), 0),
        total_operating_expenses: investments.reduce((sum, inv) => sum + (inv.proforma_operating_expenses || 0), 0),
        total_property_tax: investments.reduce((sum, inv) => sum + (inv.exp_tax_prop || 0), 0),
        total_insurance: investments.reduce((sum, inv) => sum + (inv.exp_prop_ins || 0), 0),
        total_maintenance: investments.reduce((sum, inv) => sum + (inv.exp_rm || 0), 0),
        total_debt_service: investments.reduce((sum, inv) => sum + (inv.debt_service || 0), 0),
        total_noi: investments.reduce((sum, inv) => sum + (inv.noi || 0), 0),
        property_count: investments.length
      };

      console.log('📊 Portfolio financials calculated:', financials);
      res.json(financials);
    } catch (error) {
      console.error('❌ Error fetching portfolio financials:', error);
      res.status(500).json({ message: "Failed to fetch portfolio financials", error: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Investment Portfolios - Get portfolios from AF_Investments_export table (MUST be before :assetId route)
  app.get("/api/investments/portfolios", async (req, res) => {
    console.log('🔵 HIT /api/investments/portfolios endpoint');
    try {
      console.log('📊 Querying AF_Investments_export for portfolio data...');
      const { data: portfolioData, error } = await supabase
        .from('AF_Investments_export')
        .select('"Portfolio Name", "Units", "NOI", "Going-In Cap Rate"')
        .not('Portfolio Name', 'is', null);
      
      console.log('📊 Supabase query result:', { 
        dataCount: portfolioData?.length, 
        error: error?.message,
        firstItem: portfolioData?.[0] 
      });
      
      if (error) throw error;
      
      console.log('🔄 Processing portfolio data, grouping by Portfolio Name...');
      // Group by portfolio and calculate totals
      const portfolioMap = new Map();
      portfolioData.forEach(item => {
        const name = item['Portfolio Name'];
        if (!name) return; // Skip if no portfolio name
        
        if (!portfolioMap.has(name)) {
          portfolioMap.set(name, {
            name,
            totalUnits: 0,
            totalNOI: 0,
            totalCapRate: 0,
            count: 0
          });
        }
        const portfolio = portfolioMap.get(name);
        portfolio.totalUnits += parseInt(item['Units']) || 0;
        portfolio.totalNOI += parseFloat(item['NOI']?.replace(/[\$,]/g, '')) || 0;
        const capRate = parseFloat(item['Going-In Cap Rate']?.replace('%', ''));
        if (!isNaN(capRate)) {
          portfolio.totalCapRate += capRate;
          portfolio.count += 1;
        }
      });
      
      // Transform to expected format
      const portfolios = Array.from(portfolioMap.values()).map((portfolio, index) => ({
        key: portfolio.name.toLowerCase().replace(/\s+/g, ''),
        id: `portfolio-${index + 1}`,
        name: portfolio.name,
        totalUnits: portfolio.totalUnits,
        totalNOI: portfolio.totalNOI,
        capRate: portfolio.count > 0 ? (portfolio.totalCapRate / portfolio.count) : 0
      }));
      
      console.log('✅ Successfully processed portfolios:', portfolios.length, 'portfolios found');
      console.log('📋 Portfolio names:', portfolios.map(p => p.name));
      
      res.json(portfolios);
    } catch (error) {
      console.error('❌ Error fetching investment portfolios:', error);
      res.status(500).json({ message: "Failed to fetch investment portfolios", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Investment Properties Routes - Using Supabase client
  app.get("/api/investments", async (req, res) => {
    try {
      const { portfolio, search } = req.query;
      
      let query = supabase
        .from('AF_Investments_export')
        .select('*')
        .order('"Asset ID"');
      
      if (portfolio) {
        query = query.ilike('"Portfolio Name"', `%${portfolio}%`);
      }
      
      if (search) {
        query = query.or(`"Asset ID + Name".ilike.%${search}%,"Address".ilike.%${search}%,"Portfolio Name".ilike.%${search}%`);
      }
      
      const { data: properties, error } = await query;
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      res.json(properties || []);
    } catch (error) {
      console.error('Error fetching investment properties:', error);
      res.status(500).json({ message: "Failed to fetch investment properties", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/investments/:assetId", async (req, res) => {
    console.log('🔴 HIT /api/investments/:assetId endpoint with assetId:', req.params.assetId);
    try {
      const { assetId } = req.params;
      
      const { data: property, error } = await supabase
        .from('AF_Investments_export')
        .select('*')
        .eq('"Asset ID"', assetId)
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        if (error.code === 'PGRST116') {
          return res.status(404).json({ message: "Investment property not found" });
        }
        throw error;
      }
      
      res.json(property);
    } catch (error) {
      console.error('Error fetching investment property:', error);
      res.status(500).json({ message: "Failed to fetch investment property", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/investments/summary/portfolio", async (req, res) => {
    try {
      // Get portfolio summary
      const { data: summaryData, error: summaryError } = await supabase
        .from('investments')
        .select('units, noi, proforma_revenue, going_in_cap_rate')
        .not('units', 'is', null);
      
      if (summaryError) throw summaryError;
      
      const summary = {
        total_properties: summaryData.length,
        total_units: summaryData.reduce((sum, item) => sum + (parseInt(item.units) || 0), 0),
        total_noi: summaryData.reduce((sum, item) => sum + (parseFloat(item.noi) || 0), 0),
        total_revenue: summaryData.reduce((sum, item) => sum + (parseFloat(item.proforma_revenue) || 0), 0),
        avg_cap_rate: summaryData.filter(item => item.going_in_cap_rate).length > 0 
          ? summaryData.reduce((sum, item) => sum + (parseFloat(item.going_in_cap_rate) || 0), 0) / summaryData.filter(item => item.going_in_cap_rate).length
          : 0
      };
      
      // Get portfolio breakdown
      const { data: breakdownData, error: breakdownError } = await supabase
        .from('investments')
        .select('portfolio_name, units, noi')
        .not('portfolio_name', 'is', null);
      
      if (breakdownError) throw breakdownError;
      
      const portfolioMap = new Map();
      breakdownData.forEach(item => {
        const name = item.portfolio_name;
        if (!name) return; // Skip if no portfolio name
        
        if (!portfolioMap.has(name)) {
          portfolioMap.set(name, { name, property_count: 0, total_units: 0, total_noi: 0 });
        }
        const portfolio = portfolioMap.get(name);
        portfolio.property_count += 1;
        portfolio.total_units += parseInt(item.units) || 0;
        portfolio.total_noi += parseFloat(item.noi) || 0;
      });
      
      const breakdown = Array.from(portfolioMap.values());
      
      res.json({
        summary,
        portfolios: breakdown
      });
    } catch (error) {
      console.error('Error fetching investment summary:', error);
      res.status(500).json({ message: "Failed to fetch investment summary", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/investments/:assetId/financials", async (req, res) => {
    try {
      const { assetId } = req.params;
      
      const { data: financials, error } = await supabase
        .from('AF_Investments_export')
        .select('"Asset ID", "Asset ID + Name", "NOI", "Proforma Revenue", "Proforma Operating Expenses", "Going-In Cap Rate", "Debt Service", "LTV Ratio", "DSV Ratio", "Debt1 - Int Rate"')
        .eq('"Asset ID"', assetId)
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        if (error.code === 'PGRST116') {
          return res.status(404).json({ message: "Investment financials not found" });
        }
        throw error;
      }
      
      res.json(financials);
    } catch (error) {
      console.error('Error fetching investment financials:', error);
      res.status(500).json({ message: "Failed to fetch investment financials", error: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Comprehensive Excel Data
  app.get("/api/excel-data", async (req, res) => {
    try {
      const excelData = await loadComprehensiveExcelData();
      res.json(excelData);
    } catch (error) {
      console.error('Error loading Excel data:', error);
      res.status(500).json({ message: "Failed to load Excel data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Process existing Excel file and update storage
  app.post("/api/excel/process-existing", async (req, res) => {
    try {
      const filePath = 'd:/WORK Files/Stanton/Monthly Review_DataOnly.xlsx';
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Excel file not found at expected location" });
      }

      // Process the comprehensive Excel file
      const comprehensiveData = await loadComprehensiveExcelData(filePath);
      
      console.log('Processing existing Excel file:', {
        properties: comprehensiveData.properties.length,
        cashFlowData: comprehensiveData.cashFlowData.length,
        balanceSheetData: comprehensiveData.balanceSheetData.length,
        rentRollData: comprehensiveData.rentRollData.length,
        t12Data: comprehensiveData.t12Data.length
      });

      // Clear existing GL accounts for all properties
      const existingProperties = await storage.getAllProperties();
      for (const prop of existingProperties) {
        await storage.deleteGLAccountsByProperty(prop.id);
      }

      const currentMonth = new Date().toISOString().substring(0, 7);
      let processedProperties = 0;
      
      // Process each property's financial data
      for (const property of comprehensiveData.properties) {
        // Find corresponding cash flow data
        const cashFlow = comprehensiveData.cashFlowData.find(cf => cf.assetId === property.assetId);
        if (cashFlow) {
          // Find or get the existing property from storage
          let dbProperty = await storage.getPropertyByCode(property.assetId);
          
          if (dbProperty) {
            processedProperties++;
            console.log(`Processing financial data for ${property.assetId}: Revenue ${cashFlow.totalOperatingIncome}, Expenses ${cashFlow.totalOperatingExpense}, NOI ${cashFlow.noi}`);
            
            // Create GL accounts based on cash flow data
            if (cashFlow.rentIncome > 0) {
              await storage.createGLAccount({
                propertyId: dbProperty.id,
                code: "4105",
                description: "Rent Income", 
                amount: cashFlow.rentIncome,
                type: "revenue",
                month: currentMonth
              });
            }
            
            if (cashFlow.section8Rent > 0) {
              await storage.createGLAccount({
                propertyId: dbProperty.id,
                code: "4110",
                description: "Section 8 Rent",
                amount: cashFlow.section8Rent,
                type: "revenue",
                month: currentMonth
              });
            }
            
            // Add expense accounts based on total operating expense
            if (cashFlow.totalOperatingExpense > 0) {
              // Estimate breakdown of operating expenses
              const mgmtFee = cashFlow.totalOperatingExpense * 0.06; // 6% management
              const maintenance = cashFlow.totalOperatingExpense * 0.25; // 25% maintenance
              const utilities = cashFlow.totalOperatingExpense * 0.15; // 15% utilities
              const insurance = cashFlow.totalOperatingExpense * 0.10; // 10% insurance
              const taxes = cashFlow.totalOperatingExpense * 0.35; // 35% taxes
              
              if (mgmtFee > 0) {
                await storage.createGLAccount({
                  propertyId: dbProperty.id,
                  code: "6105",
                  description: "Property Management",
                  amount: mgmtFee,
                  type: "expense",
                  month: currentMonth
                });
              }
              
              if (maintenance > 0) {
                await storage.createGLAccount({
                  propertyId: dbProperty.id,
                  code: "6110",
                  description: "Maintenance & Repairs",
                  amount: maintenance,
                  type: "expense",
                  month: currentMonth
                });
              }
              
              if (utilities > 0) {
                await storage.createGLAccount({
                  propertyId: dbProperty.id,
                  code: "6120",
                  description: "Utilities",
                  amount: utilities,
                  type: "expense",
                  month: currentMonth
                });
              }
              
              if (insurance > 0) {
                await storage.createGLAccount({
                  propertyId: dbProperty.id,
                  code: "6130", 
                  description: "Property Insurance",
                  amount: insurance,
                  type: "expense",
                  month: currentMonth
                });
              }
              
              if (taxes > 0) {
                await storage.createGLAccount({
                  propertyId: dbProperty.id,
                  code: "6140",
                  description: "Property Taxes",
                  amount: taxes,
                  type: "expense",
                  month: currentMonth
                });
              }
            }
          }
        }
      }

      res.json({ 
        message: "Existing Excel file processed successfully",
        comprehensiveData: {
          propertiesFound: comprehensiveData.properties.length,
          propertiesProcessed: processedProperties,
          cashFlowRecords: comprehensiveData.cashFlowData.length,
          balanceSheetRecords: comprehensiveData.balanceSheetData.length,
          rentRollRecords: comprehensiveData.rentRollData.length,
          t12Records: comprehensiveData.t12Data.length,
          portfolioSummary: comprehensiveData.portfolioSummary
        }
      });
      
    } catch (error) {
      console.error('Error processing existing Excel file:', error);
      res.status(500).json({ message: "Failed to process existing Excel file", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Portfolios
  app.get("/api/portfolios", async (req, res) => {
    try {
      const portfolios = await storage.getAllPortfolios();
      res.json(portfolios);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch portfolios" });
    }
  });

  app.get("/api/portfolios/:key", async (req, res) => {
    try {
      const portfolio = await storage.getPortfolioByKey(req.params.key);
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }
      res.json(portfolio);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch portfolio" });
    }
  });

  // Properties
  app.get("/api/properties", async (req, res) => {
    try {
      const { portfolioId } = req.query;
      if (portfolioId) {
        const properties = await storage.getPropertiesByPortfolio(portfolioId as string);
        res.json(properties);
      } else {
        const properties = await storage.getAllProperties();
        res.json(properties);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/:code", async (req, res) => {
    try {
      const property = await storage.getPropertyByCode(req.params.code);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  // GL Accounts
  app.get("/api/properties/:propertyId/gl-accounts", async (req, res) => {
    try {
      const { month } = req.query;
      const glAccounts = await storage.getGLAccountsByProperty(
        req.params.propertyId, 
        month as string | undefined
      );
      res.json(glAccounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch GL accounts" });
    }
  });

  // Notes
  app.get("/api/properties/:propertyId/notes", async (req, res) => {
    try {
      const notes = await storage.getNotesByProperty(req.params.propertyId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.post("/api/notes", async (req, res) => {
    try {
      const validated = insertNoteSchema.parse(req.body);
      const note = await storage.createNote(validated);
      res.status(201).json(note);
    } catch (error) {
      res.status(400).json({ message: "Invalid note data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.put("/api/notes/:id", async (req, res) => {
    try {
      const updates = insertNoteSchema.partial().parse(req.body);
      const note = await storage.updateNote(req.params.id, updates);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      res.json(note);
    } catch (error) {
      res.status(400).json({ message: "Invalid note data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/notes/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteNote(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Note not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  // Action Items
  app.get("/api/action-items", async (req, res) => {
    try {
      const { propertyId } = req.query;
      if (propertyId) {
        const items = await storage.getActionItemsByProperty(propertyId as string);
        res.json(items);
      } else {
        const items = await storage.getAllActionItems();
        res.json(items);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch action items" });
    }
  });

  app.post("/api/action-items", async (req, res) => {
    try {
      const validated = insertActionItemSchema.parse(req.body);
      const item = await storage.createActionItem(validated);
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ message: "Invalid action item data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.put("/api/action-items/:id", async (req, res) => {
    try {
      const updates = insertActionItemSchema.partial().parse(req.body);
      const item = await storage.updateActionItem(req.params.id, updates);
      if (!item) {
        return res.status(404).json({ message: "Action item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(400).json({ message: "Invalid action item data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/action-items/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteActionItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Action item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete action item" });
    }
  });

  // Excel Upload
  app.post("/api/excel/upload", upload.single('excel'), async (req, res) => {
    try {
      console.log('Excel upload request received');
      
      if (!req.file) {
        console.log('No file in request');
        return res.status(400).json({ message: "No Excel file uploaded" });
      }

      console.log('File received:', req.file.originalname, 'Size:', req.file.size);

      // Save the uploaded file temporarily
      const tempFilePath = path.join(process.cwd(), 'uploaded_excel.xlsx');
      console.log('Saving to:', tempFilePath);
      fs.writeFileSync(tempFilePath, req.file.buffer);
      console.log('File saved successfully');

      // Process the comprehensive Excel file
      console.log('Starting Excel processing...');
      const comprehensiveData = await loadComprehensiveExcelData(tempFilePath);
      console.log('Excel processing completed');
      
      console.log('Comprehensive Excel data loaded:', {
        properties: comprehensiveData.properties.length,
        cashFlowData: comprehensiveData.cashFlowData.length,
        balanceSheetData: comprehensiveData.balanceSheetData.length,
        rentRollData: comprehensiveData.rentRollData.length,
        t12Data: comprehensiveData.t12Data.length
      });

      // Update storage with comprehensive data
      if (comprehensiveData.properties.length > 0) {
        // Clear existing data
        const existingProperties = await storage.getAllProperties();
        for (const prop of existingProperties) {
          await storage.deleteGLAccountsByProperty(prop.id);
        }

        const currentMonth = new Date().toISOString().substring(0, 7);
        
        // Process each property's financial data
        for (const property of comprehensiveData.properties) {
          // Find corresponding cash flow data
          const cashFlow = comprehensiveData.cashFlowData.find(cf => cf.assetId === property.assetId);
          if (cashFlow) {
            // Find or get the existing property from storage
            let dbProperty = await storage.getPropertyByCode(property.assetId);
            
            // Create property if it doesn't exist
            if (!dbProperty) {
              console.log(`Creating new property: ${property.assetId} - ${property.name}`);
              const portfolios = await storage.getAllPortfolios();
              let portfolio = portfolios.find(p => p.name === property.portfolio);
              
              // If portfolio doesn't exist, create it or use default
              if (!portfolio) {
                portfolio = portfolios.find(p => p.key === 'hartford1') || portfolios[0];
              }
              
              if (portfolio) {
                dbProperty = await storage.createProperty({
                  code: property.assetId,
                  name: property.name,
                  portfolioId: portfolio.id,
                  units: property.units || 1,
                  monthlyNOI: cashFlow.noi || 0,
                  noiMargin: cashFlow.totalOperatingIncome > 0 ? (cashFlow.noi / cashFlow.totalOperatingIncome) * 100 : 0,
                  occupancy: 95.0,
                  revenuePerUnit: property.units > 0 ? cashFlow.totalOperatingIncome / property.units : 0,
                  capRate: 12.0,
                  dscr: 2.0
                });
                console.log(`Created property: ${dbProperty.code} - ${dbProperty.name}`);
              }
            }
            
            if (dbProperty) {
              // Create GL accounts based on cash flow data
              if (cashFlow.rentIncome > 0) {
                await storage.createGLAccount({
                  propertyId: dbProperty.id,
                  code: "4105",
                  description: "Rent Income",
                  amount: cashFlow.rentIncome,
                  type: "revenue",
                  month: currentMonth
                });
              }
              
              if (cashFlow.section8Rent > 0) {
                await storage.createGLAccount({
                  propertyId: dbProperty.id,
                  code: "4110", 
                  description: "Section 8 Rent",
                  amount: cashFlow.section8Rent,
                  type: "revenue",
                  month: currentMonth
                });
              }
              
              // Add expense accounts based on total operating expense
              if (cashFlow.totalOperatingExpense > 0) {
                // Estimate breakdown of operating expenses
                const mgmtFee = cashFlow.totalOperatingExpense * 0.06; // 6% management
                const maintenance = cashFlow.totalOperatingExpense * 0.25; // 25% maintenance
                const utilities = cashFlow.totalOperatingExpense * 0.15; // 15% utilities
                const insurance = cashFlow.totalOperatingExpense * 0.10; // 10% insurance
                const taxes = cashFlow.totalOperatingExpense * 0.35; // 35% taxes
                
                if (mgmtFee > 0) {
                  await storage.createGLAccount({
                    propertyId: dbProperty.id,
                    code: "6105",
                    description: "Property Management",
                    amount: mgmtFee,
                    type: "expense",
                    month: currentMonth
                  });
                }
                
                if (maintenance > 0) {
                  await storage.createGLAccount({
                    propertyId: dbProperty.id,
                    code: "6110",
                    description: "Maintenance & Repairs",
                    amount: maintenance,
                    type: "expense", 
                    month: currentMonth
                  });
                }
                
                if (utilities > 0) {
                  await storage.createGLAccount({
                    propertyId: dbProperty.id,
                    code: "6120",
                    description: "Utilities",
                    amount: utilities,
                    type: "expense",
                    month: currentMonth
                  });
                }
                
                if (insurance > 0) {
                  await storage.createGLAccount({
                    propertyId: dbProperty.id,
                    code: "6130",
                    description: "Property Insurance",
                    amount: insurance,
                    type: "expense",
                    month: currentMonth
                  });
                }
                
                if (taxes > 0) {
                  await storage.createGLAccount({
                    propertyId: dbProperty.id,
                    code: "6140",
                    description: "Property Taxes",
                    amount: taxes,
                    type: "expense",
                    month: currentMonth
                  });
                }
              }
            }
          }
        }
      }

      // Keep the uploaded file for future reference
      const permanentPath = path.join(process.cwd(), `excel_data_${Date.now()}.xlsx`);
      fs.renameSync(tempFilePath, permanentPath);

      // Save file record
      const excelFile = await storage.createExcelFile({
        filename: req.file.originalname,
        processedData: JSON.stringify({
          propertiesCount: comprehensiveData.properties.length,
          dataProcessed: new Date().toISOString(),
          portfolioSummary: comprehensiveData.portfolioSummary
        })
      });

      res.json({ 
        message: "Excel file uploaded and processed successfully", 
        fileId: excelFile.id,
        filename: excelFile.filename,
        comprehensiveData: {
          propertiesLoaded: comprehensiveData.properties.length,
          cashFlowRecords: comprehensiveData.cashFlowData.length,
          balanceSheetRecords: comprehensiveData.balanceSheetData.length,
          rentRollRecords: comprehensiveData.rentRollData.length,
          t12Records: comprehensiveData.t12Data.length,
          portfolioSummary: comprehensiveData.portfolioSummary
        }
      });
      
    } catch (error) {
      console.error('Excel upload error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : String(error));
      res.status(500).json({ 
        message: "Failed to upload and process Excel file", 
        error: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Export endpoints
  app.get("/api/export/lender-package", async (req, res) => {
    try {
      const { portfolioKey = 'hartford1' } = req.query;
      
      // Get portfolio data
      const portfolio = await storage.getPortfolioByKey(portfolioKey as string);
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }

      const properties = await storage.getPropertiesByPortfolio(portfolio.id);
      const exportData = {
        portfolio,
        properties,
        exportDate: new Date().toISOString(),
        exportType: 'lender-package'
      };

      res.json(exportData);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate lender package", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/export/excel-data", async (req, res) => {
    try {
      const { portfolioKey = 'hartford1' } = req.query;
      
      // Get portfolio data
      const portfolio = await storage.getPortfolioByKey(portfolioKey as string);
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }

      const properties = await storage.getPropertiesByPortfolio(portfolio.id);
      const allGLAccounts = [];
      const allNotes = [];
      const allActionItems = [];

      for (const property of properties) {
        const glAccounts = await storage.getGLAccountsByProperty(property.id);
        const notes = await storage.getNotesByProperty(property.id);
        const actionItems = await storage.getActionItemsByProperty(property.id);
        
        allGLAccounts.push(...glAccounts.map(acc => ({ ...acc, propertyCode: property.code })));
        allNotes.push(...notes.map(note => ({ ...note, propertyCode: property.code })));
        allActionItems.push(...actionItems.map(item => ({ ...item, propertyCode: property.code })));
      }

      const exportData = {
        portfolio,
        properties,
        glAccounts: allGLAccounts,
        notes: allNotes,
        actionItems: allActionItems,
        exportDate: new Date().toISOString(),
        exportType: 'excel-data'
      };

      res.json(exportData);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate Excel export data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Manual GL Account Override (for correcting Excel data)
  app.post("/api/properties/:propertyId/gl-override", async (req, res) => {
    try {
      const { propertyId } = req.params;
      const { glAccounts } = req.body;
      
      // Clear existing GL accounts
      await storage.deleteGLAccountsByProperty(propertyId);
      
      // Add new GL accounts with correct data
      const currentMonth = "2024-01";
      const createdAccounts = [];
      
      for (const account of glAccounts) {
        const created = await storage.createGLAccount({
          propertyId,
          code: account.code,
          description: account.description,
          amount: account.amount,
          type: account.type,
          month: currentMonth
        });
        createdAccounts.push(created);
      }
      
      res.json({ 
        message: "GL accounts updated successfully", 
        accounts: createdAccounts 
      });
    } catch (error) {
      console.error("GL override error:", error);
      res.status(500).json({ message: "Failed to update GL accounts" });
    }
  });

  // Cell Comments Routes
  app.get("/api/cell-comments", async (req, res) => {
    try {
      const { propertyId, commentType } = req.query;
      
      let comments;
      if (propertyId) {
        comments = await storage.getCellCommentsByProperty(propertyId as string);
      } else if (commentType) {
        comments = await storage.getCellCommentsByType(commentType as string);
      } else {
        comments = await storage.getAllCellComments();
      }
      
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cell comments" });
    }
  });

  app.post("/api/cell-comments", async (req, res) => {
    try {
      const { propertyCode, cellReference, cellValue, tabSection, noteText, commentType, priority, actionRequired } = req.body;
      
      // Find property by code
      const property = await storage.getPropertyByCode(propertyCode);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Generate comment number
      const commentNumber = await storage.getNextCommentNumber(propertyCode);
      
      const comment = await storage.createCellComment({
        commentNumber,
        commentType: commentType || 'ACCOUNTING',
        cellReference,
        cellValue,
        propertyId: property.id,
        tabSection,
        noteText,
        actionRequired: actionRequired || false,
        priority: priority || 'MEDIUM',
        status: 'OPEN',
        author: 'User'
      });
      
      res.status(201).json(comment);
    } catch (error) {
      console.error("Cell comment creation error:", error);
      res.status(500).json({ message: "Failed to create cell comment" });
    }
  });

  app.patch("/api/cell-comments/:id", async (req, res) => {
    try {
      const updated = await storage.updateCellComment(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Cell comment not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update cell comment" });
    }
  });

  app.delete("/api/cell-comments/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCellComment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Cell comment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete cell comment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
