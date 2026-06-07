// src/services/location.service.ts

import pool from '../config/db';

export interface ItemLocationResult {
  item_code:     string;
  item_name:     string;
  location_code: string;
  location_name: string;
  qty:           number;
  qty_taken:     number; // sourced from item_list (global per item)
}

// ── Validate that a location_code exists ──────────────────────
export async function findLocationByCode(location_code: string) {
  const [rows]: any = await pool.query(
    'SELECT id, location_code, location_name FROM location WHERE location_code = ? LIMIT 1',
    [location_code]
  );
  return rows.length > 0 ? rows[0] : null;
}

// ── Validate that an item_code exists ────────────────────────
export async function findItemByCode(item_code: string) {
  const [rows]: any = await pool.query(
    'SELECT id, item_code, item_name FROM item_list WHERE item_code = ? LIMIT 1',
    [item_code]
  );
  return rows.length > 0 ? rows[0] : null;
}

// ── Get global qty_taken for an item (from item_list) ─────────
export async function getItemQtyTakenByCode(item_code: string) {
  const [rows]: any = await pool.query(
    `SELECT item_code, item_name, qty_taken
     FROM item_list
     WHERE item_code = ?
     LIMIT 1`,
    [item_code]
  );
  return rows.length > 0 ? rows[0] : null;
}

// ── Update a location row by id ───────────────────────────────
export async function updateLocation(
  id:            number,
  location_code: string,
  location_name: string
): Promise<boolean> {
  const [result]: any = await pool.query(
    'UPDATE location SET location_code = ?, location_name = ? WHERE id = ?',
    [location_code, location_name, id]
  );
  return result.affectedRows > 0;
}

// ── Update an item row by id ──────────────────────────────────
export async function updateItem(
  id:          number,
  item_code:   string,
  item_name:   string,
  description: string | null
): Promise<boolean> {
  const [result]: any = await pool.query(
    'UPDATE item_list SET item_code = ?, item_name = ?, description = ? WHERE id = ?',
    [item_code, item_name, description ?? null, id]
  );
  return result.affectedRows > 0;
}

// ── Commit a batch of take/put rows in a single transaction ───
export interface CommitItem {
  item_code: string;
  count:     number;
}

