<template>
  <div class="dashboard">

    <!-- ── Left: location grid ───────────────────────────────── -->
    <section class="grid-section">

      <!-- ── Card filter bar ───────────────────────────────────── -->
      <div class="card-filter-bar">
        <div class="card-filter-group">
          <span class="cf-icon">⌖</span>
          <input
            v-model="cardFilters.location_code"
            class="cf-input"
            placeholder="Location code…"
            spellcheck="false"
          />
          <button
            v-if="cardFilters.location_code"
            class="cf-clear-x"
            @click="cardFilters.location_code = ''"
          >✕</button>
        </div>
        <div class="card-filter-group">
          <span class="cf-icon">◈</span>
          <input
            v-model="cardFilters.location_name"
            class="cf-input"
            placeholder="Location name…"
            spellcheck="false"
          />
          <button
            v-if="cardFilters.location_name"
            class="cf-clear-x"
            @click="cardFilters.location_name = ''"
          >✕</button>
        </div>
        <div class="card-filter-group">
          <span class="cf-icon">⊡</span>
          <input
            v-model="cardFilters.item_code"
            class="cf-input"
            placeholder="Item code…"
            spellcheck="false"
          />
          <button
            v-if="cardFilters.item_code"
            class="cf-clear-x"
            @click="cardFilters.item_code = ''"
          >✕</button>
        </div>
        <div class="card-filter-group">
          <span class="cf-icon">≡</span>
          <input
            v-model="cardFilters.item_name"
            class="cf-input"
            placeholder="Item name…"
            spellcheck="false"
          />
          <button
            v-if="cardFilters.item_name"
            class="cf-clear-x"
            @click="cardFilters.item_name = ''"
          >✕</button>
        </div>
        <button
          v-if="hasCardFilters"
          class="cf-reset-btn"
          @click="clearCardFilters"
        >Clear all</button>
        <span v-if="hasCardFilters" class="cf-result-count">
          {{ filteredLocations.length }} / {{ locations.length }}
        </span>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loadingLocations" class="card-grid">
        <div v-for="n in 8" :key="n" class="location-card skeleton-card">
          <div class="skeleton-line short" />
          <div class="skeleton-line long" />
          <div class="skeleton-line medium" />
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="filteredLocations.length === 0" class="empty-state">
        <span class="empty-icon">◫</span>
        <p v-if="hasCardFilters">No locations match your filters</p>
        <p v-else>No locations found</p>
      </div>

      <!-- Cards -->
      <TransitionGroup v-else name="card-fade" tag="div" class="card-grid">
        <div
          v-for="(loc, idx) in filteredLocations"
          :key="loc.id"
          class="location-card"
          :style="{ '--card-index': idx }"
          @click="openLocation(loc)"
        >
          <div class="card-accent" />
          <div class="card-body">
            <div class="card-code">{{ loc.location_code }}</div>
            <div class="card-name">{{ loc.location_name }}</div>
            <div class="card-footer">
              <span class="card-item-count" v-if="itemCounts[loc.location_code] !== undefined">
                {{ itemCounts[loc.location_code] }} item type{{ itemCounts[loc.location_code] !== 1 ? 's' : '' }}
              </span>
              <span class="card-item-count loading-dot" v-else>···</span>
              <span class="card-arrow">→</span>
            </div>
          </div>
        </div>
      </TransitionGroup>

      <!-- Pagination -->
      <div class="pagination-bar" v-if="totalLocations > pageSize">
        <button class="page-btn" :disabled="page <= 1" @click="page--; fetchLocations()">‹ Prev</button>
        <span class="page-info">{{ page }} / {{ totalPages }}</span>
        <button class="page-btn" :disabled="page >= totalPages" @click="page++; fetchLocations()">Next ›</button>
      </div>
    </section>

    <!-- ── Right: transaction log ─────────────────────────────── -->
    <aside class="log-section">
      <div class="log-header">
        <div class="log-title-row">
          <span class="log-title">Transaction Log</span>
          <span class="live-dot" :class="{ 'ws-connected': wsConnected }" title="Live updates" />
        </div>
        <Transition name="flash">
          <div v-if="newEntryFlash" class="new-entry-banner">
            <span class="banner-dot" />
            New transaction received
          </div>
        </Transition>
      </div>

      <div class="log-list" ref="logListEl">
        <div v-if="loadingLogs" class="log-skeleton-wrap">
          <div v-for="n in 5" :key="n" class="log-skeleton">
            <div class="skeleton-line short" style="width:30%" />
            <div class="skeleton-line long"  style="width:70%; margin-top:6px" />
          </div>
        </div>

        <div v-else-if="logs.length === 0" class="log-empty">No transactions yet</div>

        <TransitionGroup v-else name="log-entry" tag="div">
          <div
            v-for="(log, idx) in logs"
            :key="log.id"
            class="log-entry"
            :class="{ 'log-entry--new': idx === 0 && newEntryFlash, 'mode-take': log.mode === 'take', 'mode-put': log.mode === 'put' }"
          >
            <div class="log-entry-top">
              <span class="log-mode-badge" :class="log.mode">{{ log.mode.toUpperCase() }}</span>
              <span class="log-location">{{ log.location_code }}</span>
              <span class="log-time">{{ formatTime(log.created_at) }}</span>
            </div>
            <div class="log-items">
              <span v-for="item in log.items" :key="item.item_code" class="log-item-chip">
                <span class="log-item-code">{{ item.item_code }}</span>
                <span class="log-item-count">×{{ item.count }}</span>
              </span>
            </div>
            <div class="log-ip">{{ log.operator_ip }}</div>
          </div>
        </TransitionGroup>
      </div>
    </aside>

    <!-- ── Location Detail Dialog ─────────────────────────── -->
    <Dialog
      v-model:visible="dialogVisible"
      modal
      :draggable="false"
      :style="{ width: '860px', maxWidth: '96vw' }"
      class="location-dialog"
      @hide="resetDialog"
    >
      <template #header>
        <div class="dialog-header">
          <div class="dialog-title-block">
            <span class="dialog-code-badge">{{ selectedLocation?.location_code }}</span>
            <span class="dialog-title">{{ selectedLocation?.location_name }}</span>
          </div>
        </div>
      </template>

      <div class="filter-bar">
        <div class="filter-group">
          <label class="filter-label">Item Code</label>
          <InputText v-model="filters.item_code" placeholder="Filter by code…" class="filter-input" />
        </div>
        <div class="filter-group">
          <label class="filter-label">Item Name</label>
          <InputText v-model="filters.item_name" placeholder="Filter by name…" class="filter-input" />
        </div>
        <div class="filter-group">
          <label class="filter-label">Description</label>
          <InputText v-model="filters.description" placeholder="Filter by description…" class="filter-input" />
        </div>
        <button class="clear-btn" @click="clearFilters" v-if="hasActiveFilters">✕ Clear</button>
      </div>

      <div class="table-wrap">
        <DataTable
          :value="filteredItems"
          :loading="loadingItems"
          stripedRows
          scrollable
          scrollHeight="400px"
          class="items-table"
          :sortField="sortField"
          :sortOrder="sortOrder"
          @sort="onSort"
          :emptyMessage="loadingItems ? 'Loading…' : 'No items found'"
        >
          <Column field="item_code" header="Item Code" sortable style="min-width: 130px">
            <template #body="{ data }">
              <span class="code-cell">{{ data.item_code }}</span>
            </template>
          </Column>
          <Column field="item_name" header="Item Name" sortable style="min-width: 180px" />
          <Column field="description" header="Description" style="min-width: 200px">
            <template #body="{ data }">
              <span class="desc-cell">{{ data.description || '—' }}</span>
            </template>
          </Column>
          <Column field="qty" header="Qty" sortable style="min-width: 80px">
            <template #body="{ data }">
              <span class="qty-badge" :class="{ 'qty-zero': data.qty === 0 }">{{ data.qty }}</span>
            </template>
          </Column>
          <Column field="qty_taken" header="In Hand" sortable style="min-width: 90px">
            <template #body="{ data }">
              <span class="taken-badge" :class="{ 'taken-active': data.qty_taken > 0 }">{{ data.qty_taken }}</span>
            </template>
          </Column>
        </DataTable>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <span class="footer-count">
            Showing <strong>{{ filteredItems.length }}</strong> of <strong>{{ allItems.length }}</strong> items
          </span>
          <Button label="Close" severity="secondary" outlined @click="dialogVisible = false" class="close-btn" />
        </div>
      </template>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import Dialog    from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column    from 'primevue/column'
