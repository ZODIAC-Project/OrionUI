<template>
  <div class="app" v-if="isAgentPage">
    <section class="panel agents">
      <header class="panel-header">
        <div>
          <h2>Agent-Verlauf</h2>
          <p>{{ agentPageId }} · {{ agentHistory.length }} Eintraege</p>
        </div>
        <div class="actions">
          <label class="refresh-toggle">
            <input type="checkbox" v-model="agentAutoRefreshEnabled" />
            Auto-Refresh
          </label>
          <select v-model.number="agentAutoRefreshMs" :disabled="!agentAutoRefreshEnabled || agentHistoryLoading">
            <option :value="3000">3s</option>
            <option :value="5000">5s</option>
            <option :value="10000">10s</option>
            <option :value="30000">30s</option>
          </select>
          <button class="ghost" type="button" @click="openMainPage">Zur Hauptansicht</button>
          <button class="ghost" type="button" @click="loadAgentHistory(agentPageId)" :disabled="agentHistoryLoading">
            Verlauf neu laden
          </button>
        </div>
      </header>

      <div v-if="agentHistoryError" class="error">{{ agentHistoryError }}</div>
      <div v-else-if="agentHistoryLoading" class="empty">Verlauf wird geladen...</div>
      <div v-else-if="!agentHistory.length" class="empty">Noch keine Historie fuer diesen Agenten.</div>

      <div v-else class="history-list">
        <article v-for="entry in agentHistory" :key="entry.timestamp + '-' + entry.jobId" class="history-item" :class="entry.status">
          <div class="history-meta">
            <span>{{ formatHistoryTime(entry.timestamp) }}</span>
            <span class="status-pill">{{ entry.status === 'ok' ? 'ok' : 'error' }}</span>
          </div>
          <div class="history-block">
            <div class="history-label">Agent Prompt</div>
            <pre class="history-value">{{ entry.message || entry.text || '-' }}</pre>
          </div>
          <div class="history-block" v-if="entry.response">
            <div class="history-label">Antwort</div>
            <pre class="history-value">{{ entry.response }}</pre>
          </div>
          <div class="history-block" v-if="entry.error">
            <div class="history-label">Fehler</div>
            <pre class="history-value">{{ entry.error }}</pre>
          </div>
        </article>
      </div>
    </section>
  </div>

  <div class="app" v-else>
    <StatusBar :targets="statusTargets" @update-target-url="updateTargetUrl" />
    <header class="topbar">
      <div>
        <h1>Zodiac Chat</h1>
        <p>UI für den MCP-gebundenen Ollama-Chat</p>
      </div>
      <div class="actions">
        <button class="ghost" type="button" @click="clearChat" :disabled="isSending">Chat leeren</button>
      </div>
    </header>

    <section class="panel settings">
      <div class="field">
        <label>Chat API Base URL</label>
        <input v-model="apiBase" type="text" placeholder="http://localhost:8001" />
      </div>
      <div class="field">
        <label>Chat API Pfad</label>
        <input v-model="apiPath" type="text" placeholder="/chat" />
      </div>
      <div class="field">
        <label>Session-ID (optional)</label>
        <input v-model="sessionId" type="text" placeholder="z. B. demo-session" />
      </div>
      <div class="field">
        <label>Agent API Base URL</label>
        <input v-model="agentApiBase" type="text" placeholder="/agent-api" />
      </div>
      <div class="field">
        <label>Access Purposes</label>
        <input v-model="accessPurposes" type="text" placeholder="z. B. purpose1, purpose2" />
      </div>
      <div class="hint">
        <span>Standard ist die FastAPI-Route <strong>/chat</strong> aus dem Ollama MCP Client.</span>
      </div>
    </section>

    <section class="panel agents">
      <header class="panel-header">
        <div>
          <h2>Agenten</h2>
          <p>Intervall-Agenten erzeugen zusätzlichen Traffic zum MCP-Client.</p>
        </div>
        <button class="ghost" type="button" @click="loadAgents" :disabled="agentLoading">Neu laden</button>
      </header>

      <form class="agent-form" @submit.prevent="createAgent">
        <div class="settings">
          <div class="field">
            <label>Intervall (ms)</label>
            <input v-model.number="agentIntervalMs" type="number" min="1000" step="500" placeholder="5000" />
          </div>
          <div class="field">
            <label>Text</label>
            <input v-model="agentText" type="text" placeholder="z. B. health ping" />
          </div>
          <div class="field">
            <label>Agent Access Purposes</label>
            <input v-model="agentPurposes" type="text" placeholder="z. B. purpose1, purpose2" />
          </div>
          <div class="field">
            <label>Smart Mode</label>
            <select v-model="agentSmartMode">
              <option value="balanced">balanced</option>
              <option value="rag">rag</option>
              <option value="planning">planning</option>
              <option value="json">json</option>
            </select>
          </div>
          <div class="field">
            <label>Tool Hints (optional)</label>
            <input v-model="agentToolHints" type="text" placeholder="z. B. public_animal, list_devices" />
          </div>
          <div class="field">
            <label>Memory Window</label>
            <input v-model.number="agentMemoryWindow" type="number" min="1" max="20" step="1" placeholder="6" />
          </div>
          <div class="field">
            <label>RAG Kontext (optional)</label>
            <textarea v-model="agentRagContext" rows="3" placeholder="Wissensbasis-Text für Retrieval"></textarea>
          </div>
          <div class="field">
            <label>JSON Schema Hint (optional)</label>
            <textarea v-model="agentJsonSchema" rows="3" placeholder='{"type":"object","properties":{"summary":{"type":"string"}}}'></textarea>
          </div>
        </div>
        <button type="submit" :disabled="agentLoading || !agentText.trim() || agentIntervalMs < 1000">
          Agent starten
        </button>
      </form>

      <div v-if="agentError" class="error">{{ agentError }}</div>

      <div class="agent-list" v-if="agents.length">
        <div
          v-for="agent in agents"
          :key="agent.agentId"
          class="agent-card"
          role="button"
          tabindex="0"
          @click="openAgentHistoryTab(agent.agentId)"
          @keydown.enter.prevent="openAgentHistoryTab(agent.agentId)"
        >
          <div>
            <div class="agent-title">{{ agent.agentId }}</div>
            <div class="agent-meta">{{ agent.intervalMs }} ms · {{ agent.text }} · mode: {{ agent.smartMode || 'balanced' }}</div>
          </div>
          <button class="ghost" type="button" @click.stop="deleteAgent(agent.agentId)">Stoppen</button>
        </div>
      </div>
      <div v-else class="empty">Noch keine Agenten aktiv.</div>
    </section>

    <section class="panel chat">
      <div class="messages" ref="messageList">
        <div v-for="(msg, idx) in messages" :key="idx" class="message" :class="msg.role">
          <div class="role">{{ msg.roleLabel }}</div>
          <div v-if="msg.role === 'assistant'" class="content" v-html="renderMarkdown(msg.content)"></div>
          <div v-else class="content" v-text="msg.content"></div>
        </div>
        <div v-if="isSending" class="message assistant">
          <div class="role">assistant</div>
          <div class="content typing">Antwort wird erstellt…</div>
        </div>
      </div>

      <div v-if="error" class="error">{{ error }}</div>

      <form class="composer" @submit.prevent="sendMessage">
        <textarea
          v-model="input"
          placeholder="Nachricht an Ollama senden…"
          rows="3"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.exact.stop
        ></textarea>
        <button type="submit" :disabled="isSending || !input.trim()">
          {{ isSending ? 'Sende…' : 'Senden' }}
        </button>
      </form>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted, onUnmounted, computed, watch } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import StatusBar from './components/StatusBar.vue'

