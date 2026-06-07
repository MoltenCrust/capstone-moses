<!-- frontend/src/views/Locations.vue -->
<template>
  <div class="p-4">
    <div class="flex align-items-center justify-content-between mb-4">
      <h2 class="text-xl font-semibold m-0">Locations</h2>
    </div>

    <DataTable
      v-model:editingRows="editingRows"
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
      editMode="row"
      dataKey="id"
      @page="onPage"
      @sort="onSort"
      @row-edit-save="onRowEditSave"
      showGridlines
      style="font-size: 12px;"
      :pt="{
        column: {
          bodycell: ({ state }: any) => ({
            style: state['d_editing'] && 'padding-top: 0.5rem; padding-bottom: 0.5rem'
          })
        }
      }"
    >
      <template #empty>
        <div class="text-center py-6 text-color-secondary">No records found.</div>
      </template>

      <template #loading>
        <div class="text-center py-6 text-color-secondary">Loading data…</div>
      </template>

      <Column field="location_code" header="Location Code" sortable style="width: 220px">
        <template #editor="{ data, field }">
          <InputText v-model="data[field]" fluid size="small" />
        </template>
      </Column>

      <Column field="location_name" header="Location Name" sortable>
        <template #editor="{ data, field }">
          <InputText v-model="data[field]" fluid size="small" />
        </template>
      </Column>

      <Column :rowEditor="true" style="width: 6rem" bodyStyle="text-align: center" />
    </DataTable>

    <div v-if="error" class="mt-3 text-red-500 text-sm">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable, {
  type DataTablePageEvent,
  type DataTableSortEvent,
  type DataTableRowEditSaveEvent,
} from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';

const API_BASE = 'http://localhost:3000';

interface LocationRow {
  id:            number;
  location_code: string;
  location_name: string;
}

// ── Props ─────────────────────────────────────────────────────
const props = defineProps<{ refreshTick: number }>();

const toast = useToast();

// ── State ─────────────────────────────────────────────────────
const rows        = ref<LocationRow[]>([]);
const editingRows = ref<LocationRow[]>([]);
const loading     = ref(false);
const error       = ref<string | null>(null);

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
    const url = `${API_BASE}/locations/list`
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

// ── Row edit save → PUT /locations/:id ───────────────────────
async function onRowEditSave(event: DataTableRowEditSaveEvent) {
  const { newData, index } = event;
  try {
    const res  = await fetch(`${API_BASE}/locations/${newData.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        location_code: newData.location_code,
        location_name: newData.location_name,
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message ?? 'Update failed');

    // Apply the change locally so the table updates instantly
    rows.value[index] = { ...newData };
    toast.add({ severity: 'secondary', summary: 'Saved', detail: 'Location updated', life: 3000 });
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Save failed', detail: err.message, life: 4000 });
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