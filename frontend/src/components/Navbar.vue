<!-- frontend/src/components/Navbar.vue -->
<template>
  <nav class="navbar">

    <!-- ── Nav items ───────────────────────────────────────── -->
    <ul class="navbar-items">
      <li
        v-for="item in items"
        :key="item.view"
        class="nav-item"
        :class="{ 'nav-item--active': currentView === item.view }"
        @click="emit('navigate', item.view)"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
        <span class="nav-underline" />
      </li>
    </ul>

    <!-- ── Right: WS indicator ─────────────────────────────── -->
    <div class="navbar-end">
      <div class="ws-pill" :class="wsConnected ? 'ws-pill--on' : 'ws-pill--off'">
        <span class="ws-dot" />
        <span class="ws-text">{{ wsConnected ? 'Live' : 'Offline' }}</span>
      </div>
    </div>

  </nav>
</template>

<script setup>
import { onMounted } from 'vue'

const props = defineProps({
  wsConnected: { type: Boolean, default: false },
  currentView: { type: String,  default: 'dashboard' },
})

const emit = defineEmits(['navigate'])

const items = [
  { label: 'Dashboard', icon: '⌂', view: 'dashboard'      },
  { label: 'Items',     icon: '◈', view: 'items'           },
  { label: 'Locations', icon: '⌖', view: 'locations'       },
  { label: 'Txn Log',   icon: '≡', view: 'transaction-log' },
]

onMounted(() => {
  emit('navigate', 'dashboard')
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

/* ── Shell ─────────────────────────────────────────────────── */
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  height: 52px;
  padding: 0 24px;
  background: #15161e;
  border-bottom: 1px solid #272a38;
  font-family: 'DM Sans', sans-serif;
}

/* ── Nav items ─────────────────────────────────────────────── */
.navbar-items {
  display: flex;
  align-items: stretch;
  list-style: none;
  gap: 0;
  flex: 1;
  height: 100%;
  margin: 0;
  padding: 0;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 16px;
  cursor: pointer;
  color: #6b6f85;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 400;
  transition: color 0.15s;
  white-space: nowrap;
  user-select: none;
  -webkit-user-select: none;
}

.nav-item:hover {
  color: #e8eaf0;
}

.nav-item--active {
  color: #e8ff47;
  background: rgba(232,255,71,0.06);
}

.nav-icon {
  font-size: 13px;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.15s;
}
.nav-item:hover   .nav-icon,
.nav-item--active .nav-icon {
  opacity: 1;
}

.nav-label {
  line-height: 1;
}

/* sliding underline */
.nav-underline {
  position: absolute;
  bottom: 0;
  left: 16px;
  right: 16px;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: #e8ff47;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.2s ease;
}
.nav-item--active .nav-underline {
  transform: scaleX(1);
}
.nav-item:hover:not(.nav-item--active) .nav-underline {
  background: #3d4058;
  transform: scaleX(1);
}

/* ── Right end ─────────────────────────────────────────────── */
.navbar-end {
  display: flex;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
}

/* ── WS pill ───────────────────────────────────────────────── */
.ws-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid;
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: all 0.3s ease;
}

.ws-pill--on {
  background: rgba(61,255,160,0.08);
  border-color: rgba(61,255,160,0.25);
  color: #3dffa0;
}
.ws-pill--off {
  background: rgba(255,77,109,0.08);
  border-color: rgba(255,77,109,0.2);
  color: #ff4d6d;
}

.ws-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background 0.3s;
}
.ws-pill--on .ws-dot {
  background: #3dffa0;
  box-shadow: 0 0 6px #3dffa0;
  animation: livePulse 2s ease-in-out infinite;
}
.ws-pill--off .ws-dot {
  background: #ff4d6d;
}

@keyframes livePulse {
  0%, 100% { box-shadow: 0 0 4px #3dffa0; }
  50%       { box-shadow: 0 0 10px #3dffa0, 0 0 20px rgba(61,255,160,0.3); }
}

.ws-text {
  line-height: 1;
}

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 640px) {
  .navbar        { padding: 0 12px; }
  .nav-item      { padding: 0 10px; }
  .nav-label     { display: none; }
  .nav-underline { left: 10px; right: 10px; }
  .nav-icon      { opacity: 1; font-size: 15px; }
}
</style>