const apiBase = ref(import.meta.env.VITE_CHAT_API_BASE || '/api')
const apiPath = ref(import.meta.env.VITE_CHAT_API_PATH || '/chat')
const sessionId = ref('')
const agentApiBase = ref(import.meta.env.VITE_AGENT_API_BASE || '/agent-api')
const accessPurposes = ref('')
const agentPageId = ref(new URLSearchParams(window.location.search).get('agentId') || '')

// Status targets (health-checked URLs). Initialize from envs and allow user edits.
const STORAGE_KEY = 'orionui_status_targets'
const defaultTargets = [
  { id: 'broker', label: 'Broker', url: import.meta.env.VITE_BROKER_URL || 'URL nicht gesetzt' },
  { id: 'clients', label: 'MCP Clients', url: import.meta.env.VITE_MCP_CLIENT_URL || 'URL nicht gesetzt' },
  { id: 'llm', label: 'LLM', url: import.meta.env.VITE_LLM_URL || 'URL nicht gesetzt' }
]

const statusTargets = ref([])

const loadStatusTargets = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) {
        statusTargets.value = parsed
        return
      }
    }
  } catch (e) {
    // ignore and fall back to defaults
  }
  statusTargets.value = defaultTargets
}

const saveStatusTargets = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statusTargets.value))
  } catch (e) {
    // ignore storage errors
  }
}

