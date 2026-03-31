<template>
  <div class="app">
    <div class="column">
      <div class="minioptionbox"
        style="padding-left: 10px; min-height:20px; display: flex; border:none; border-bottom:1px solid var(--border-color);">
        <input type="button" class="minibutton" value="clear messages" @click="clearChat" />
        <div style="flex-grow: 1"></div>
        <div style="font-size: 12px; color: var(--light-txt-color); margin-right: 10px">
          MCP Status:
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
          <input type="text" class="textbox" placeholder="direct message..." v-model="msgText" />
          <input type="button" class="button" :value="isSending ? '...' : 'Send'" @click="sendMessage"
            :disabled="isSending" />
        </div>
        <div style="margin-top: 10px; display: flex; gap: 10px">
          <input type="text" class="textbox" placeholder="purpose1, purpose2" v-model="accessPurposes" />
        </div>
      </div>
    </div>
    <div class="column">

    </div>
    <div class="column">

    </div>

  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted } from 'vue'

const MCP_URL = "http://130.149.158.32:30084";
const MCP_CHAT_URL = `${MCP_URL}/chat`;
const MCP_HEALTH_URL = `${MCP_URL}/health`;

const msgText = ref('');
const messages = reactive([
  {
    role: 'assistant',
    content: 'Hallo! Stelle deine Frage und ich sende sie an den Ollama MCP Client.',
    timestamp: Date.now(),
  }
]);

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
const MCPstatus = ref(null);

const checkStatus = async () => {
  try {
    const res = await fetch(MCP_HEALTH_URL);
    MCPstatus.value = res.ok;
  } catch (err) {
    MCPstatus.value = false;
  }
}

onMounted(() => {
  checkStatus()
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
  try {
    const response = await fetch(MCP_CHAT_URL, {
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
    return;
  } finally {
    isSending.value = false;
  }

  if (!response.ok) {
    const body = await response.text()
    addMessage('error', String(`HTTP ${response.status}: ${body}`));
    return;
  }

  const data = await response.json()
  addMessage('assistant', String(data?.response ?? ''));
}

const clearChat = () => {
  messages.splice(0, messages.length, {
    role: 'assistant',
    roleLabel: 'assistant',
    content: 'Chat zurückgesetzt. Wie kann ich helfen?'
  })
  // start a new session for the new chat
  sessionId.value = generateSessionId()
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

  --assistant-color: #238b7a;
  --user-color: #395864;
  --error-color: #ce3d3d;
}

.column {
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

.minibutton {
  cursor: pointer;
  border: none;
  background-color: transparent;
  color: var(--light-txt-color);
}

.minibutton:hover {
  color: #e7e7e7;
}

.message-wrapper {
  font-size: 12px;
  margin-bottom: 10px;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.message-header {
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
</style>