import InputText from 'primevue/inputtext'
import Button    from 'primevue/button'

// ── Config ────────────────────────────────────────────────────
const SERVER_BASE = 'http://localhost:3000'
const WS_URL      = 'ws://localhost:3000'

// ── Locations state ───────────────────────────────────────────
const locations        = ref([])
const totalLocations   = ref(0)
const loadingLocations = ref(true)
const page             = ref(1)
const pageSize         = ref(50)
const itemCounts       = ref({})

const totalPages = computed(() => Math.ceil(totalLocations.value / pageSize.value))

// ── All item-location rows (used for card filtering by item) ──
// Fetched once; also used to populate the dialog.
const allItemLocations = ref([])   // full flat list from /locations/item-locations

// ── Card filters ──────────────────────────────────────────────
const cardFilters = ref({ location_code: '', location_name: '', item_code: '', item_name: '' })

const hasCardFilters = computed(() =>
  cardFilters.value.location_code ||
  cardFilters.value.location_name ||
  cardFilters.value.item_code     ||
  cardFilters.value.item_name
)

// Set of location_codes that contain a matching item (for item-based filter)
const locationCodesWithMatchingItems = computed(() => {
  const fc = cardFilters.value.item_code.toLowerCase().trim()
  const fn = cardFilters.value.item_name.toLowerCase().trim()
  if (!fc && !fn) return null   // null = no item filter active

  const set = new Set()
  for (const row of allItemLocations.value) {
    const codeMatch = !fc || row.item_code?.toLowerCase().includes(fc)
    const nameMatch = !fn || row.item_name?.toLowerCase().includes(fn)
    if (codeMatch && nameMatch) set.add(row.location_code)
  }
  return set
})

