<!-- frontend/src/views/TransactionLog.vue -->
<template>
  <div class="p-4">
    <div class="flex align-items-center justify-content-between mb-4">
      <h2 class="text-xl font-semibold m-0">Transaction Log</h2>
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

      <Column field="created_at" header="Timestamp" sortable style="width:180px">
        <template #body="{ data }">
          {{ formatDate(data.created_at) }}
        </template>
      </Column>

      <Column field="operator_ip" header="Operator IP" sortable style="width:150px" />

      <Column field="mode" header="Mode" sortable style="width:90px">
        <template #body="{ data }">
          <span
            class="px-2 py-1 border-round text-xs font-semibold"
            :style="data.mode === 'take'
              ? 'background:#fee2e2; color:#b91c1c'
              : 'background:#dcfce7; color:#15803d'"
          >
            {{ data.mode.toUpperCase() }}
          </span>
        </template>
      </Column>

      <Column field="location_code" header="Location" sortable style="width:150px" />

      <Column header="Items">
        <template #body="{ data }">
          <div class="flex flex-wrap gap-1">
            <span
              v-for="item in data.items"
              :key="item.item_code"
              class="px-2 py-1 border-round text-xs"
              style="background: var(--surface-100); border: 1px solid var(--surface-300);"
            >
              {{ item.item_code }} × {{ item.count }}
            </span>
          </div>
        </template>
      </Column>
    </DataTable>

    <div v-if="error" class="mt-3 text-red-500 text-sm">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import DataTable, { type DataTablePageEvent, type DataTableSortEvent } from 'primevue/datatable';
import Column from 'primevue/column';

const API_BASE = 'http://localhost:3000';

interface LogItem {
  item_code: string;
  count:     number;
}

interface TransactionLogRow {
  id:            number;
  operator_ip:   string;
  mode:          'take' | 'put';
  location_code: string;
  items:         LogItem[];
  created_at:    string;
}

// ── Props ─────────────────────────────────────────────────────
const props = defineProps<{ refreshTick: number }>();

// ── State ─────────────────────────────────────────────────────
const rows    = ref<TransactionLogRow[]>([]);
const loading = ref(false);
const error   = ref<string | null>(null);

const pagination = reactive({ total: 0 });

const sort = reactive({
  page:  1,
  limit: 10,
  field: 'created_at',
  order: -1 as 1 | -1,
});

// ── Helpers ───────────────────────────────────────────────────
function formatDate(raw: string): string {
  if (!raw) return '—';
  return new Date(raw).toLocaleString();
}

// ── Fetch ─────────────────────────────────────────────────────
async function fetchData() {
  loading.value = true;
  error.value   = null;
  try {
    const sortOrder = sort.order === 1 ? 'asc' : 'desc';
    const url = `${API_BASE}/locations/logs`
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

// ── React to WS refresh from App.vue ─────────────────────────
watch(() => props.refreshTick, () => fetchData());

// ── Lifecycle ─────────────────────────────────────────────────
onMounted(fetchData);
</script>