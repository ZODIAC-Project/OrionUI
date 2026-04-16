<template>
  <div class="app">
    <!-- Column 1: Chat -->
    <div class="column">
      <div class="minioptionbox"
        style="padding-left: 10px; min-height:20px; display: flex; border:none; border-bottom:1px solid var(--border-color);">
        <input type="button" class="minibutton" value="clear messages" @click="clearChat" />
        <div style="flex-grow: 1"></div>
        <div style="font-size: 12px; color: var(--light-txt-color); margin-right: 10px">
          MCP status:
          <span :style="{ color: MCPstatus === null ? 'var(--light-txt-color)' : MCPstatus ? '#3dce3d' : '#ce3d3d' }">
            {{ MCPstatus === null ? 'checking...' : MCPstatus ? 'online' : 'offline' }}
          </span>
        </div>
      </div>
      <div class="msgbox">
        <div v-for="(message, index) in messages" :key="index" class="message-wrapper">
          <div class="message-header" :class="message.role">
            <div class="role-label">{{ message.role }}</div>
            <div class="spacer"></div>
            <div class="timestamp">
              {{ new Date(message.timestamp).toLocaleTimeString() }}
            </div>
          </div>

          <div class="message-body" :class="message.role">
            {{ message.content }}
          </div>
        </div>
      </div>
      <div class="optionbox">
        <div class="footer-row">
          <input type="text" class="textbox" placeholder="direct message..." v-model="msgText"
            v-on:keyup.enter="sendMessage" />
          <input type="button" class="button primary" :value="isSending ? '...' : 'SEND'" @click="sendMessage"
            :disabled="isSending" />
        </div>
        <div class="footer-row">
          <input type="text" class="textbox" placeholder="purpose1, purpose2" v-model="accessPurposes" />
        </div>
        <div class="footer-row">
           <span class="micro-label">SESSION ID:</span>
           <input type="text" class="minitextbox" :value="sessionId" readonly @click="copySessionId" />
           <span v-if="copiedSession" class="copy-note">copied!</span>
        </div>
      </div>
    </div>

    <!-- Column 2: Agents -->
    <div class="column">
      <div class="minioptionbox"
        style="padding-left: 10px; min-height:20px; display: flex; border:none; border-bottom:1px solid var(--border-color);">
        <input type="button" class="minibutton" value="delete agents" @click="deleteAllAgents" />
        <div style="flex-grow: 1"></div>
        <div style="font-size: 12px; color: var(--light-txt-color); margin-right: 10px">
          agent manager status:
          <span
            :style="{ color: agentManagerStatus === null ? 'var(--light-txt-color)' : agentManagerStatus ? '#3dce3d' : '#ce3d3d' }">
            {{ agentManagerStatus === null ? 'checking...' : agentManagerStatus ? 'online' : 'offline' }}
          </span>
        </div>
      </div>
      <div class="msgbox">
        <div v-if="historyView === null" v-for="(agent, index) in agents" :key="index" class="message-wrapper">
          <div class="message-header agent" style="gap:0px">
            <div class="role-label">Agent {{ index }}</div>
            <div style="margin-left:10px; margin-right:10px; opacity: 0.5; text-overflow: ellipsis; overflow: hidden;">
              <span class="clickable-id" @click="copyAgentId(agent.id)">{{ agent.id }}</span>
              <span v-if="copiedAgents[agent.id]" style="margin-left:6px; font-size:11px; color: var(--assistant-color);">copied!</span>
            </div>
            <div class="spacer"></div>
            <div style="margin-right:10px">
              <span v-if="!agent.runOnce">every</span> {{ agent.intervalMs / 1000 }} sec
            </div>
            <div style="margin-right:10px; opacity:0.5" v-if="agent.runOnce">(run-once)</div>
          </div>

          <div class="message-body agent">
            {{ agent.text }}
          </div>

          <div class="message-header agent"
            style="gap:0px; background-color: var(--light-color); border: 1px solid var(--border-color); border-top:none">
            <div class="role-label" style="opacity: 0.5; margin-right:3px">Purpose:</div>
            <div v-for="(purpose, index) in agent.purposes" :key="index" class="purposeLabel">
              <span style="opacity:0.5">{{ purpose }}</span>
            </div>
            <div class="spacer"></div>
            <img src="../assets/icons/eye.png" class="button-icon" @click="historyView = agent" />
            <img src="../assets/icons/trash.png" class="button-icon" @click="deleteAgent(agent.id)" />
          </div>
        </div>
        <div v-else class="message-wrapper" style="height: 100%; margin:0px">
          <div class="message-header agent" style="gap:0px">
            <div class="role-label">Agent {{agents.findIndex(a => a.id === historyView.id)}}</div>
            <div style="margin-left:10px; margin-right:10px; opacity: 0.5; text-overflow: ellipsis; overflow: hidden;">
              <span class="clickable-id" @click="copyAgentId(historyView.id)">{{ historyView.id }}</span>
              <span v-if="copiedAgents[historyView.id]" style="margin-left:6px; font-size:11px; color: var(--assistant-color);">copied!</span>
            </div>
            <div class="spacer"></div>
            <div style="margin-right:10px">
              <span v-if="!historyView.runOnce">every</span> {{ historyView.intervalMs / 1000 }} sec
            </div>
            <div style="margin-right:10px; opacity:0.5" v-if="historyView.runOnce">(run-once)</div>
          </div>

          <div class="message-body agent">
            {{ historyView.text }}
          </div>

          <div class="message-header agent"
            style="gap:0px; background-color: var(--light-color); border: 1px solid var(--border-color); border-top:none">
            <div class="role-label" style="opacity: 0.5; margin-right:3px">Purpose:</div>
            <div v-for="(purpose, index) in historyView.purposes" :key="index" class="purposeLabel">
              <span style="opacity:0.5">{{ purpose }}</span>
            </div>
            <div class="spacer"></div>
            <img src="../assets/icons/hide.png" class="button-icon" @click="historyView = null" />
            <img src="../assets/icons/trash.png" class="button-icon"
              @click="deleteAgent(historyView.id); historyView = null;" />
          </div>
          <div class="msgbox"
            style="border: 1px solid var(--border-color); border-top:none; background-color: var(--light-color);">
            <div v-for="(message, index) in historyMessages" :key="index" class="message-wrapper">
              <div class="message-header" :class="message.type">
                <div class="role-label">{{ message.type }}</div>
                <div class="spacer"></div>
                <div class="timestamp">
                  {{ new Date(message.timestamp * 1000).toLocaleTimeString() }}
                </div>
              </div>

              <div class="message-body" :class="message.type">
                {{ message.message }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="optionbox">
        <div class="footer-row">
          <input type="text" class="textbox" placeholder="agent text" v-model="agentText" />
          <input type="text" class="textbox" placeholder="sec" v-model="interval"
            style="max-width: 60px;" />
        </div>
        <div class="footer-row">
          <input type="text" class="textbox" placeholder="purpose1, purpose2" v-model="agentPurpose" />
          <input type="text" class="textbox" placeholder="mem" v-model="memoryWindow"
            style="max-width: 60px;" />
        </div>
        <div class="footer-row">
          <div class="custom-checkbox" @click="runOnce = !runOnce">
            <div class="checkbox-box" :class="{ 'checked': runOnce }"></div>
            <span class="micro-label">RUN ONCE</span>
          </div>
          <input type="button" class="button primary fill" value="LAUNCH AGENT" @click="launchAgent"
            :disabled="isLaunching" />
        </div>
      </div>
    </div>

    <!-- Column 3: WebSocket Monitor -->
    <div class="column">
      <div class="minioptionbox" style="border:none; border-bottom:1px solid var(--border-color);">
        <span style="font-size: 12px; color: var(--light-txt-color); margin-left: 10px;">ws subscription monitor</span>
        <div style="flex-grow: 1"></div>
        <div style="font-size: 12px; color: var(--light-txt-color); margin-right: 10px;">
          {{ wsSubscriptions.length }}/8 active
        </div>
      </div>

      <div v-if="wsSubscriptions.length > 0"
        style="display: flex; flex-wrap: wrap; gap: 2px; padding: 6px 6px 0 6px; border-bottom: 1px solid var(--border-color); background: var(--light-color);">
        <div v-for="(sub, index) in wsSubscriptions" :key="sub.id" @click="activeWsTab = index" class="ws-tab"
          :class="{ 'ws-tab-active': activeWsTab === index }">
          <span class="ws-status-dot"
            :style="{ background: sub.status === 'connected' ? '#3dce3d' : '#ce3d3d' }">
          </span>
          <span class="ws-tab-label">{{ sub.label }}</span>
          <span class="ws-tab-close" @click.stop="removeWsSubscription(sub.id)">×</span>
        </div>
      </div>

      <div class="msgbox" ref="wsMessageBox">
        <div v-if="wsSubscriptions.length === 0"
          style="color: var(--light-txt-color); font-size: 12px; text-align: center; margin-top: 40px; padding: 0 20px; line-height: 1.8;">
          no active subscriptions<br />enter address below
        </div>
        <div v-for="(msg, index) in activeTabMessages" :key="index" class="message-wrapper">
          <div class="message-header incoming">
            <div class="role-label">incoming</div>
            <div class="spacer"></div>
            <div class="timestamp">{{ new Date(msg.timestamp).toLocaleTimeString() }}</div>
          </div>
          <div class="message-body incoming">{{ msg.data }}</div>
        </div>
      </div>
      <div class="optionbox ws-footer">
        <div class="footer-row">
          <input type="text" class="textbox" placeholder="ws://host:port/path" v-model="newWsUrl"
            v-on:keyup.enter="addWsSubscription" />
          <input type="button" class="button primary" value="CONNECT" @click="addWsSubscription"
            :disabled="!newWsUrl.trim() || wsSubscriptions.length >= 8" />
        </div>
      </div>
    </div>

    <!-- Column 4: Tool History -->
    <div class="column">
      <div class="minioptionbox"
        style="padding-left: 10px; min-height:20px; display: flex; border:none; border-bottom:1px solid var(--border-color);">
        <input type="button" class="minibutton" value="clear tool use history" @click="toolHistory.length = 0" />
      </div>
      <div class="msgbox">
        <div v-for="(toolUse, index) in toolHistory" :key="index" class="message-wrapper">
          <div class="message-header" :class="{ 'tool-ok': toolUse.accepted, 'tool-error': !toolUse.accepted }">
            <img v-if="toolUse.accepted" src="../assets/icons/check.png" class="icon" />
            <img v-else src="../assets/icons/trash.png" class="icon" />
            <div class="role-label" style="padding-left:0px">{{ toolUse.tool }}</div>
            <div class="spacer"></div>
          </div>
          <div v-if="toolUse.parameters && Object.keys(toolUse.parameters).length > 0" class="message-body"
            :class="{ 'tool-ok': toolUse.accepted, 'tool-error': !toolUse.accepted }">
            <div v-for="(value, key) in toolUse.parameters" :key="key">
              <span style="font-weight: 600;">{{ key }}:</span> {{ value }}
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'

const MCP_URL = "http://130.149.158.32:30084";
const AGENT_URL = "http://130.149.158.133:30086";
const TOOL_USE_URL = "ws://130.149.158.133:30084/tool-use";

const runOnce = ref(false);
const historyView = ref(null);
const historyMessages = ref([]);
const agentText = ref('');
const interval = ref('');
const agentPurpose = ref('');
const memoryWindow = ref('');
const msgText = ref('');
const messages = reactive([
  {
    role: 'assistant',
    content: 'Hallo! Stelle deine Frage und ich sende sie an den Ollama MCP Client.',
    timestamp: Date.now(),
  }
]);

const toolHistory = reactive([]);
const agents = ref([])

const generateSessionId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch (e) { }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const sessionId = ref(generateSessionId());
const copiedSession = ref(false);

const copySessionId = async () => {
  try {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(String(sessionId.value));
    } else {
      const ta = document.createElement('textarea');
      ta.value = String(sessionId.value);
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    copiedSession.value = true;
    setTimeout(() => (copiedSession.value = false), 1500);
  } catch (e) {
    console.error('copy failed', e);
  }
}
const copiedAgents = reactive({});

const copyAgentId = async (id) => {
  if (!id) return;
  try {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(String(id));
    } else {
      const ta = document.createElement('textarea');
      ta.value = String(id);
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    copiedAgents[id] = true;
    setTimeout(() => (copiedAgents[id] = false), 1500);
  } catch (e) {
    console.error('copyAgentId failed', e);
  }
}
const accessPurposes = ref('');
const isSending = ref(false);
const isLaunching = ref(false);
const MCPstatus = ref(null);
const agentManagerStatus = ref(null);

// WebSocket monitor state
const newWsUrl = ref('');
const wsSubscriptions = ref([]);
const activeWsTab = ref(0);
const wsSocketMap = {};
const wsMessageBox = ref(null);

const activeTabMessages = computed(() => {
  const sub = wsSubscriptions.value[activeWsTab.value];
  return sub ? sub.messages : [];
});

const addWsSubscription = () => {
  const url = newWsUrl.value.trim();
  if (!url || wsSubscriptions.value.length >= 8) return;

  const id = `ws-${Date.now()}`;
  const label = url.replace(/^wss?:\/\//, '').slice(0, 22);
  const sub = reactive({ id, url, label, status: 'connecting', messages: [] });

  wsSubscriptions.value.unshift(sub);
  activeWsTab.value = 0;
  newWsUrl.value = '';

  const socket = new WebSocket(url);
  wsSocketMap[id] = socket;

  socket.onopen = () => { sub.status = 'connected'; };
  socket.onerror = () => { sub.status = 'error'; };
  socket.onclose = () => { if (sub.status !== 'removed') sub.status = 'closed'; };
  socket.onmessage = (event) => {
    sub.messages.unshift({ data: event.data, timestamp: Date.now() });
    if (sub.messages.length > 200) sub.messages.pop();
  };
};

const removeWsSubscription = (id) => {
  const socket = wsSocketMap[id];
  if (socket) { socket.close(); delete wsSocketMap[id]; }
  const idx = wsSubscriptions.value.findIndex(s => s.id === id);
  if (idx !== -1) {
    wsSubscriptions.value[idx].status = 'removed';
    wsSubscriptions.value.splice(idx, 1);
  }
  if (activeWsTab.value >= wsSubscriptions.value.length) {
    activeWsTab.value = Math.max(0, wsSubscriptions.value.length - 1);
  }
};

const checkStatus = async () => {
  try {
    const res = await fetch(`${MCP_URL}/health`);
    MCPstatus.value = res.ok;
  } catch (err) {
    MCPstatus.value = false;
  }
  try {
    const res = await fetch(`${AGENT_URL}/health`);
    agentManagerStatus.value = res.ok;
  } catch (err) {
    agentManagerStatus.value = false;
  }
}

let agentsSocket;
let historySocket;
let toolUseSocket;

const connectHistorySocket = (id) => {
  if (historySocket) {
    historySocket.close();
    historySocket = null;
  }

  if (!id) return;

  const wsUrl = `${AGENT_URL.replace(/^http/, 'ws')}/agents/${id}/history`;
  historySocket = new WebSocket(wsUrl);

  historySocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      historyMessages.value = data;
      console.log('Received History WebSocket message:', data);
    } catch (e) {
      console.error('Failed to parse history message:', e);
    }
  };

  historySocket.onerror = (err) => console.error('History Socket Error:', err);
};