const filteredLocations = computed(() => {
  if (!hasCardFilters.value) return locations.value

  const flc = cardFilters.value.location_code.toLowerCase().trim()
  const fln = cardFilters.value.location_name.toLowerCase().trim()
  const itemSet = locationCodesWithMatchingItems.value  // Set | null

  return locations.value.filter(loc => {
    if (flc && !loc.location_code.toLowerCase().includes(flc)) return false
    if (fln && !loc.location_name.toLowerCase().includes(fln)) return false
    if (itemSet !== null && !itemSet.has(loc.location_code))   return false
    return true
  })
})

function clearCardFilters() {
  cardFilters.value = { location_code: '', location_name: '', item_code: '', item_name: '' }
}

// ── Dialog state ──────────────────────────────────────────────
const dialogVisible    = ref(false)
const selectedLocation = ref(null)
const allItems         = ref([])
const loadingItems     = ref(false)

// ── Dialog filters ────────────────────────────────────────────
const filters = ref({ item_code: '', item_name: '', description: '' })
const hasActiveFilters = computed(() =>
  filters.value.item_code || filters.value.item_name || filters.value.description
)

// ── Sort ──────────────────────────────────────────────────────
const sortField = ref('item_code')
const sortOrder = ref(1)

// ── Filtered dialog items ─────────────────────────────────────
const filteredItems = computed(() => {
  let rows = allItems.value
  const fc = filters.value.item_code.toLowerCase().trim()
  const fn = filters.value.item_name.toLowerCase().trim()
  const fd = filters.value.description.toLowerCase().trim()
  if (fc) rows = rows.filter(r => r.item_code?.toLowerCase().includes(fc))
  if (fn) rows = rows.filter(r => r.item_name?.toLowerCase().includes(fn))
  if (fd) rows = rows.filter(r => (r.description || '').toLowerCase().includes(fd))
  return rows
})

// ── Transaction log state ─────────────────────────────────────
const logs          = ref([])
const loadingLogs   = ref(true)
const newEntryFlash = ref(false)
const logListEl     = ref(null)

// ── WebSocket state ───────────────────────────────────────────
const wsConnected     = ref(false)
let   ws              = null
let   wsReconnectTimer = null

// ── Fetch locations ───────────────────────────────────────────
async function fetchLocations() {
  loadingLocations.value = true
  try {
    const res  = await fetch(`${SERVER_BASE}/locations/list?page=${page.value}&limit=${pageSize.value}&sortField=location_code&sortOrder=asc`)
    const data = await res.json()
    if (data.success) {
      locations.value      = data.data
      totalLocations.value = data.total
    }
  } catch (e) { console.error('[fetchLocations]', e) }
  finally { loadingLocations.value = false }
}

