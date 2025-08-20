import { Request, Response, Router } from 'express';
import { IStorage } from './storage';
import { insertNoteSchema, insertActionItemSchema } from '@shared/schema';

export function createRoutes(storage: IStorage): Router {
  const router = Router();

  // Get all properties
  router.get('/api/properties', async (req: Request, res: Response) => {
    try {
      const properties = await storage.getProperties();
      res.json(properties);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch properties' });
    }
  });

  // Get property by ID
  router.get('/api/properties/:id', async (req: Request, res: Response) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch property' });
    }
  });

  // Get GL accounts for a property
  router.get('/api/properties/:id/gl-accounts', async (req: Request, res: Response) => {
    try {
      const glAccounts = await storage.getGlAccountsByProperty(req.params.id);
      res.json(glAccounts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch GL accounts' });
    }
  });

  // Get notes for a property
  router.get('/api/properties/:id/notes', async (req: Request, res: Response) => {
    try {
      const notes = await storage.getNotesByProperty(req.params.id);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch notes' });
    }
  });

  // Create a note
  router.post('/api/notes', async (req: Request, res: Response) => {
    try {
      const validatedNote = insertNoteSchema.parse(req.body);
      const note = await storage.createNote(validatedNote);
      res.status(201).json(note);
    } catch (error) {
      res.status(400).json({ error: 'Invalid note data' });
    }
  });

  // Get all action items
  router.get('/api/action-items', async (req: Request, res: Response) => {
    try {
      const actionItems = await storage.getActionItems();
      res.json(actionItems);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch action items' });
    }
  });

  // Create an action item
  router.post('/api/action-items', async (req: Request, res: Response) => {
    try {
      const validatedActionItem = insertActionItemSchema.parse(req.body);
      const actionItem = await storage.createActionItem(validatedActionItem);
      res.status(201).json(actionItem);
    } catch (error) {
      res.status(400).json({ error: 'Invalid action item data' });
    }
  });

  return router;
}