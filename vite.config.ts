import { defineConfig } from 'vite'
import { config } from 'dotenv';
import react from '@vitejs/plugin-react'


config();
export default defineConfig({
  plugins: [react()],
  server: {
    host:'0.0.0.0',
    port: 5173
  },
  define: {
    'process.env': process.env
  }
})
