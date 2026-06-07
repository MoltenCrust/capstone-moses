// src/routes/location.route.ts

import { Router } from 'express';
import {
  validateLocation,
  getItemQty,
  commitItems,
  listItemLocations,
  listLocations,
  listLogs,
  editLocation,
} from '../controllers/location.controller';

const router = Router();

// GET  /locations/validate-location?location_code=XXX
router.get('/validate-location', validateLocation);

// GET  /locations/item-qty?location_code=XXX&item_code=YYY
router.get('/item-qty', getItemQty);

// POST /locations/commit
router.post('/commit', commitItems);

// GET  /locations/item-locations?page=1&limit=10&sortField=qty&sortOrder=desc
router.get('/item-locations', listItemLocations);

// GET  /locations/list?page=1&limit=10&sortField=location_code&sortOrder=asc
router.get('/list', listLocations);

// GET  /locations/logs?page=1&limit=10&sortField=created_at&sortOrder=desc
router.get('/logs', listLogs);

// PUT  /locations/:id
router.put('/:id', editLocation);

export default router;