export async function commitTransaction(
  location_code: string,
  mode:          'take' | 'put',
  items:         CommitItem[]
): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const { item_code, count } of items) {
      if (mode === 'take') {
        // Decrement qty at source location
        await conn.query(
          `UPDATE item_location iloc
           INNER JOIN item_list il ON iloc.item_id     = il.id
           INNER JOIN location  l  ON iloc.location_id = l.id
           SET iloc.qty = iloc.qty - ?
           WHERE l.location_code = ?
             AND il.item_code    = ?`,
          [count, location_code, item_code]
        );

        // Increment global qty_taken on item_list
        await conn.query(
          `UPDATE item_list
           SET qty_taken = qty_taken + ?
           WHERE item_code = ?`,
          [count, item_code]
        );

      } else {
        // PUT: decrement global qty_taken on item_list
        await conn.query(
          `UPDATE item_list
           SET qty_taken = qty_taken - ?
           WHERE item_code = ?`,
          [count, item_code]
        );

        // Upsert item_location at destination location:
        //   row exists     → qty += count
        //   row not exists → INSERT with qty = count
        await conn.query(
          `INSERT INTO item_location (item_id, location_id, qty)
           SELECT il.id, l.id, ?
           FROM item_list il
           CROSS JOIN location l
           WHERE il.item_code    = ?
             AND l.location_code = ?
           ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)`,
          [count, item_code, location_code]
        );
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ── Insert a transaction log entry ────────────────────────────
export async function insertTransactionLog(
  operator_ip:   string,
  mode:          'take' | 'put',
  location_code: string,
  items:         CommitItem[]
): Promise<void> {
  await pool.query(
    `INSERT INTO transaction_log (operator_ip, mode, location_code, items)
     VALUES (?, ?, ?, ?)`,
    [operator_ip, mode, location_code, JSON.stringify(items)]
  );
}

// ── Get qty at location + global qty_taken from item_list ─────
export async function getItemQtyAtLocation(
  location_code: string,
  item_code:     string
): Promise<ItemLocationResult | null> {
  const [rows]: any = await pool.query(
    `SELECT
       il.item_code,
       il.item_name,
       l.location_code,
       l.location_name,
       iloc.qty,
       il.qty_taken
     FROM item_location iloc
     INNER JOIN item_list il ON iloc.item_id     = il.id
     INNER JOIN location  l  ON iloc.location_id = l.id
     WHERE l.location_code = ?
       AND il.item_code    = ?
     LIMIT 1`,
    [location_code, item_code]
  );
  return rows.length > 0 ? rows[0] : null;
}

// ── Shared paginated result type ──────────────────────────────
export interface PaginatedResult<T> {
  data:      T[];
  total:     number;
  page:      number;
  limit:     number;
  sortField: string;
  sortOrder: 'asc' | 'desc';
}

// ── Allowed sort columns for item_location ────────────────────
const SORTABLE_COLUMNS: Record<string, string> = {
  item_code:     'il.item_code',
  item_name:     'il.item_name',
  description:   'il.description',
  location_code: 'l.location_code',
  location_name: 'l.location_name',
  qty:           'iloc.qty',
  qty_taken:     'il.qty_taken',
};

export interface ItemLocationRow {
  id:            number;
  item_code:     string;
  item_name:     string;
  description:   string | null;
  location_code: string;
  location_name: string;
  qty:           number;
  qty_taken:     number; // global, from item_list
}

export async function getItemLocations(
  page:      number,
  limit:     number,
  sortField: string = 'id',
  sortOrder: 'asc' | 'desc' = 'asc'
): Promise<PaginatedResult<ItemLocationRow>> {
  const offset   = (page - 1) * limit;
  const orderCol = SORTABLE_COLUMNS[sortField] ?? 'iloc.id';
  const orderDir = sortOrder === 'desc' ? 'DESC' : 'ASC';

  const [[{ total }]]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM item_location`
  );

  const [rows]: any = await pool.query(
    `SELECT
       iloc.id,
       il.item_code,
       il.item_name,
       il.description,
       l.location_code,
       l.location_name,
       iloc.qty,
       il.qty_taken
     FROM item_location iloc
     INNER JOIN item_list il ON iloc.item_id     = il.id
     INNER JOIN location  l  ON iloc.location_id = l.id
     ORDER BY ${orderCol} ${orderDir}
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  return { data: rows, total, page, limit, sortField, sortOrder };
}

// ── Allowed sort columns for item_list ───────────────────────
const ITEM_SORTABLE_COLUMNS: Record<string, string> = {
  item_code:   'item_code',
  item_name:   'item_name',
  description: 'description',
  qty_taken:   'qty_taken',
};

export interface ItemRow {
  id:          number;
  item_code:   string;
  item_name:   string;
  description: string | null;
  qty_taken:   number; // now lives on item_list
}

export async function getItems(
  page:      number,
  limit:     number,
  sortField: string = 'id',
  sortOrder: 'asc' | 'desc' = 'asc'
): Promise<PaginatedResult<ItemRow>> {
  const offset   = (page - 1) * limit;
  const orderCol = ITEM_SORTABLE_COLUMNS[sortField] ?? 'id';
  const orderDir = sortOrder === 'desc' ? 'DESC' : 'ASC';

  const [[{ total }]]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM item_list`
  );

  const [rows]: any = await pool.query(
    `SELECT id, item_code, item_name, description, qty_taken
     FROM item_list
     ORDER BY ${orderCol} ${orderDir}
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  return { data: rows, total, page, limit, sortField, sortOrder };
}

// ── Allowed sort columns for location ────────────────────────
const LOCATION_SORTABLE_COLUMNS: Record<string, string> = {
  location_code: 'location_code',
  location_name: 'location_name',
};

export interface LocationRow {
  id:            number;
  location_code: string;
  location_name: string;
}

export async function getLocations(
  page:      number,
  limit:     number,
  sortField: string = 'id',
  sortOrder: 'asc' | 'desc' = 'asc'
): Promise<PaginatedResult<LocationRow>> {
  const offset   = (page - 1) * limit;
  const orderCol = LOCATION_SORTABLE_COLUMNS[sortField] ?? 'id';
  const orderDir = sortOrder === 'desc' ? 'DESC' : 'ASC';

  const [[{ total }]]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM location`
  );

  const [rows]: any = await pool.query(
    `SELECT id, location_code, location_name
     FROM location
     ORDER BY ${orderCol} ${orderDir}
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  return { data: rows, total, page, limit, sortField, sortOrder };
}

// ── Allowed sort columns for transaction_log ─────────────────
const LOG_SORTABLE_COLUMNS: Record<string, string> = {
  operator_ip:   'operator_ip',
  mode:          'mode',
  location_code: 'location_code',
  created_at:    'created_at',
};

export interface TransactionLogRow {
  id:            number;
  operator_ip:   string;
  mode:          'take' | 'put';
  location_code: string;
  items:         CommitItem[];
  created_at:    string;
}

export async function getLogs(
  page:      number,
  limit:     number,
  sortField: string = 'created_at',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<PaginatedResult<TransactionLogRow>> {
  const offset   = (page - 1) * limit;
  const orderCol = LOG_SORTABLE_COLUMNS[sortField] ?? 'created_at';
  const orderDir = sortOrder === 'desc' ? 'DESC' : 'ASC';

  const [[{ total }]]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM transaction_log`
  );

  const [rows]: any = await pool.query(
    `SELECT id, operator_ip, mode, location_code, items, created_at
     FROM transaction_log
     ORDER BY ${orderCol} ${orderDir}
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  const data: TransactionLogRow[] = rows.map((r: any) => ({
    ...r,
    items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
  }));

  return { data, total, page, limit, sortField, sortOrder };
}