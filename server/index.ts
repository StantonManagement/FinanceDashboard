import express from 'express';
import cors from 'cors';
import { MemStorage } from './storage';
import { createRoutes } from './routes';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize storage
const storage = new MemStorage();

// Routes
app.use(createRoutes(storage));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});