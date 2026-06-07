<!-- frontend/src/App.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';
import ItemLocation   from './views/ItemLocation.vue';
import Items          from './views/Items.vue';
import Locations      from './views/Locations.vue';
import TransactionLog from './views/TransactionLog.vue';
import Navbar         from './components/Navbar.vue';
import Dashboard      from './views/Dashboard.vue';

const API_BASE = 'http://localhost:3000';
const WS_URL   = 'ws://localhost:3000';

const toast       = useToast();
const wsConnected = ref(false);
const currentView = ref('item-locations');

// ── Refresh tick — incrementing tells the active view to re-fetch
const refreshTick = ref(0);
function triggerRefresh() { refreshTick.value++; }

// ── Fetch latest log entry and fire toast ─────────────────────
async function notifyFromLog() {
  try {
    const res  = await fetch(
      `${API_BASE}/locations/logs?page=1&limit=1&sortField=created_at&sortOrder=desc`
    );
    const json = await res.json();
    if (!json.success || !json.data?.length) return;

    const entry      = json.data[0];
    const totalItems = (entry.items as { item_code: string; count: number }[])
      .reduce((sum, i) => sum + i.count, 0);
    const verb    = entry.mode === 'take' ? 'took' : 'put back';

    toast.add({
      severity: 'secondary',
      summary:  entry.mode === 'take' ? 'Items Taken' : 'Items Put Back',
      detail:   `${entry.operator_ip} ${verb} ${totalItems} item${totalItems !== 1 ? 's' : ''} at ${entry.location_code}`,
      life:     5000,
    });
  } catch {
    // silently ignore — toast is best-effort
  }
}

// ── Single shared WebSocket with auto-reconnect ───────────────
let ws: WebSocket | null = null;
let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

function connectWS() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    wsConnected.value = true;
    console.log('[WS] connected');
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'refresh') {
        notifyFromLog();
        triggerRefresh();
      }
    } catch {
      // ignore malformed messages
    }
  };

  ws.onclose = () => {
    wsConnected.value = false;
    console.log('[WS] disconnected — reconnecting in 3s');
    wsReconnectTimer = setTimeout(connectWS, 3000);
  };

  ws.onerror = () => ws?.close();
}

connectWS();
</script>

<template>
  <!-- Toast is outside all views so it renders everywhere -->
  <Toast position="top-right" />

  <Navbar
    :wsConnected="wsConnected"
    :currentView="currentView"
    @navigate="currentView = $event"
  />

  <Dashboard
    v-if="currentView === 'dashboard'"
    :refreshTick="refreshTick"
  />
  <!-- <ItemLocation
    v-if="currentView === 'item-locations'"
    :refreshTick="refreshTick"
  /> -->
  <Items
    v-else-if="currentView === 'items'"
    :refreshTick="refreshTick"
  />
  <Locations
    v-else-if="currentView === 'locations'"
    :refreshTick="refreshTick"
  />
  <TransactionLog
    v-else-if="currentView === 'transaction-log'"
    :refreshTick="refreshTick"
  />
</template>