// ── Fetch all item-location rows once ─────────────────────────
// Used for both card counts and card-level item filtering.
async function fetchAllItemLocations() {
  try {
    const res  = await fetch(`${SERVER_BASE}/locations/item-locations?page=1&limit=500&sortField=item_code&sortOrder=asc`)
    const data = await res.json()
    if (data.success) {
      allItemLocations.value = data.data
      // Build itemCounts map from fresh data
      const counts = {}
      for (const row of data.data) {
        counts[row.location_code] = (counts[row.location_code] || 0) + 1
      }
      itemCounts.value = counts
    }
  } catch (e) { console.error('[fetchAllItemLocations]', e) }
}

// ── Fetch logs ────────────────────────────────────────────────
async function fetchLogs(silent = false) {
  if (!silent) loadingLogs.value = true
  try {
    const res  = await fetch(`${SERVER_BASE}/locations/logs?page=1&limit=50&sortField=created_at&sortOrder=desc`)
    const data = await res.json()
    if (data.success) {
      const incoming = data.data
      if (!silent) {
        logs.value = incoming
      } else if (incoming.length > 0 && (logs.value.length === 0 || incoming[0].id !== logs.value[0].id)) {
        logs.value = incoming
        triggerNewEntryFlash()
      }
    }
  } catch (e) { console.error('[fetchLogs]', e) }
  finally { loadingLogs.value = false }
}

// ── New entry flash ───────────────────────────────────────────
let flashTimer = null
function triggerNewEntryFlash() {
  newEntryFlash.value = true
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { newEntryFlash.value = false }, 3000)
  nextTick(() => { if (logListEl.value) logListEl.value.scrollTop = 0 })
}

// ── WebSocket ─────────────────────────────────────────────────
function connectWS() {
  try {
    ws = new WebSocket(WS_URL)
    ws.onopen  = () => { wsConnected.value = true; clearTimeout(wsReconnectTimer) }
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'refresh') {
          fetchLogs(true)
          fetchAllItemLocations()
        }
      } catch { /* ignore */ }
    }
    ws.onclose = () => { wsConnected.value = false; wsReconnectTimer = setTimeout(connectWS, 3000) }
    ws.onerror = () => ws.close()
  } catch (e) { wsReconnectTimer = setTimeout(connectWS, 3000) }
}

// ── Open location dialog ──────────────────────────────────────
async function openLocation(loc) {
  selectedLocation.value = loc
  dialogVisible.value    = true
  loadingItems.value     = true
  clearFilters()
  // Reuse already-fetched allItemLocations — no extra call needed
  allItems.value = allItemLocations.value.filter(r => r.location_code === loc.location_code)
  loadingItems.value = false
}

function clearFilters() {
  filters.value = { item_code: '', item_name: '', description: '' }
}

function onSort(e) {
  sortField.value = e.sortField
  sortOrder.value = e.sortOrder
}

function resetDialog() {
  selectedLocation.value = null
  allItems.value         = []
  clearFilters()
}

// ── Time formatter ────────────────────────────────────────────
function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const diffMin = Math.floor((Date.now() - d) / 60000)
  if (diffMin < 1)  return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)   return `${diffH}h ago`
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

// ── Init ──────────────────────────────────────────────────────
onMounted(() => {
  fetchLocations()
  fetchAllItemLocations()
  fetchLogs()
  connectWS()
})