const updateTargetUrl = ({ index, url }) => {
  if (Number.isInteger(index) && statusTargets.value[index]) {
    statusTargets.value[index].url = url && url.trim() ? url.trim() : 'URL nicht gesetzt'
    saveStatusTargets()
  }
}

const input = ref('')
const isSending = ref(false)
const error = ref('')
const messageList = ref(null)

const agents = reactive([])
const agentIntervalMs = ref(5000)
const agentText = ref('')
const agentPurposes = ref('')
const agentSmartMode = ref('balanced')
const agentToolHints = ref('')
const agentRagContext = ref('')
const agentJsonSchema = ref('')
const agentMemoryWindow = ref(6)
const agentError = ref('')
const agentLoading = ref(false)
const agentHistory = ref([])
const agentHistoryLoading = ref(false)
const agentHistoryError = ref('')
const agentAutoRefreshEnabled = ref(true)
const agentAutoRefreshMs = ref(5000)
const agentRefreshTimer = ref(null)

const messages = reactive([
  {
    role: 'assistant',
    roleLabel: 'assistant',
    content: 'Hallo! Stelle deine Frage und ich sende sie an den Ollama MCP Client.'
  }
])

const isAgentPage = computed(() => Boolean(agentPageId.value))

const scrollToBottom = async () => {
  await nextTick()
  if (messageList.value) {
    messageList.value.scrollTop = messageList.value.scrollHeight
  }
}

marked.setOptions({
  gfm: true,
  breaks: true
})

const renderMarkdown = (value) => {
  const raw = marked.parse(value ?? '')
  return DOMPurify.sanitize(raw)
}

const normalizePath = (value) => {
  const path = String(value ?? '').trim()
  if (!path) return '/chat'
  return path.startsWith('/') ? path : `/${path}`
}

const clearChat = () => {
  messages.splice(0, messages.length, {
    role: 'assistant',
    roleLabel: 'assistant',
    content: 'Chat zurückgesetzt. Wie kann ich helfen?'
  })
  error.value = ''
}

const sendMessage = async () => {
  const text = input.value.trim()
  if (!text || isSending.value) return

  error.value = ''
  isSending.value = true

  messages.push({ role: 'user', roleLabel: 'user', content: text })
  input.value = ''
  await scrollToBottom()

  try {
    const baseInput = String(apiBase.value ?? '').trim()
    const base = (baseInput || '/api').endsWith('/') ? (baseInput || '/api').slice(0, -1) : (baseInput || '/api')
    const path = normalizePath(apiPath.value)
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: text,
        session_id: String(sessionId.value ?? '').trim() || 'orion-ui-session',
        purposes: accessPurposes.value
          ? accessPurposes.value
              .split(',')
              .map((p) => p.trim())
              .filter((p) => p)
          : []
      })
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`HTTP ${response.status}: ${body}`)
    }

    const data = await response.json()
    const answer = data?.response ?? 'Leere Antwort erhalten.'

    messages.push({ role: 'assistant', roleLabel: 'assistant', content: String(answer) })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unbekannter Fehler beim Senden.'
    messages.push({
      role: 'assistant',
      roleLabel: 'assistant',
      content: 'Es gab ein Problem beim Kontaktieren des Servers.'
    })
  } finally {
    isSending.value = false
    await scrollToBottom()
  }
}

const normalizeBase = (value) => (value.endsWith('/') ? value.slice(0, -1) : value)

