<template>
  <section class="panel status-panel" aria-live="polite">
    <div class="status-grid">
      <div
        v-for="(t, i) in targets"
        :key="t.id || t.url || i"
        class="status-item"
      >
        <div class="item-left">
          <div class="dot" :class="dotClass(statuses[i]?.status)" aria-hidden="true"></div>
          <div class="label-block">
            <div class="label">{{ t.label || (t.url === 'URL nicht gesetzt' ? 'URL nicht gesetzt' : shortUrl(t.url)) }}</div>
            <div class="url-edit-wrap">
              <input
                class="url-input"
                v-model="localUrls[i]"
                @input="onUrlInput(i)"
                :placeholder="t.url && t.url !== 'URL nicht gesetzt' ? t.url : 'URL eingeben'"
              />
            </div>
          </div>
        </div>
        <div class="item-right">
          <div class="status-text">{{ statusText(statuses[i]) }}</div>
          <div class="checked" v-if="statuses[i]?.lastChecked">{{ statuses[i].lastChecked }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { reactive, onMounted, onBeforeUnmount, toRefs, watch } from 'vue'
import mqtt from 'mqtt'

const props = defineProps({
  targets: {
    type: Array,
    required: true // array of { id?, label?, url }
  },
  intervalMs: { type: Number, default: 5000 },
  timeoutMs: { type: Number, default: 4000 }
})

const emit = defineEmits(['update-target-url'])

// local editable copy of target URLs so inputs are subtle and controlled here.
const localUrls = reactive(props.targets.map(t => (t && t.url) || ''))

watch(
  () => props.targets.map(t => (t && t.url) || ''),
  (newVals) => {
    // sync localUrls values and length to props.targets
    for (let i = 0; i < newVals.length; i++) {
      if (localUrls[i] !== newVals[i]) localUrls[i] = newVals[i] || ''
    }
    while (localUrls.length > newVals.length) localUrls.pop()
    while (localUrls.length < newVals.length) localUrls.push('')
  },
  { immediate: true }
)

const onUrlInput = (idx) => {
  const val = (localUrls[idx] || '').trim()
  emit('update-target-url', { index: idx, url: val })
}

const statuses = reactive([])
let timer = null

function ensureStatuses() {
  // keep statuses array same length as props.targets
  while (statuses.length < props.targets.length) {
    statuses.push({ status: 'unknown', code: null, lastChecked: '' })
  }
  while (statuses.length > props.targets.length) {
    statuses.pop()
  }
}

function shortUrl(url) {
  // Resolve relative URLs against the current origin for display purposes
  try {
    const base = (typeof window !== 'undefined' && window.location && window.location.origin) || ''
    const u = new URL(url, base || undefined)
    return u.hostname
  } catch (e) {
    return url
  }
}

function truncate(str, len = 36) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len - 1) + '…' : str
}

function displayUrl(url) {
  // Show the absolute URL that will be requested by fetch.
  try {
    const base = (typeof window !== 'undefined' && window.location && window.location.origin) || ''
    const u = new URL(url, base || undefined)
    const port = u.port ? `:${u.port}` : ''
    const path = u.pathname === '/' ? '' : u.pathname
    // show host + path, keep it short
    return truncate(`${u.hostname}${port}${path}`, 48)
  } catch (e) {
    return truncate(url, 48)
  }
}

function dotClass(status) {
  return {
    ok: status === 'ok',
    error: status === 'error',
    checking: status === 'checking'
  }
}

function statusText(st) {
  if (!st) return 'unbekannt'
  if (st.status === 'checking') return 'Prüfe…'
  if (st.status === 'ok') return `OK ${st.code}`
  if (st.status === 'error') return st.code ? `Fehler ${st.code}` : 'Fehler'
  return 'unbekannt'
}

async function checkTarget(url, idx) {
  statuses[idx].status = 'checking'
  
  // 1. Check if it's an MQTT WebSocket URL
  if (url.startsWith('ws://') || url.startsWith('wss://')) {
    checkMqtt(url, idx)
    return
  }

  // 2. Original Fetch logic for HTTP
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), props.timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(id)
    statuses[idx].code = res.status
    statuses[idx].status = res.ok ? 'ok' : 'error'
  } catch (err) {
    statuses[idx].status = 'error'
  } finally {
    statuses[idx].lastChecked = new Date().toLocaleTimeString()
  }
}

function checkMqtt(url, idx) {
  // Use a unique client ID and a very short timeout
  const client = mqtt.connect(url, {
    connectTimeout: props.timeoutMs,
    reconnectPeriod: 0, // Don't keep trying if it fails
    clientId: 'health-check-' + Math.random().toString(16).substr(2, 8)
  })

  client.on('connect', () => {
    statuses[idx].status = 'ok'
    statuses[idx].code = 'Connected'
    statuses[idx].lastChecked = new Date().toLocaleTimeString()
    client.end()
  })

  client.on('error', () => {
    statuses[idx].status = 'error'
    statuses[idx].code = 'Conn Fail'
    statuses[idx].lastChecked = new Date().toLocaleTimeString()
    client.end()
  })
  
  // Handle timeout manually just in case
  setTimeout(() => {
    if (statuses[idx].status === 'checking') {
      statuses[idx].status = 'error'
      statuses[idx].code = 'Timeout'
      client.end()
    }
  }, props.timeoutMs + 500)
}

function checkAll() {
  ensureStatuses()
    props.targets.forEach((t, i) => {
    if (!t || !t.url || t.url === 'URL nicht gesetzt') {
      statuses[i].status = 'error'
      statuses[i].code = null
      statuses[i].lastChecked = ''
      return
    }
    checkTarget(t.url, i)
  })
}

onMounted(() => {
  ensureStatuses()
  checkAll()
  timer = setInterval(checkAll, props.intervalMs)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

// expose refs if needed (not necessary but keeps pattern consistent)
toRefs(statuses)
</script>

<style scoped>
.status-panel {
  padding: 12px;
  border-radius: 12px;
}
.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.status-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #12151d;
  border: 1px solid rgba(255,255,255,0.06);
}
.item-left { display:flex; align-items:center; gap:10px }
.dot { width:12px; height:12px; border-radius:50%; background:#7a7f87; box-shadow:0 0 6px rgba(0,0,0,0.4) }
.dot.ok { background:#2ecc71; box-shadow:0 0 8px rgba(46,204,113,0.3) }
.dot.error { background:#ff6b6b; box-shadow:0 0 8px rgba(255,107,107,0.3) }
.dot.checking { background:#ffd166; box-shadow:0 0 8px rgba(255,209,102,0.25) }
.label { color:#e4e9f2; font-weight:600; font-size:13px }
.label-block { display:flex; flex-direction:column }
.url-edit-wrap { margin-top:6px }
.url-input {
  width:100%;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.04);
  color: #bfc7d4;
  padding:6px 8px;
  border-radius:8px;
  font-size:12px;
  outline: none;
}
.url-input:focus { box-shadow: 0 0 0 3px rgba(125,136,160,0.06); border-color: rgba(255,255,255,0.12) }
.item-right { text-align:right }
.status-text { color:#9aa3b2; font-size:13px; font-weight:600 }
.checked { color:#8b94a6; font-size:12px }
</style>