onUnmounted(() => {
  clearTimeout(wsReconnectTimer)
  clearTimeout(flashTimer)
  if (ws) ws.close()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

/* ── Tokens ──────────────────────────────────────────────────── */
:root {
  --c-bg:         #0e0f14;
  --c-surface:    #15161e;
  --c-surface-2:  #1c1e2a;
  --c-border:     #272a38;
  --c-accent:     #e8ff47;
  --c-text:       #e8eaf0;
  --c-text-muted: #6b6f85;
  --c-text-dim:   #3d4058;
  --c-green:      #3dffa0;
  --c-orange:     #ff8c42;
  --c-red:        #ff4d6d;
  --c-take:       #ff6b6b;
  --c-put:        #3dffa0;
  --font-mono:    'Space Mono', monospace;
  --font-sans:    'DM Sans', sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Dashboard shell ──────────────────────────────────────────── */
.dashboard {
  min-height: 100vh;
  background: var(--c-bg);
  font-family: var(--font-sans);
  color: var(--c-text);
  display: flex;
  align-items: flex-start;
  background-image:
    radial-gradient(ellipse 60% 50% at 20% 10%, rgba(232,255,71,0.04) 0%, transparent 70%),
    radial-gradient(ellipse 40% 30% at 80% 80%, rgba(61,255,160,0.03) 0%, transparent 60%);
}

/* ── Grid section ────────────────────────────────────────────── */
.grid-section {
  flex: 1 1 0;
  min-width: 0;
  padding: 24px 24px 60px;
}

/* ══════════════════════════════════════════════════════════════
   Card filter bar
══════════════════════════════════════════════════════════════ */
.card-filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.card-filter-group {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  padding: 0 10px;
  flex: 1;
  min-width: 140px;
  max-width: 220px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.card-filter-group:focus-within {
  border-color: var(--c-accent);
  box-shadow: 0 0 0 2px rgba(232,255,71,0.1);
}

.cf-icon {
  font-size: 13px;
  color: var(--c-text-dim);
  flex-shrink: 0;
  margin-right: 7px;
  line-height: 1;
  transition: color 0.15s;
  pointer-events: none;
  user-select: none;
}
.card-filter-group:focus-within .cf-icon { color: var(--c-accent); }

.cf-input {
  flex: 1;
  min-width: 0;
  height: 36px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--c-text);
  font-family: var(--font-sans);
  font-size: 13px;
  caret-color: var(--c-accent);
}
.cf-input::placeholder { color: var(--c-text-dim); }

.cf-clear-x {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--c-text-dim);
  font-size: 11px;
  padding: 2px 0 2px 4px;
  line-height: 1;
  transition: color 0.15s;
}
.cf-clear-x:hover { color: var(--c-red); }

.cf-reset-btn {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  padding: 0 14px;
  height: 36px;
  background: transparent;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  color: var(--c-text-muted);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: border-color 0.15s, color 0.15s;
}
.cf-reset-btn:hover { border-color: var(--c-red); color: var(--c-red); }

.cf-result-count {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--c-text-muted);
  white-space: nowrap;
  flex-shrink: 0;
  padding: 0 4px;
}

/* ── Card grid ───────────────────────────────────────────────── */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 14px;
}

/* TransitionGroup for card filter */
.card-fade-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.card-fade-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.card-fade-enter-from   { opacity: 0; transform: scale(0.97); }
.card-fade-leave-to     { opacity: 0; transform: scale(0.97); }

/* ── Location card ───────────────────────────────────────────── */
.location-card {
  position: relative;
  background: var(--c-surface);
  border-width: 1px;
  border-style: solid;
  border-color: rgb(221, 218, 218);
  border-radius: 15px;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  animation: cardIn 0.35s ease both;
  animation-delay: calc(var(--card-index) * 0.04s);
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.location-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px var(--c-accent);
  border-color: var(--c-accent);
}
.location-card:hover .card-accent  { opacity: 1; transform: scaleX(1); }
.location-card:hover .card-arrow   { transform: translateX(4px); color: var(--c-accent); }
.location-card:active              { transform: translateY(-1px); }

.card-accent {
  position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, var(--c-accent), var(--c-green));
  opacity: 0; transform: scaleX(0.4); transform-origin: left;
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.card-body   { padding: 18px 16px 14px; }
.card-code   { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; color: var(--c-accent); text-transform: uppercase; margin-bottom: 5px; }
.card-name   { font-size: 14px; font-weight: 600; color: var(--c-text); line-height: 1.3; margin-bottom: 14px; min-height: 36px; }
.card-footer { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--c-border); padding-top: 10px; }
.card-item-count { font-size: 11px; color: var(--c-text-muted); font-family: var(--font-mono); }
.loading-dot { letter-spacing: 0.3em; animation: pulse 1.2s ease-in-out infinite; }
.card-arrow  { font-size: 14px; color: var(--c-text-dim); transition: transform 0.18s ease, color 0.18s ease; }

/* ── Skeleton ────────────────────────────────────────────────── */
.skeleton-card { pointer-events: none; padding: 18px 16px; min-height: 115px; }
.skeleton-line {
  height: 9px;
  background: linear-gradient(90deg, var(--c-surface-2) 25%, var(--c-border) 50%, var(--c-surface-2) 75%);
  background-size: 200% 100%;
  border-radius: 4px; margin-bottom: 9px;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.skeleton-line.short  { width: 38%; }
.skeleton-line.long   { width: 78%; }
.skeleton-line.medium { width: 55%; }

/* ── Empty ───────────────────────────────────────────────────── */
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 0; color: var(--c-text-muted); }
.empty-icon  { font-size: 48px; }

