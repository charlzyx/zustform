import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    server: {
      deps: {
        // Inline Zod to avoid resolution issues
        inline: ['zod'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90,
    },
  },
  resolve: {
    alias: {
      '@': '/Users/chao/Projects/charlzyx/zustform/src',
    },
  },
})
