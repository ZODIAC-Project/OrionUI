<template>
  <div class="app">
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
      <div class="minioptionbox" style="min-height:20px; display: flex;">
        <p style="margin:1px; margin-left:10px; margin-right:0px; width: 105px;">session id:</p>
        <input type="text" class="minitextbox" placeholder="session id..." v-model="sessionId" />
      </div>
      <div class="optionbox">
        <div style="display: flex; gap: 10px">
          <input type="text" class="textbox" placeholder="direct message..." v-model="msgText"
            v-on:keyup.enter="sendMessage" />
          <input type="button" class="button" :value="isSending ? '...' : 'Send'" @click="sendMessage"
            :disabled="isSending" />
        </div>
        <div style="margin-top: 10px; display: flex; gap: 10px">
          <input type="text" class="textbox" placeholder="purpose1, purpose2" v-model="accessPurposes" />
        </div>
      </div>
    </div>
    <div class="column">
      <div class="minioptionbox"
        style="padding-left: 10px; min-height:20px; display: flex; border:none; border-bottom:1px solid var(--border-color);">
        <input type="button" class="minibutton" value="delete all agents" @click="deleteAllAgents" />
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
              {{ agent.id }}</div>
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
              {{ historyView.id }}</div>
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
      <div class="optionbox" style=" min-height: 150px;">
        <div style="display: flex; gap: 10px">
          <input type="text" class="textbox" placeholder="agent text" v-model="agentText" />
          <input type="text" class="textbox" placeholder="interval (sec)" v-model="interval"
            style="max-width: 150px;" />
        </div>
        <div style="margin-top: 10px; display: flex; gap: 10px">
          <input type="text" class="textbox" placeholder="purpose1, purpose2" v-model="agentPurpose" />
          <input type="text" class="textbox" placeholder="memory window" v-model="memoryWindow"
            style="max-width: 150px;" />
        </div>
        <div style="margin-top: 10px; display: flex; gap: 8px">
          <div class="textbox" style="max-width:20px; max-height:20px; margin-top:8px; padding:2px; cursor: pointer"
            @click="runOnce = !runOnce">
            <div v-if="runOnce" style="background-color: var(--border-color); width:14px; height:14px;" />
          </div>
          <p style="width:120px; margin:0px; margin-top:5px; cursor: pointer; user-select: none;"
            @click="runOnce = !runOnce">run once</p>
          <input type="button" class="button" style="width:100%" value="Launch Agent" @click="launchAgent"
            :disabled="isLaunching" />
        </div>
      </div>
    </div>
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
import { ref, reactive, nextTick, onMounted, onUnmounted, watch } from 'vue'

const MCP_URL = "http://130.149.158.32:30084";
const AGENT_URL = "http://130.149.158.133:30086";
const TOOL_USE_URL = "ws://130.149.158.133:30084/tool-use";
//const AGENT_URL = "http://127.0.0.1:8000";

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
  // Prefer the browser native UUID if available
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch (e) { }
  // Fallback: timestamp + random
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const sessionId = ref(generateSessionId());
const accessPurposes = ref('');
const isSending = ref(false);
const isLaunching = ref(false);
const MCPstatus = ref(null);
const agentManagerStatus = ref(null);

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
})

const addMessage = async (role, content) => {
  messages.push({
    role,
    content,
    timestamp: Date.now(),
  });
  await nextTick();
  const msgbox = document.querySelector('.msgbox');
  msgbox.scrollTop = msgbox.scrollHeight;
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
  // start a new session for the new chat
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
  max-width: 1400px;
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
  max-width: 460px;
  border: 1px solid var(--border-color);
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.7);
}

.msgbox {
  flex-grow: 1;
  width: 100%;
  padding: 10px;
  overflow-y: scroll;
  -ms-overflow-style: none;
  /* IE and Edge */
  scrollbar-width: none;
}

