import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/**/__tests__/**/*.test.ts', 'shared/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'server/services/analysis/**/*.ts',
        'server/utils/**/*.ts'
      ],
      exclude: [
        'server/services/connectors/**/*.ts',
        'server/services/pipeline/**/*.ts',
        'server/database/**/*.ts'
      ],
      reporter: ['text', 'html', 'lcov']
    }
  },
  resolve: {
    alias: {
      '~~': resolve(__dirname, './'),
      '~': resolve(__dirname, './app')
    }
  }
})
