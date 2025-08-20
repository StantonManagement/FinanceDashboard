import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertNoteSchema, insertActionItemSchema, insertExcelFileSchema } from "@shared/schema";

const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Accept Excel files only
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'), false);
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
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
      res.status(400).json({ message: "Invalid note data", error: error });
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
      res.status(400).json({ message: "Invalid note data", error: error });
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
      res.status(400).json({ message: "Invalid action item data", error: error });
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
      res.status(400).json({ message: "Invalid action item data", error: error });
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
      if (!req.file) {
        return res.status(400).json({ message: "No Excel file uploaded" });
      }

      const excelFile = await storage.createExcelFile({
        filename: req.file.originalname,
        processedData: null // Will be processed by frontend
      });

      res.json({ 
        message: "Excel file uploaded successfully", 
        fileId: excelFile.id,
        filename: excelFile.filename,
        fileBuffer: req.file.buffer.toString('base64')
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload Excel file", error: error });
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
      res.status(500).json({ message: "Failed to generate lender package", error: error });
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
      res.status(500).json({ message: "Failed to generate Excel export data", error: error });
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

  const httpServer = createServer(app);
  return httpServer;
}
