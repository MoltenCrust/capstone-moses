<!-- frontend/src/views/ItemLocation.vue -->
<template>
  <div class="p-4">
    <div class="flex align-items-center justify-content-between mb-4">
      <h2 class="text-xl font-semibold m-0">Item Locations</h2>
    </div>

    <DataTable
      :value="rows"
      :loading="loading"
      lazy
      paginator
      :rows="sort.limit"
      :totalRecords="pagination.total"
      :rowsPerPageOptions="[10, 25, 50]"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
      :sortField="sort.field"
      :sortOrder="sort.order"
      @page="onPage"
      @sort="onSort"
      showGridlines
      style="font-size: 12px;"
    >
      <template #empty>
        <div class="text-center py-6 text-color-secondary">No records found.</div>
      </template>

      <template #loading>
        <div class="text-center py-6 text-color-secondary">Loading data…</div>
      </template>

      <Column field="item_code"     header="Item Code"     sortable style="width:150px" />
      <Column field="item_name"     header="Item Name"     sortable style="width:300px" />
      <Column field="description"   header="Description"   sortable>
        <template #body="{ data }">{{ data.description ?? '—' }}</template>
      </Column>
      <Column field="location_code" header="Location Code" sortable />
      <Column field="location_name" header="Location Name" sortable />
      <Column field="qty"           header="Qty"           sortable style="width:110px" />
      <Column field="qty_taken"     header="Qty Taken"     sortable style="width:110px" />
    </DataTable>

    <div v-if="error" class="mt-3 text-red-500 text-sm">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import DataTable, { type DataTablePageEvent, type DataTableSortEvent } from 'primevue/datatable';
import Column from 'primevue/column';

const API_BASE = 'http://localhost:3000';
const WS_URL   = 'ws://localhost:3000';

interface ItemLocationRow {
  id:            number;
  item_code:     string;
  item_name:     string;
  description:   string | null;
  location_code: string;
  location_name: string;
  qty:           number;
  qty_taken:     number;
}

// ── Emits ─────────────────────────────────────────────────────
const emit = defineEmits<{ (e: 'ws-status', value: boolean): void }>();

// ── State ─────────────────────────────────────────────────────
const rows    = ref<ItemLocationRow[]>([]);
const loading = ref(false);
const error   = ref<string | null>(null);

const pagination = reactive({ total: 0 });

const sort = reactive({
  page:  1,
  limit: 10,
  field: 'id',
  order: 1 as 1 | -1,
});

// ── Fetch ─────────────────────────────────────────────────────
async function fetchData() {
  loading.value = true;
  error.value   = null;
  try {
    const sortOrder = sort.order === 1 ? 'asc' : 'desc';
    const url = `${API_BASE}/locations/item-locations`
      + `?page=${sort.page}&limit=${sort.limit}`
      + `&sortField=${sort.field}&sortOrder=${sortOrder}`;

    const res  = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.message ?? 'Unknown error');

    rows.value       = json.data;
    pagination.total = json.total;
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

// ── PrimeVue lazy event handlers ──────────────────────────────
function onPage(event: DataTablePageEvent) {
  sort.page  = event.page + 1;
  sort.limit = event.rows;
  fetchData();
}

function onSort(event: DataTableSortEvent) {
  const field = typeof event.sortField === 'string' ? event.sortField : sort.field;
  sort.field = field;
  sort.order = (event.sortOrder === -1 ? -1 : 1);
  sort.page  = 1;
  fetchData();
}

// ── WebSocket with auto-reconnect ─────────────────────────────
let ws: WebSocket | null = null;
let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

function connectWS() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    emit('ws-status', true);
    console.log('[WS] connected');
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'refresh') fetchData();
    } catch {
      // ignore malformed messages
    }
  };

  ws.onclose = () => {
    emit('ws-status', false);
    console.log('[WS] disconnected — reconnecting in 3s');
    wsReconnectTimer = setTimeout(connectWS, 3000);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

// ── Lifecycle ─────────────────────────────────────────────────
onMounted(() => {
  fetchData();
  connectWS();
});

onUnmounted(() => {
  if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
  ws?.close();
});
</script>