/* ── Pagination ──────────────────────────────────────────────── */
.pagination-bar { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 32px; }
.page-btn {
  font-family: var(--font-mono); font-size: 12px; padding: 7px 16px;
  background: var(--c-surface-2); border: 1px solid var(--c-border);
  border-radius: 6px; color: var(--c-text); cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.page-btn:hover:not(:disabled) { border-color: var(--c-accent); color: var(--c-accent); }
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.page-info { font-family: var(--font-mono); font-size: 12px; color: var(--c-text-muted); }

@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }

/* ══════════════════════════════════════════════════════════════
   Transaction Log Sidebar
══════════════════════════════════════════════════════════════ */
.log-section {
  width: 300px; flex-shrink: 0; min-height: 100vh;
  border-left: 1px solid var(--c-border); background: var(--c-surface);
  display: flex; flex-direction: column;
  position: sticky; top: 0; height: 100vh; overflow: hidden;
}
.log-header { padding: 18px 16px 0; border-bottom: 1px solid var(--c-border); flex-shrink: 0; }
.log-title-row { display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; }
.log-title { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--c-text-muted); font-weight: 700; }

.live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c-text-dim); transition: background 0.3s; flex-shrink: 0; }
.live-dot.ws-connected { background: var(--c-green); box-shadow: 0 0 6px var(--c-green); animation: livePulse 2s ease-in-out infinite; }
@keyframes livePulse { 0%, 100% { box-shadow: 0 0 4px var(--c-green); } 50% { box-shadow: 0 0 10px var(--c-green), 0 0 20px rgba(61,255,160,0.3); } }

.new-entry-banner { display: flex; align-items: center; gap: 8px; background: rgba(232,255,71,0.08); border: 1px solid rgba(232,255,71,0.25); border-radius: 6px; padding: 7px 10px; margin-bottom: 12px; font-size: 11px; color: var(--c-accent); font-family: var(--font-mono); letter-spacing: 0.04em; }
.banner-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--c-accent); animation: blink 0.6s ease-in-out infinite alternate; flex-shrink: 0; }
@keyframes blink { from { opacity: 1; } to { opacity: 0.2; } }

.flash-enter-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.flash-leave-active { transition: opacity 0.4s ease, transform 0.4s ease; }
.flash-enter-from   { opacity: 0; transform: translateY(-6px); }
.flash-leave-to     { opacity: 0; transform: translateY(-4px); }

.log-list { flex: 1; overflow-y: auto; padding: 12px 0; }
.log-list::-webkit-scrollbar       { width: 4px; }
.log-list::-webkit-scrollbar-track { background: transparent; }
.log-list::-webkit-scrollbar-thumb { background: var(--c-border); border-radius: 2px; }
.log-empty { text-align: center; padding: 40px 16px; font-size: 12px; color: var(--c-text-dim); font-family: var(--font-mono); }

.log-entry { padding: 11px 16px; border-bottom: 1px solid var(--c-border); transition: background 0.2s; position: relative; }
.log-entry::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 0 2px 2px 0; background: var(--c-border); transition: background 0.2s; }
.log-entry.mode-take::before { background: var(--c-take); }
.log-entry.mode-put::before  { background: var(--c-put); }
.log-entry--new { animation: entryHighlight 2s ease forwards; }
@keyframes entryHighlight { 0% { background: rgba(232,255,71,0.12); } 100% { background: transparent; } }

.log-entry-enter-active { transition: all 0.3s ease; }
.log-entry-leave-active { transition: all 0.25s ease; position: absolute; width: 100%; }
.log-entry-enter-from   { opacity: 0; transform: translateY(-12px); }
.log-entry-leave-to     { opacity: 0; transform: translateY(-8px); }

