import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0', // 监听所有网络接口
    port: 5173, // 可以修改为你需要的端口
    strictPort: true, // 如果 5173 被占用，Vite 不会随机选择其他端口
    cors: true // 允许跨域访问
  }
})
