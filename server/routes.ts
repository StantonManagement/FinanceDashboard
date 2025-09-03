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
  
  // Test Supabase connection
  app.get("/api/test-supabase", async (req, res) => {
    try {
      console.log('🔵 Testing Supabase connection...');
      
      // Test basic connection
      const { data, error } = await supabase
        .from('AF_Investments_export')
        .select('"Asset ID"')
        .limit(1);
      
      if (error) {
        console.error('❌ Supabase connection failed:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Supabase connection failed', 
          error: error.message 
        });
      }
      
      console.log('✅ Supabase connection successful');
      res.json({ 
        success: true, 
        message: 'Supabase connection working', 
        sampleData: data 
      });
    } catch (error) {
      console.error('❌ Connection test error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Connection test failed', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Balance Sheet Routes (MUST be before :assetId routes to avoid conflicts)
  app.get("/api/balance-sheet/:assetId", async (req, res) => {
    console.log(`🔵 Balance Sheet API called for asset: ${req.params.assetId}`);
    
    try {
      const { assetId } = req.params;
      
      console.log('📊 Querying AF_Investments_export for asset:', assetId);
      
      // First, get the proper asset name from AF_Investments_export
      const { data: assetData, error: assetError } = await supabase
        .from('AF_Investments_export')
        .select('"Asset ID", "Asset ID + Name"')
        .eq('"Asset ID"', assetId)
        .single();
      
      console.log('📊 Asset lookup result:', { assetData, assetError });
      
      if (assetError) {
        console.error('❌ Asset lookup error:', assetError);
        return res.status(500).json({ 
          message: "Database error while looking up asset", 
          error: assetError.message,
          details: assetError 
        });
      }
      
      if (!assetData) {
        console.error('❌ Asset not found:', assetId);
        return res.status(404).json({ message: "Asset ID not found in investments data" });
      }
      
      const assetColumnName = assetData['Asset ID + Name'];
      console.log('📊 Asset column name:', assetColumnName);
      
      // First, let's try different table names to see which one exists
      console.log('📊 Testing different table name variations...');
      
      // Try AF_Balance (case sensitive)
      let balanceSheetData: any = null;
      let error: any = null;
      try {
        console.log('📊 Trying AF_Balance...');
        const result = await supabase.from('AF_Balance').select('*').limit(1);
        console.log('📊 AF_Balance result:', { count: result.data?.length, error: result.error?.message });
        
        if (!result.error && result.data?.length === 0) {
          console.log('📊 AF_Balance table exists but is empty, trying full query...');
          const fullResult = await supabase.from('AF_Balance').select('*');
          balanceSheetData = fullResult.data;
          error = fullResult.error;
          console.log('📊 Full AF_Balance query:', { count: fullResult.data?.length, error: fullResult.error?.message });
        } else if (!result.error) {
          const fullResult = await supabase.from('AF_Balance').select('*');
          balanceSheetData = fullResult.data;
          error = fullResult.error;
        } else {
          // Table doesn't exist or has permission issues, try lowercase
          console.log('📊 AF_Balance failed, trying af_balance...');
          const lowerResult = await supabase.from('af_balance').select('*').limit(1);
          console.log('📊 af_balance result:', { count: lowerResult.data?.length, error: lowerResult.error?.message });
          
          if (!lowerResult.error) {
            const fullResult = await supabase.from('af_balance').select('*');
            balanceSheetData = fullResult.data;
            error = fullResult.error;
          } else {
            balanceSheetData = result.data;
            error = result.error;
          }
        }
      } catch (e) {
        console.error('📊 Exception during table check:', e);
        error = e;
      }
      
      console.log('📊 Final balance sheet query result:', { 
        recordCount: balanceSheetData?.length, 
        error: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        firstRowColumns: balanceSheetData?.[0] ? Object.keys(balanceSheetData[0]).slice(0, 5) : []
      });
      
      if (error) {
        console.error('❌ Balance sheet query error:', error);
        return res.status(500).json({ 
          message: "Database error while querying balance sheet", 
          error: error.message,
          details: error 
        });
      }
      
      // Verify the column exists in AF_Balance
      if (!balanceSheetData || balanceSheetData.length === 0) {
        console.error('❌ No balance sheet data found');
        return res.status(404).json({ message: "No balance sheet data available" });
      }
      
      if (!(assetColumnName in balanceSheetData[0])) {
        console.error('❌ Asset column not found in balance sheet:', assetColumnName);
        console.log('📊 Available columns:', Object.keys(balanceSheetData[0]));
        return res.status(404).json({ 
          message: `Balance sheet column '${assetColumnName}' not found`,
          availableColumns: Object.keys(balanceSheetData[0]).filter(col => col.includes('S'))
        });
      }
      
      // Process the balance sheet data
      const processedData = {
        assetId,
        assetColumn: assetColumnName,
        assets: {} as Record<string, any>,
        liabilities: {} as Record<string, any>,
        equity: {} as Record<string, any>,
        rawData: [] as any[]
      };
      
      let currentSection = '';
      
      balanceSheetData.forEach((row: any) => {
        const accountName = row['Account Name'];
        const value = row[assetColumnName];
        
        if (!accountName) return;
        
        // Track sections
        if (accountName === 'ASSETS') {
          currentSection = 'assets';
        } else if (accountName === 'LIABILITIES') {
          currentSection = 'liabilities';
        } else if (accountName === 'EQUITY') {
          currentSection = 'equity';
        }
        
        // Parse monetary values
        const cleanValue = value?.toString().replace(/[(),\s]/g, '').replace(/,/g, '') || '0';
        const numericValue = parseFloat(cleanValue) || 0;
        const isNegative = value?.toString().includes('(');
        const finalValue = isNegative ? -Math.abs(numericValue) : numericValue;
        
        const item = {
          accountName,
          value: value?.toString().trim() || '',
          numericValue: finalValue,
          section: currentSection
        };
        
        processedData.rawData.push(item);
        
        // Categorize into sections
        if (currentSection === 'assets' && accountName !== 'ASSETS') {
          processedData.assets[accountName] = item;
        } else if (currentSection === 'liabilities' && accountName !== 'LIABILITIES') {
          processedData.liabilities[accountName] = item;
        } else if (currentSection === 'equity' && accountName !== 'EQUITY') {
          processedData.equity[accountName] = item;
        }
      });
      
      console.log('✅ Balance sheet data processed successfully');
      res.json(processedData);
    } catch (error) {
      console.error('❌ Unexpected error in balance sheet API:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        message: "Failed to fetch balance sheet data", 
        error: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      });
    }
  });

  // Combined Asset and Balance Sheet Data
  app.get("/api/asset-complete/:assetId", async (req, res) => {
    try {
      const { assetId } = req.params;
      
      // Get investment data
      const { data: investmentData, error: invError } = await supabase
        .from('AF_Investments_export')
        .select('*')
        .eq('"Asset ID"', assetId)
        .single();
      
      if (invError || !investmentData) {
        return res.status(404).json({ message: "Asset not found in investments data" });
      }
      
      // Get balance sheet data using the Asset ID + Name as column
      const assetColumnName = investmentData['Asset ID + Name'];
      const { data: balanceSheetData, error: balanceError } = await supabase
        .from('AF_Balance')
        .select('*');
      
      let processedBalanceSheet = null;
      
      if (!balanceError && balanceSheetData?.[0] && assetColumnName in balanceSheetData[0]) {
        const assets: Record<string, any> = {};
        const liabilities: Record<string, any> = {};
        const equity: Record<string, any> = {};
        let currentSection = '';
        
        balanceSheetData.forEach(row => {
          const accountName = row['Account Name'];
          const value = row[assetColumnName];
          
          if (!accountName) return;
          
          if (accountName === 'ASSETS') currentSection = 'assets';
          else if (accountName === 'LIABILITIES') currentSection = 'liabilities';
          else if (accountName === 'EQUITY') currentSection = 'equity';
          
          const cleanValue = value?.toString().replace(/[(),\s]/g, '').replace(/,/g, '') || '0';
          const numericValue = parseFloat(cleanValue) || 0;
          const isNegative = value?.toString().includes('(');
          const finalValue = isNegative ? -Math.abs(numericValue) : numericValue;
          
          const item = { accountName, value: value?.toString().trim() || '', numericValue: finalValue };
          
          if (currentSection === 'assets' && accountName !== 'ASSETS') assets[accountName] = item;
          else if (currentSection === 'liabilities' && accountName !== 'LIABILITIES') liabilities[accountName] = item;
          else if (currentSection === 'equity' && accountName !== 'EQUITY') equity[accountName] = item;
        });
        
        processedBalanceSheet = { assetId, assetColumn: assetColumnName, assets, liabilities, equity };
      }
      
      res.json({
        assetId,
        investment: investmentData,
        balanceSheet: processedBalanceSheet,
        hasBalanceSheet: !!processedBalanceSheet
      });
      
    } catch (error) {
      console.error('Error fetching complete asset data:', error);
      res.status(500).json({ message: "Failed to fetch complete asset data", error: error instanceof Error ? error.message : String(error) });
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

  // Enhanced Asset Lookup - Get detailed property information
  app.get("/api/assets/:assetId/details", async (req, res) => {
    console.log('🔵 HIT /api/assets/:assetId/details endpoint with assetId:', req.params.assetId);
    try {
      const { assetId } = req.params;
      
      // Get comprehensive property data from investments table
      const { data: property, error } = await supabase
        .from('investments')
        .select('*')
        .eq('asset_id', assetId)
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        if (error.code === 'PGRST116') {
          return res.status(404).json({ message: "Asset not found" });
        }
        throw error;
      }
      
      // Structure the response with organized data
      const assetDetails = {
        basic: {
          assetId: property.asset_id,
          name: property.asset_id_plus_name,
          portfolio: property.portfolio_name,
          address: property.address_full,
          propertyType: property.property_type,
          units: property.units,
          manager: property.manager,
          ownerLLC: property.owner_llc
        },
        financial: {
          noi: property.noi,
          proformaRevenue: property.proforma_revenue,
          egi: property.egi,
          operatingExpenses: property.proforma_operating_expenses,
          capRate: property.going_in_cap_rate,
          debtService: property.debt_service,
          ltvRatio: property.ltv_ratio,
          dscRatio: property.dsv_ratio
        },
        expenses: {
          propertyTax: property.exp_tax_prop,
          insurance: property.exp_prop_ins,
          utilities: property.exp_utilities,
          maintenance: property.exp_rm,
          payroll: property.exp_payroll,
          garbage: property.exp_garbage,
          managementFee: property.exp_pm_fee_admin
        },
        property: {
          built: property.built,
          renovated: property.renovated_last,
          buildingSF: property.building_sf,
          landSF: property.land_sf,
          stories: property.stories,
          roofType: property.roof_type,
          heatType: property.heat_type,
          acIncluded: property.ac_included,
          parkingSpots: property.parking_spots_count
        }
      };
      
      res.json(assetDetails);
    } catch (error) {
      console.error('Error fetching asset details:', error);
      res.status(500).json({ message: "Failed to fetch asset details", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Asset Expense Lookup - Get expenses by category and time period
  app.get("/api/assets/:assetId/expenses", async (req, res) => {
    console.log('🔵 HIT /api/assets/:assetId/expenses endpoint with assetId:', req.params.assetId);
    try {
      const { assetId } = req.params;
      const { category, month, year, startDate, endDate } = req.query;
      
      console.log('Query params:', { category, month, year, startDate, endDate });
      
      // First, try to get data from AF_GeneralLedger table if it exists
      let query = supabase
        .from('AF_GeneralLedger')
        .select('*');

      // Find property by asset ID first to get PropertyId
      const { data: property, error: propError } = await supabase
        .from('investments')
        .select('id, asset_id')
        .eq('asset_id', assetId)
        .single();
        
      if (propError || !property) {
        // Fallback: return current static expense data from investments table
        console.log('Property not found or GL table not available, returning static data');
        
        const { data: investmentData, error: invError } = await supabase
          .from('investments')
          .select('asset_id, asset_id_plus_name, exp_tax_prop, exp_prop_ins, exp_utilities, exp_rm, exp_payroll, exp_garbage, exp_pm_fee_admin')
          .eq('asset_id', assetId)
          .single();
          
        if (invError) {
          return res.status(404).json({ message: "Asset not found" });
        }
        
        // Create mock time-based data for demonstration
        const currentYear = new Date().getFullYear();
        const expenseCategories = [
          { category: 'Property Tax', amount: investmentData.exp_tax_prop || 0, code: 'tax' },
          { category: 'Insurance', amount: investmentData.exp_prop_ins || 0, code: 'insurance' },
          { category: 'Utilities', amount: investmentData.exp_utilities || 0, code: 'utilities' },
          { category: 'Maintenance', amount: investmentData.exp_rm || 0, code: 'maintenance' },
          { category: 'Payroll', amount: investmentData.exp_payroll || 0, code: 'payroll' },
          { category: 'Garbage', amount: investmentData.exp_garbage || 0, code: 'garbage' },
          { category: 'Management Fee', amount: investmentData.exp_pm_fee_admin || 0, code: 'management' },
          { category: 'Landscaping', amount: (investmentData.exp_rm || 0) * 0.15, code: 'landscaping' } // 15% of maintenance
        ];
        
        // Filter by category if specified
        let filteredExpenses = expenseCategories;
        if (category && category !== 'all' && typeof category === 'string') {
          filteredExpenses = expenseCategories.filter(exp => 
            exp.code.toLowerCase().includes(category.toLowerCase()) ||
            exp.category.toLowerCase().includes(category.toLowerCase())
          );
        }
        
        // Generate monthly breakdown (mock data)
        const expenseHistory = filteredExpenses.map(expense => ({
          assetId: investmentData.asset_id,
          assetName: investmentData.asset_id_plus_name,
          category: expense.category,
          categoryCode: expense.code,
          amount: expense.amount,
          year: year ? parseInt(year as string) : currentYear,
          month: month ? parseInt(month as string) : null,
          monthName: month ? new Date(0, parseInt(month as string) - 1).toLocaleDateString('en', {month: 'long'}) : null,
          date: year && month ? `${year}-${month.toString().padStart(2, '0')}-01` : `${currentYear}-01-01`,
          description: `${expense.category} expense for ${investmentData.asset_id_plus_name}`
        }));
        
        const response = {
          assetId: investmentData.asset_id,
          assetName: investmentData.asset_id_plus_name,
          expenses: expenseHistory,
          totalAmount: filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
          query: { category, month, year, startDate, endDate },
          dataSource: 'static' // Indicates this is from investments table, not time-series data
        };
        
        return res.json(response);
      }
      
      // If we have property data, try to query GL table (this would work when AppFolio data is available)
      console.log('Found property, querying GL data...');
      query = query.eq('PropertyId', property.id);
      
      // Apply time filters
      if (year) {
        query = query.eq('Year', parseInt(year as string));
      }
      if (month) {
        query = query.eq('Month', parseInt(month as string));
      }
      if (startDate && endDate) {
        query = query.gte('PostDate', startDate).lte('PostDate', endDate);
      }
      
      // Apply category filter
      if (category && category !== 'all') {
        query = query.ilike('GlAccountName', `%${category}%`);
      }
      
      const { data: expenses, error } = await query;
      
      if (error) {
        console.error('GL query error:', error);
        throw error;
      }
      
      const response = {
        assetId,
        expenses: expenses || [],
        totalAmount: (expenses || []).reduce((sum, exp) => sum + (exp.Amount || 0), 0),
        query: { category, month, year, startDate, endDate },
        dataSource: 'appfolio'
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching asset expenses:', error);
      res.status(500).json({ message: "Failed to fetch asset expenses", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Asset Search - Search assets by various criteria
  app.get("/api/assets/search", async (req, res) => {
    console.log('🔵 HIT /api/assets/search endpoint');
    try {
      const { q, portfolio, propertyType, minUnits, maxUnits } = req.query;
      
      let query = supabase
        .from('investments')
        .select('asset_id, asset_id_plus_name, portfolio_name, property_type, address, units, noi, proforma_revenue');
      
      // Apply search filters
      if (q) {
        query = query.or(`asset_id.ilike.%${q}%,asset_id_plus_name.ilike.%${q}%,address.ilike.%${q}%`);
      }
      
      if (portfolio && portfolio !== 'all') {
        query = query.ilike('portfolio_name', `%${portfolio}%`);
      }
      
      if (propertyType && propertyType !== 'all') {
        query = query.ilike('property_type', `%${propertyType}%`);
      }
      
      if (minUnits) {
        query = query.gte('units', parseInt(minUnits as string));
      }
      
      if (maxUnits) {
        query = query.lte('units', parseInt(maxUnits as string));
      }
      
      query = query.order('asset_id').limit(50);
      
      const { data: assets, error } = await query;
      
      if (error) {
        console.error('Asset search error:', error);
        throw error;
      }
      
      res.json({
        assets: assets || [],
        count: assets?.length || 0,
        query: { q, portfolio, propertyType, minUnits, maxUnits }
      });
    } catch (error) {
      console.error('Error searching assets:', error);
      res.status(500).json({ message: "Failed to search assets", error: error instanceof Error ? error.message : String(error) });
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