.log-entry-top { display: flex; align-items: center; gap: 7px; margin-bottom: 7px; }
.log-mode-badge { font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: 0.1em; padding: 2px 6px; border-radius: 3px; flex-shrink: 0; }
.log-mode-badge.take { background: rgba(255,107,107,0.15); color: var(--c-take); border: 1px solid rgba(255,107,107,0.3); }
.log-mode-badge.put  { background: rgba(61,255,160,0.12); color: var(--c-put); border: 1px solid rgba(61,255,160,0.25); }
.log-location { font-family: var(--font-mono); font-size: 11px; color: var(--c-text); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.log-time     { font-size: 10px; color: var(--c-text-dim); white-space: nowrap; flex-shrink: 0; }

.log-items { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px; }
.log-item-chip { display: inline-flex; align-items: center; gap: 3px; background: var(--c-surface-2); border: 1px solid var(--c-border); border-radius: 4px; padding: 2px 7px; }
.log-item-code  { font-family: var(--font-mono); font-size: 10px; color: var(--c-text); }
.log-item-count { font-family: var(--font-mono); font-size: 10px; color: var(--c-text-muted); }
.log-ip { font-size: 10px; color: var(--c-text-dim); font-family: var(--font-mono); }

.log-skeleton-wrap { padding: 8px 0; }
.log-skeleton      { padding: 12px 16px; border-bottom: 1px solid var(--c-border); }

/* ══════════════════════════════════════════════════════════════
   Dialog
══════════════════════════════════════════════════════════════ */
:deep(.location-dialog .p-dialog) { background: var(--c-surface) !important; border: 1px solid var(--c-border) !important; border-radius: 12px !important; box-shadow: 0 24px 80px rgba(0,0,0,0.7) !important; font-family: var(--font-sans) !important; }
:deep(.location-dialog .p-dialog-header) { background: var(--c-surface) !important; border-bottom: 1px solid var(--c-border) !important; padding: 16px 24px !important; border-radius: 12px 12px 0 0 !important; }
:deep(.location-dialog .p-dialog-header-close) { color: var(--c-text-muted) !important; width: 28px !important; height: 28px !important; border-radius: 6px !important; }
:deep(.location-dialog .p-dialog-header-close:hover) { background: var(--c-surface-2) !important; color: var(--c-text) !important; }
:deep(.location-dialog .p-dialog-content) { background: var(--c-surface) !important; padding: 24px !important; color: var(--c-text) !important; }
:deep(.location-dialog .p-dialog-footer) { background: var(--c-surface) !important; border-top: 1px solid var(--c-border) !important; padding: 12px 24px !important; border-radius: 0 0 12px 12px !important; }
:deep(.p-dialog-mask) { background: rgba(0,0,0,0.65) !important; backdrop-filter: blur(4px) !important; }

.dialog-header      { display: flex; align-items: center; gap: 12px; }
.dialog-title-block { display: flex; align-items: center; gap: 10px; }
.dialog-code-badge  { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.1em; color: var(--c-bg); background: var(--c-accent); padding: 3px 8px; border-radius: 3px; font-weight: 700; text-transform: uppercase; white-space: nowrap; }
.dialog-title       { font-size: 16px; font-weight: 600; color: var(--c-text); }

/* ── Dialog filter bar ───────────────────────────────────────── */
.filter-bar   { display: flex; gap: 12px; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; }
.filter-group { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 150px; }
.filter-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--c-text-muted); font-family: var(--font-mono); }

:deep(.filter-input.p-inputtext) { background: var(--c-surface-2) !important; border: 1px solid var(--c-border) !important; border-radius: 6px !important; color: var(--c-text) !important; padding: 8px 12px !important; font-size: 13px !important; transition: border-color 0.15s !important; width: 100% !important; font-family: var(--font-sans) !important; }
:deep(.filter-input.p-inputtext:focus) { border-color: var(--c-accent) !important;  }
:deep(.filter-input.p-inputtext::placeholder) { color: var(--c-text-dim) !important; }

.clear-btn { font-family: var(--font-mono); font-size: 11px; padding: 8px 14px; background: transparent; border: 1px solid var(--c-border); border-radius: 6px; color: var(--c-text-muted); cursor: pointer; white-space: nowrap; align-self: flex-end; transition: border-color 0.15s, color 0.15s; height: 36px; }
.clear-btn:hover { border-color: var(--c-red); color: var(--c-red); }