const openMainPage = () => {
  const url = new URL(window.location.href)
  url.searchParams.delete('agentId')
  window.location.href = url.toString()
}

const openAgentHistoryTab = (agentId) => {
  const url = new URL(window.location.href)
  url.searchParams.set('agentId', agentId)
  window.open(url.toString(), '_blank', 'noopener')
}

const clearAgentRefreshTimer = () => {
  if (agentRefreshTimer.value) {
    window.clearInterval(agentRefreshTimer.value)
    agentRefreshTimer.value = null
  }
}

const configureAgentRefresh = () => {
  clearAgentRefreshTimer()
  if (!isAgentPage.value || !agentAutoRefreshEnabled.value) return
  const interval = Number(agentAutoRefreshMs.value) > 0 ? Number(agentAutoRefreshMs.value) : 5000
  agentRefreshTimer.value = window.setInterval(() => {
    loadAgentHistory(agentPageId.value)
  }, interval)
}

const formatHistoryTime = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return String(timestamp)
  return date.toLocaleString('de-DE')
}

const loadAgentHistory = async (agentId) => {
  if (!agentId) return
  agentHistoryError.value = ''
  agentHistoryLoading.value = true
  try {
    const base = normalizeBase(agentApiBase.value)
    const res = await fetch(`${base}/agents/${agentId}/history?limit=80`)
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`HTTP ${res.status}: ${body}`)
    }
    const data = await res.json()
    const list = Array.isArray(data?.history) ? data.history : []
    agentHistory.value = list
  } catch (err) {
    agentHistory.value = []
    agentHistoryError.value = err instanceof Error ? err.message : 'Fehler beim Laden des Agent-Verlaufs.'
  } finally {
    agentHistoryLoading.value = false
  }
}

const loadAgents = async () => {
  agentError.value = ''
  agentLoading.value = true
  try {
    const base = normalizeBase(agentApiBase.value)
    const res = await fetch(`${base}/agents`)
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`HTTP ${res.status}: ${body}`)
    }
    const data = await res.json()
    agents.splice(0, agents.length, ...(Array.isArray(data) ? data : []))
  } catch (err) {
    agentError.value = err instanceof Error ? err.message : 'Fehler beim Laden der Agenten.'
  } finally {
    agentLoading.value = false
  }
}

const createAgent = async () => {
  if (agentLoading.value) return
  agentError.value = ''
  agentLoading.value = true
  try {
    const base = normalizeBase(agentApiBase.value)
    const res = await fetch(`${base}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intervalMs: agentIntervalMs.value,
        text: agentText.value.trim(),
        purposes: agentPurposes.value
          ? agentPurposes.value
              .split(',')
              .map((p) => p.trim())
              .filter((p) => p)
          : [],
        smartMode: agentSmartMode.value,
        toolHints: agentToolHints.value
          ? agentToolHints.value
              .split(',')
              .map((item) => item.trim())
              .filter((item) => item)
          : [],
        ragContext: agentRagContext.value,
        jsonSchema: agentJsonSchema.value,
        memoryWindow: Number(agentMemoryWindow.value) > 0 ? Number(agentMemoryWindow.value) : 6,
        chatApiBase: apiBase.value,
        chatApiPath: apiPath.value
      })
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`HTTP ${res.status}: ${body}`)
    }
    await res.json()
    agentText.value = ''
    agentPurposes.value = ''
    agentToolHints.value = ''
    await loadAgents()
  } catch (err) {
    agentError.value = err instanceof Error ? err.message : 'Fehler beim Erstellen des Agenten.'
  } finally {
    agentLoading.value = false
  }
}

const deleteAgent = async (agentId) => {
  if (agentLoading.value) return
  agentError.value = ''
  agentLoading.value = true
  try {
    const base = normalizeBase(agentApiBase.value)
    const res = await fetch(`${base}/agents/${agentId}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`HTTP ${res.status}: ${body}`)
    }
    await loadAgents()
  } catch (err) {
    agentError.value = err instanceof Error ? err.message : 'Fehler beim Stoppen des Agenten.'
  } finally {
    agentLoading.value = false
  }
}