.optionbox {
  padding: 10px;
  height: 104px;
  min-height: 100px;
  width: 100%;
  border-top: 1px solid var(--border-color);
  background: var(--light-color);
}

.minioptionbox {
  height: 50px;
  min-height: 20px;
  max-height: 20px;
  width: 100%;
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--light-txt-color);
}

.textbox {
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  padding: 5px;
  width: 100%;
  box-sizing: border-box;
  color: #e7e7e7;
  outline: none;
}

.minitextbox {
  border: transparent;
  background: transparent;
  /* padding: 5px; */
  width: 100%;
  box-sizing: border-box;
  outline: none;
  color: var(--light-txt-color);
}

.textbox:focus {
  border-color: white;
}

.button {
  border: 1px solid var(--border-color);
  padding: 5px 15px;
  color: #e7e7e7;
  background: var(--light-color);
  cursor: pointer;
}

.button:hover {
  background: var(--bg-color);
}

.button:active {
  background: var(--light-color);
  border-color: white;
}

.button:disabled {
  border-color: var(--border-color);
  color: #888888;
  cursor: not-allowed;
  pointer-events: none;
}

.minibutton {
  cursor: pointer;
  border: none;
  background-color: transparent;
  color: var(--light-txt-color);
}

.minibutton:hover {
  color: #e7e7e7;
}

.purposeLabel {
  background-color: var(--bg-color);
  padding-left: 5px;
  padding-right: 5px;
  margin-left: 2px;
}

.message-wrapper {
  font-size: 12px;
  margin-bottom: 10px;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.message-header {
  white-space: nowrap;
  display: flex;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  padding: 2px 0;
}

.message-header.assistant {
  background-color: var(--assistant-color);
}

.message-header.user {
  background-color: var(--user-color);
}

.message-header.error {
  display: none;
}

.message-header.agent {
  background-color: var(--agent-color);
}

.message-header.incoming {
  background-color: var(--assistant-color);
}

.message-header.outgoing {
  background-color: var(--agent-color);
}

.message-header.tool-ok {
  background-color: color-mix(in srgb, var(--tool-ok-color), transparent 80%);
  border: 1px solid var(--tool-ok-color);
}

.message-header.tool-error {
  background-color: color-mix(in srgb, var(--tool-error-color), transparent 80%);
  border: 1px solid var(--tool-error-color);
}

.message-body {
  background: var(--light-color);
  padding: 10px;
  border: 1px solid transparent;
}

.message-body.assistant {
  border-color: var(--assistant-color);
}

.message-body.user {
  border-color: var(--user-color);
}

.message-body.error {
  color: var(--error-color);
  border-color: var(--error-color);
}

.message-body.agent {
  border-color: var(--agent-color);
}

.message-body.incoming {
  border-color: var(--assistant-color);
}

.message-body.outgoing {
  border-color: var(--agent-color);
}

.message-body.tool-ok {
  border-color: var(--tool-ok-color);
  background-color: color-mix(in srgb, var(--tool-ok-color), transparent 90%);
  color: var(--tool-ok-color);
  margin-top: -1px;
}

.message-body.tool-error {
  border-color: var(--tool-error-color);
  background-color: color-mix(in srgb, var(--tool-error-color), transparent 90%);
  color: var(--tool-error-color);
  margin-top: -1px;
}

.role-label {
  padding-left: 10px;
  text-transform: capitalize;
}

.spacer {
  flex-grow: 1;
}

.timestamp {
  padding-right: 10px;
  opacity: 0.8;
}

.button-icon {
  width: 16px;
  height: 16px;
  filter: invert(100%);
  margin-right: 5px;
  margin-top: 1px;
  opacity: 0.5;
  cursor: pointer;
}

.button-icon:hover {
  opacity: 1;
}

.icon {
  width: 13px;
  height: 13px;
  filter: invert(100%);
  margin-left: 5px;
  margin-top: 2px;
}
</style>