/* ── DataTable ───────────────────────────────────────────────── */
.table-wrap { border: 1px solid var(--c-border); border-radius: 8px; overflow: hidden; }
:deep(.items-table .p-datatable-table-container) { background: var(--c-surface) !important; }
:deep(.items-table .p-datatable-thead > tr > th) { background: var(--c-surface-2) !important; border-bottom: 1px solid var(--c-border) !important; border-right: none !important; color: var(--c-text-muted) !important; font-family: var(--font-mono) !important; font-size: 10px !important; letter-spacing: 0.1em !important; text-transform: uppercase !important; padding: 10px 14px !important; font-weight: 400 !important; }
:deep(.items-table .p-datatable-thead > tr > th:hover) { background: var(--c-border) !important; color: var(--c-text) !important; }
:deep(.items-table .p-sortable-column-icon) { color: var(--c-text-dim) !important; font-size: 10px !important; }
:deep(.items-table .p-datatable-tbody > tr > td) { background: transparent !important; border-bottom: 1px solid var(--c-border) !important; border-right: none !important; color: var(--c-text) !important; font-size: 13px !important; padding: 10px 14px !important; }
:deep(.items-table .p-datatable-tbody > tr:last-child > td) { border-bottom: none !important; }
:deep(.items-table .p-datatable-striped .p-datatable-tbody > tr:nth-child(even) > td) { background: rgba(255,255,255,0.015) !important; }
:deep(.items-table .p-datatable-tbody > tr:hover > td) { background: rgba(232,255,71,0.04) !important; }
:deep(.items-table .p-datatable-emptymessage td) { color: var(--c-text-muted) !important; text-align: center !important; padding: 40px !important; font-size: 13px !important; }
:deep(.items-table .p-datatable-loading-overlay) { background: rgba(14,15,20,0.7) !important; }

.code-cell  { font-family: var(--font-mono); font-size: 12px; color: var(--c-accent); letter-spacing: 0.05em; }
.desc-cell  { color: var(--c-text-muted); font-size: 12px; }

.qty-badge  { display: inline-block; font-family: var(--font-mono); font-size: 12px; font-weight: 700; min-width: 36px; text-align: center; padding: 2px 8px; border-radius: 4px; background: rgba(61,255,160,0.1); color: var(--c-green); border: 1px solid rgba(61,255,160,0.2); }
.qty-badge.qty-zero { background: rgba(255,77,109,0.1); color: var(--c-red); border-color: rgba(255,77,109,0.2); }
.taken-badge { display: inline-block; font-family: var(--font-mono); font-size: 12px; font-weight: 700; min-width: 36px; text-align: center; padding: 2px 8px; border-radius: 4px; background: rgba(255,255,255,0.04); color: var(--c-text-muted); border: 1px solid var(--c-border); }
.taken-badge.taken-active { background: rgba(255,140,66,0.12); color: var(--c-orange); border-color: rgba(255,140,66,0.25); }

.dialog-footer { display: flex; align-items: center; justify-content: space-between; width: 100%; }
.footer-count  { font-size: 12px; color: var(--c-text-muted); font-family: var(--font-mono); }
.footer-count strong { color: var(--c-text); }

:deep(.close-btn.p-button) { background: transparent !important; border-color: var(--c-border) !important; color: var(--c-text-muted) !important; font-size: 13px !important; padding: 7px 18px !important; border-radius: 6px !important; transition: border-color 0.15s, color 0.15s !important; }
:deep(.close-btn.p-button:hover) { border-color: var(--c-text-muted) !important; color: var(--c-text) !important; background: var(--c-surface-2) !important; }

:deep(.p-datatable-table-container::-webkit-scrollbar)       { width: 6px; height: 6px; }
:deep(.p-datatable-table-container::-webkit-scrollbar-track) { background: var(--c-surface); }
:deep(.p-datatable-table-container::-webkit-scrollbar-thumb) { background: var(--c-border); border-radius: 3px; }
:deep(.p-datatable-table-container::-webkit-scrollbar-thumb:hover) { background: var(--c-text-dim); }

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 900px) {
  .dashboard   { flex-direction: column; }
  .log-section { width: 100%; height: auto; min-height: 320px; border-left: none; border-top: 1px solid var(--c-border); position: static; }
  .card-grid   { grid-template-columns: 1fr 1fr; }
  .card-filter-bar { gap: 6px; }
  .card-filter-group { max-width: unset; }
}
@media (max-width: 560px) {
  .grid-section { padding: 16px 12px 40px; }
  .card-grid    { grid-template-columns: 1fr; gap: 10px; }
  .card-filter-bar { flex-direction: column; }
  .card-filter-group { max-width: unset; width: 100%; }
  .filter-bar   { flex-direction: column; }
  .filter-group { min-width: unset; width: 100%; }
}
</style>