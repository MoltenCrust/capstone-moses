// src/app.ts

import express from 'express';
import cors from 'cors';
import locationRoutes from './routes/location.route';
import { listItems, editItem, getItemQtyTaken } from './controllers/location.controller';

const app = express();

app.use(cors());
app.use(express.json());

// ── Health ────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── Routes ────────────────────────────────────────────────────
app.use('/locations', locationRoutes);

// GET /items/list?page=1&limit=10&sortField=item_code&sortOrder=asc
app.get('/items/list', listItems);

// GET /items/qty-taken?item_code=YYY
// Used by ESP32 in PUT mode — returns global qty_taken from item_list
app.get('/items/qty-taken', getItemQtyTaken);

// PUT /items/:id
app.put('/items/:id', editItem);

// ── Request logger ────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length) console.log('[Body]', req.body);
  next();
});

export default app;