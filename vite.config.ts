import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    // フックのテストなど DOM が必要なファイルは、先頭に `// @vitest-environment jsdom` を書く
    environment: 'node',
    restoreMocks: true,
  },
})
