// src/controllers/location.controller.ts

import { Request, Response } from 'express';
import {
  findLocationByCode,
  findItemByCode,
  getItemQtyAtLocation,
  getItemQtyTakenByCode,
  commitTransaction,
  insertTransactionLog,
  getItemLocations,
  getItems,
  getLocations,
  getLogs,
  updateLocation,
  updateItem,
  CommitItem,
} from '../services/location.service';
import { broadcast } from '../server';

// ── GET /locations/validate-location?location_code=XXX ────────
export async function validateLocation(req: Request, res: Response) {
  const location_code = (req.query.location_code as string)?.trim();

  if (!location_code) {
    res.status(400).json({ success: false, message: 'location_code is required' });
    return;
  }

  const location = await findLocationByCode(location_code);
  if (!location) {
    res.status(404).json({ success: false, message: `Location '${location_code}' not found` });
    return;
  }

  res.json({
    success:       true,
    location_code: location.location_code,
    location_name: location.location_name,
  });
}

// ── GET /locations/item-qty?location_code=XXX&item_code=YYY ───
// Used by ESP32 in TAKE mode.
// Returns qty at the given location + global qty_taken from item_list.
export async function getItemQty(req: Request, res: Response) {
  const location_code = (req.query.location_code as string)?.trim();
  const item_code     = (req.query.item_code     as string)?.trim();

  if (!location_code || !item_code) {
    res.status(400).json({ success: false, message: 'location_code and item_code are required' });
    return;
  }

  const location = await findLocationByCode(location_code);
  if (!location) {
    res.status(404).json({ success: false, message: `Location '${location_code}' not found` });
    return;
  }

  const item = await findItemByCode(item_code);
  if (!item) {
    res.status(404).json({ success: false, message: `Item '${item_code}' not found` });
    return;
  }

  const result = await getItemQtyAtLocation(location_code, item_code);
  if (!result) {
    res.status(404).json({
      success: false,
      message: `No record found for item '${item_code}' at location '${location_code}'`,
    });
    return;
  }

  res.json({
    success:       true,
    item_code:     result.item_code,
    item_name:     result.item_name,
    location_code: result.location_code,
    location_name: result.location_name,
    qty:           result.qty,
    qty_taken:     result.qty_taken, // from item_list (global)
  });
}

// ── GET /items/qty-taken?item_code=YYY ────────────────────────
// Used by ESP32 in PUT mode.
// Returns global qty_taken from item_list — no location needed.
export async function getItemQtyTaken(req: Request, res: Response) {
  const item_code = (req.query.item_code as string)?.trim();

  if (!item_code) {
    res.status(400).json({ success: false, message: 'item_code is required' });
    return;
  }

  const result = await getItemQtyTakenByCode(item_code);
  if (!result) {
    res.status(404).json({ success: false, message: `Item '${item_code}' not found` });
    return;
  }

  res.json({
    success:   true,
    item_code: result.item_code,
    item_name: result.item_name,
    qty_taken: result.qty_taken,
  });
}

// ── POST /locations/commit ────────────────────────────────────
export async function commitItems(req: Request, res: Response) {
  const { mode, location_code, items } = req.body;

  if (!mode || !location_code || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, message: 'mode, location_code and items are required' });
    return;
  }

  if (mode !== 'take' && mode !== 'put') {
    res.status(400).json({ success: false, message: 'mode must be take or put' });
    return;
  }

  const location = await findLocationByCode(location_code);
  if (!location) {
    res.status(404).json({ success: false, message: `Location '${location_code}' not found` });
    return;
  }

  for (const { item_code } of items as CommitItem[]) {
    const item = await findItemByCode(item_code);
    if (!item) {
      res.status(404).json({ success: false, message: `Item '${item_code}' not found` });
      return;
    }
  }

  const forwarded = req.headers['x-forwarded-for'];
  const operator_ip = (
    (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim()
    ?? req.socket.remoteAddress
    ?? 'unknown'
  );

  try {
    await commitTransaction(location_code, mode, items as CommitItem[]);
    await insertTransactionLog(operator_ip, mode, location_code, items as CommitItem[]);
    broadcast({ type: 'refresh', location_code, mode });
    res.json({ success: true, message: `${mode} committed for ${items.length} item(s)` });
  } catch (err: any) {
    console.error('[commitItems]', err);
    res.status(500).json({ success: false, message: 'DB error: ' + err.message });
  }
}