watch(historyView, (newView) => {
  historyMessages.value = [];
  if (newView)
    connectHistorySocket(newView.id);
  else
    if (historySocket) historySocket.close();
}, { immediate: true });

onMounted(() => {
  checkStatus()
  agentsSocket = new WebSocket(`${AGENT_URL.replace(/^http/, 'ws')}/agents`);
  agentsSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      agents.value = data;
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e);
    }
  }

  toolUseSocket = new WebSocket(TOOL_USE_URL);
  toolUseSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("tool used: ", data);
      const isEmpty = !data ||
        (Array.isArray(data) && data.length === 0) ||
        (typeof data === 'object' && Object.keys(data).length === 0);
      if (!isEmpty)
        toolHistory.push(...data);
    } catch (e) {
      console.error('Failed to parse tool-use message:', e);
    }
  }
})

onUnmounted(() => {
  if (agentsSocket) agentsSocket.close();
  if (historySocket) historySocket.close();
  if (toolUseSocket) toolUseSocket.close();
  Object.values(wsSocketMap).forEach(s => s.close());
})

const addMessage = async (role, content) => {
  messages.push({
    role,
    content,
    timestamp: Date.now(),
  });
  await nextTick();
  const msgbox = document.querySelector('.msgbox');
  if (msgbox) msgbox.scrollTop = msgbox.scrollHeight;
}

