import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [vue(), nodePolyfills()],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          v2: resolve(__dirname, 'v2.html')
        }
      }
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_CHAT_API_BASE || 'http://127.0.0.1:8001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        },
        '/agent-api': {
          target: env.VITE_AGENT_API_BASE || 'http://127.0.0.1:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/agent-api/, '')
        },
        '/chat': {
          target: env.VITE_CHAT_API_BASE || 'http://localhost:8001',
          changeOrigin: true
        }
      }
    }
  }
})