// ── PUT /locations/:id ────────────────────────────────────────
export async function editLocation(req: Request, res: Response) {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ success: false, message: 'Invalid id' });
    return;
  }

  const { location_code, location_name } = req.body;
  if (!location_code?.trim() || !location_name?.trim()) {
    res.status(400).json({ success: false, message: 'location_code and location_name are required' });
    return;
  }

  try {
    const updated = await updateLocation(id, location_code.trim(), location_name.trim());
    if (!updated) {
      res.status(404).json({ success: false, message: `Location id ${id} not found` });
      return;
    }
    res.json({ success: true, message: 'Location updated' });
  } catch (err: any) {
    console.error('[editLocation]', err);
    res.status(500).json({ success: false, message: 'DB error: ' + err.message });
  }
}

// ── PUT /items/:id ────────────────────────────────────────────
export async function editItem(req: Request, res: Response) {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ success: false, message: 'Invalid id' });
    return;
  }

  const { item_code, item_name, description } = req.body;
  if (!item_code?.trim() || !item_name?.trim()) {
    res.status(400).json({ success: false, message: 'item_code and item_name are required' });
    return;
  }

  try {
    const updated = await updateItem(
      id,
      item_code.trim(),
      item_name.trim(),
      description?.trim() ?? null
    );
    if (!updated) {
      res.status(404).json({ success: false, message: `Item id ${id} not found` });
      return;
    }
    res.json({ success: true, message: 'Item updated' });
  } catch (err: any) {
    console.error('[editItem]', err);
    res.status(500).json({ success: false, message: 'DB error: ' + err.message });
  }
}

// ── GET /locations/item-locations ─────────────────────────────
export async function listItemLocations(req: Request, res: Response) {
  const page      = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit     = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const sortField = (req.query.sortField as string)?.trim() || 'id';
  const sortOrder = (req.query.sortOrder as string)?.trim() === 'desc' ? 'desc' : 'asc';

  try {
    const result = await getItemLocations(page, limit, sortField, sortOrder);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[listItemLocations]', err);
    res.status(500).json({ success: false, message: 'DB error: ' + err.message });
  }
}

// ── GET /items/list ───────────────────────────────────────────
export async function listItems(req: Request, res: Response) {
  const page      = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit     = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const sortField = (req.query.sortField as string)?.trim() || 'id';
  const sortOrder = (req.query.sortOrder as string)?.trim() === 'desc' ? 'desc' : 'asc';

  try {
    const result = await getItems(page, limit, sortField, sortOrder);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[listItems]', err);
    res.status(500).json({ success: false, message: 'DB error: ' + err.message });
  }
}

// ── GET /locations/list ───────────────────────────────────────
export async function listLocations(req: Request, res: Response) {
  const page      = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit     = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const sortField = (req.query.sortField as string)?.trim() || 'id';
  const sortOrder = (req.query.sortOrder as string)?.trim() === 'desc' ? 'desc' : 'asc';

  try {
    const result = await getLocations(page, limit, sortField, sortOrder);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[listLocations]', err);
    res.status(500).json({ success: false, message: 'DB error: ' + err.message });
  }
}

// ── GET /locations/logs ───────────────────────────────────────
export async function listLogs(req: Request, res: Response) {
  const page      = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit     = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const sortField = (req.query.sortField as string)?.trim() || 'created_at';
  const sortOrder = (req.query.sortOrder as string)?.trim() === 'asc' ? 'asc' : 'desc';

  try {
    const result = await getLogs(page, limit, sortField, sortOrder);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[listLogs]', err);
    res.status(500).json({ success: false, message: 'DB error: ' + err.message });
  }
}