<template>
  <div class="app">
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
        <input v-model="apiBase" type="text" placeholder="http://localhost:8000" />
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
        <div class="field">
          <label>Intervall (ms)</label>
          <input v-model.number="agentIntervalMs" type="number" min="1000" step="500" placeholder="5000" />
        </div>
        <div class="field">
          <label>Text</label>
          <input v-model="agentText" type="text" placeholder="z. B. health ping" />
        </div>
        <button type="submit" :disabled="agentLoading || !agentText.trim() || agentIntervalMs < 1000">
          Agent starten
        </button>
      </form>

      <div v-if="agentError" class="error">{{ agentError }}</div>

      <div class="agent-list" v-if="agents.length">
        <div v-for="agent in agents" :key="agent.agentId" class="agent-card">
          <div>
            <div class="agent-title">{{ agent.agentId }}</div>
            <div class="agent-meta">{{ agent.intervalMs }} ms · {{ agent.text }}</div>
          </div>
          <button class="ghost" type="button" @click="deleteAgent(agent.agentId)">Stoppen</button>
        </div>
      </div>
      <div v-else class="empty">Noch keine Agenten aktiv.</div>
    </section>

    <section class="panel chat">
      <div class="messages" ref="messageList">
        <div v-for="(msg, idx) in messages" :key="idx" class="message" :class="msg.role">
          <div class="role">{{ msg.roleLabel }}</div>
          <div class="content" v-text="msg.content"></div>
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
import { ref, reactive, nextTick, onMounted, computed } from 'vue'
import StatusBar from './components/StatusBar.vue'

const apiBase = ref(import.meta.env.VITE_CHAT_API_BASE || '/api')
const apiPath = ref(import.meta.env.VITE_CHAT_API_PATH || '/chat')
const sessionId = ref('')
const agentApiBase = ref(import.meta.env.VITE_AGENT_API_BASE || '/agent-api')

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
const agentError = ref('')
const agentLoading = ref(false)

const messages = reactive([
  {
    role: 'assistant',
    roleLabel: 'assistant',
    content: 'Hallo! Stelle deine Frage und ich sende sie an den Ollama MCP Client.'
  }
])

const scrollToBottom = async () => {
  await nextTick()
  if (messageList.value) {
    messageList.value.scrollTop = messageList.value.scrollHeight
  }
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
    const base = apiBase.value.endsWith('/') ? apiBase.value.slice(0, -1) : apiBase.value
    const response = await fetch(`${base}${apiPath.value}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: text,
        session_id: sessionId.value || null
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
        text: agentText.value.trim()
      })
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`HTTP ${res.status}: ${body}`)
    }
    agentText.value = ''
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
  loadAgents()
  loadStatusTargets()
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

.field input {
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