onMounted(() => {
  if (isAgentPage.value) {
    document.title = `Agent ${agentPageId.value} Verlauf | Zodiac Chat`
    loadAgentHistory(agentPageId.value)
    configureAgentRefresh()
    return
  }
  document.title = 'Zodiac Chat'
  loadAgents()
  loadStatusTargets()
})

watch([agentAutoRefreshEnabled, agentAutoRefreshMs], () => {
  if (isAgentPage.value) configureAgentRefresh()
})

onUnmounted(() => {
  clearAgentRefreshTimer()
})
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px;
  max-width: 1100px;
  margin: 0 auto;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.topbar h1 {
  margin: 0 0 6px 0;
  font-size: 28px;
}

.topbar p {
  margin: 0;
  color: #b0b6c6;
}

.actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.refresh-toggle {
  font-size: 12px;
  color: #b0b6c6;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.actions select {
  background: #0c0f14;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e8ecf2;
  border-radius: 8px;
  padding: 8px 10px;
}

.panel {
  background: rgba(24, 27, 34, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
}

.settings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 12px;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: #9aa3b2;
}

.field input,
.field select,
.field textarea {
  background: #0c0f14;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 10px 12px;
  color: #e8ecf2;
}

.hint {
  grid-column: 1 / -1;
  color: #8b94a6;
  font-size: 13px;
}

.chat {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.panel-header h2 {
  margin: 0 0 4px 0;
  font-size: 20px;
}

.panel-header p {
  margin: 0;
  color: #9aa3b2;
  font-size: 13px;
}

.agent-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) auto;
  gap: 12px;
  align-items: end;
  margin-bottom: 16px;
}

.agent-list {
  display: grid;
  gap: 12px;
}

.agent-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #12151d;
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
}

.agent-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 4px;
  color: #e4e9f2;
}

.agent-meta {
  color: #9aa3b2;
  font-size: 12px;
}

.empty {
  color: #8b94a6;
  font-size: 13px;
}

.history-list {
  display: grid;
  gap: 10px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
}

.history-item {
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #11151e;
  padding: 10px 12px;
}

.history-item.error {
  border-color: rgba(255, 92, 92, 0.35);
}

.history-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #9aa3b2;
}

.status-pill {
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-size: 11px;
}

.history-block {
  margin-bottom: 8px;
}

.history-block:last-child {
  margin-bottom: 0;
}

.history-label {
  font-size: 11px;
  text-transform: uppercase;
  color: #95a0b5;
  margin-bottom: 4px;
}

.history-value {
  margin: 0;
  white-space: pre-wrap;
  background: #0c1016;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 8px 10px;
  color: #d5dce9;
  font-size: 12px;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 520px;
  overflow-y: auto;
  padding-right: 6px;
}

.message {
  padding: 12px 14px;
  border-radius: 12px;
  background: #141821;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.message.user {
  background: #1d2330;
  border-color: rgba(107, 151, 255, 0.3);
}

.message.assistant {
  background: #151d1b;
  border-color: rgba(112, 255, 183, 0.25);
}

.role {
  font-size: 11px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: #95a0b5;
  margin-bottom: 6px;
}

.content {
  white-space: pre-wrap;
}

.content pre {
  background: #0b0f15;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 10px 12px;
  overflow-x: auto;
}

.content code {
  font-family: "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
}

.content pre {
  background: #0b0f15;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 10px 12px;
  overflow-x: auto;
}

.content code {
  font-family: "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
}

.typing {
  opacity: 0.7;
}

.composer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: end;
}

textarea {
  resize: vertical;
  min-height: 80px;
  background: #0c0f14;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px;
  color: #e8ecf2;
}

button {
  border: none;
  border-radius: 12px;
  padding: 12px 18px;
  background: #4b7cff;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button.ghost {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.error {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 92, 92, 0.1);
  border: 1px solid rgba(255, 92, 92, 0.3);
  color: #ff9f9f;
}

@media (max-width: 768px) {
  .app {
    padding: 20px;
  }

  .topbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .composer {
    grid-template-columns: 1fr;
  }

  .agent-form {
    grid-template-columns: 1fr;
  }

  button {
    width: 100%;
  }
}
</style>