const sendMessage = async () => {
  isSending.value = true;
  let text = msgText.value.trim();
  msgText.value = '';
  addMessage('user', text);

  let response;

  try {
    response = await fetch(`${MCP_URL}/chat`, {
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
  } catch (e) {
    addMessage('error', String(e));
    isSending.value = false;
    return;
  }

  if (!response.ok) {
    const body = await response.text();
    addMessage('error', String(`HTTP ${response.status}: ${body}`));
    isSending.value = false;
    return;
  }

  try {
    const data = await response.json();
    addMessage('assistant', String(data?.response ?? ''));
  } catch (e) {
    addMessage('error', 'Failed to parse JSON response');
  } finally {
    isSending.value = false;
  }
}

const launchAgent = async () => {
  isLaunching.value = true;
  let text = agentText.value.trim();
  let intervalMs = parseFloat(interval.value) * 1000;
  let once = runOnce.value;
  let memWindow = memoryWindow.value;
  let purposes = agentPurpose.value
    ? agentPurpose.value
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p)
    : [];

  agentText.value = "";
  interval.value = "";
  memoryWindow.value = "";
  agentPurpose.value = "";

  try {
    let response = await fetch(`${AGENT_URL}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intervalMs: intervalMs,
        runOnce: once,
        text: text,
        memoryWindow: memWindow,
        purposes: purposes
      })
    })
  } catch (e) {
    console.error(`error while launching agent: ${e}`)
  }

  isLaunching.value = false;
}

const clearChat = () => {
  messages.splice(0, messages.length, {
    role: 'assistant',
    content: 'Chat zurückgesetzt. Wie kann ich helfen?',
    timestamp: Date.now(),
  })
  sessionId.value = generateSessionId()
}

const deleteAgent = async (agentId) => {
  const res = await fetch(`${AGENT_URL}/agents/${agentId}`, { method: 'DELETE' });
  agents.value = agents.value.filter(agent => agent.id !== agentId);

  if (!res.ok) {
    const body = await res.text();
    console.error(`error deleting agent: HTTP ${res.status}: ${body}`);
  }
}

const deleteAllAgents = async () => {
  const res = await fetch(`${AGENT_URL}/agents`, { method: 'DELETE' });
  agents.value = [];

  if (!res.ok) {
    const body = await res.text();
    console.error(`error deleting agent: HTTP ${res.status}: ${body}`);
  }
}
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: row;
  height: 100vh;
  gap: 10px;
  padding: 30px;
  max-width: 1900px;
  margin: 0 auto;
  font-family: var(--font-mono), 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow-wrap: break-word;

  --assistant-color: #238b7a;
  --user-color: #395864;
  --error-color: #ce3d3d;
  --agent-color: #444;
  --tool-ok-color: #238b7a;
  --tool-error-color: #ce3d3d;
}

.column {
  border: 1px solid var(--border-color);
  flex: 1;
  display: flex;
  flex-direction: column;
  box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.7);
  min-width: 0;
}

.msgbox {
  flex-grow: 1;
  width: 100%;
  padding: 10px;
  overflow-y: scroll;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.optionbox {
  padding: 15px;
  height: 150px;
  min-height: 150px;
  width: 100%;
  border-top: 1px solid var(--border-color);
  background: var(--light-color);
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;
}

.footer-row {
  display: flex;
  gap: 10px;
  align-items: center;
  height: 36px;
}

.textbox {
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  padding: 6px 8px;
  width: 100%;
  box-sizing: border-box;
  color: #e7e7e7;
  outline: none;
  height: 100%;
}

/* WebSocket column footer overrides — set `--ws-footer-height` to change */
.ws-footer {
  height: var(--ws-footer-height, 80px);
  min-height: var(--ws-footer-height, 70px);
  max-height: var(--ws-footer-height, 200px);
}
.textbox:focus { border-color: #888; }

.button {
  font-family: inherit;
  height: 100%;
  border: 1px solid var(--border-color);
  padding: 0 15px;
  color: #e7e7e7;
  background: var(--light-color);
  cursor: pointer;
  white-space: nowrap;
}
.footer-row .button { height: 100%; }
.button.primary { border-color: var(--assistant-color); color: var(--assistant-color); }
.button:hover { background: var(--bg-color); }
.button:disabled { opacity: 0.3; cursor: not-allowed; }
.button.fill { flex-grow: 1; }

.micro-label {
  font-size: 11px;
  font-weight: bold;
  color: var(--light-txt-color);
  white-space: nowrap;
}

.minitextbox {
  font-family: inherit;
  border: transparent;
  background: transparent;
  width: 100%;
  box-sizing: border-box;
  outline: none;
  color: var(--light-txt-color);
  cursor: pointer;
}

.copy-note { font-size: 11px; color: var(--assistant-color); margin-left: 5px; }
.helper-text { font-size: 11px; color: var(--light-txt-color); opacity: 0.6; line-height: 1.4; }

.custom-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}
.checkbox-box {
  width: 16px;
  height: 16px;
  border: 1px solid var(--border-color);
  background: #0d0f14;
}
.checkbox-box.checked {
  background: var(--assistant-color);
}

/* END FOOTER SECTION */

.minioptionbox {
  height: auto;
  min-height: 20px;
  width: 100%;
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--light-txt-color);
  display: flex;
  align-items: center;
}

.minibutton {
  cursor: pointer;
  border: none;
  background-color: transparent;
  color: var(--light-txt-color);
}
.minibutton:hover { color: #e7e7e7; }

.message-wrapper { font-size: 12px; margin-bottom: 10px; width: 100%; display: flex; flex-direction: column; }
.message-header { display: flex; gap: 10px; font-weight: 600; color: white; padding: 2px 0; }
.message-header.assistant { background-color: var(--assistant-color); }
.message-header.user { background-color: var(--user-color); }
.message-header.agent { background-color: var(--agent-color); }
.message-header.incoming { background-color: var(--assistant-color); }

.message-body { background: var(--light-color); padding: 10px; border: 1px solid transparent; }
.message-body.assistant { border-color: var(--assistant-color); }
.message-body.user { border-color: var(--user-color); }
.message-body.agent { border-color: var(--agent-color); }
.message-body.incoming { border-color: var(--assistant-color); }

.role-label { padding-left: 10px; text-transform: capitalize; }
.spacer { flex-grow: 1; }
.timestamp { padding-right: 10px; opacity: 0.8; }
.purposeLabel { background-color: var(--bg-color); padding: 0 5px; margin-left: 2px; font-size: 10px; }
.clickable-id { cursor: pointer; text-decoration: underline dotted; }
.button-icon { width: 16px; height: 16px; filter: invert(100%); margin-left: 5px; opacity: 0.5; cursor: pointer; }
.ws-tab { padding: 3px 8px; border: 1px solid var(--border-color); font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 4px; }
.ws-tab-active { background: var(--bg-color); color: #e7e7e7; }
.ws-status-dot { width: 6px; height: 6px; border-radius: 50%; }
.icon { width: 13px; height: 13px; filter: invert(100%); margin-right: 5px; }
</style>