import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 180000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1, // run one test file at a time to avoid data collisions in shared staging DB
  retries: 0,
  reporter: [['html', { open: 'never' }], ['line']],
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'on',
    trace: 'on-first-retry',
    actionTimeout: 15000,
  },
  projects: [
    // Setup project para Cambio 6.5 — workaround del bug BL-E2E-AUTH-BLOCKED.
    // Genera tests/.auth/user.json con storageState autenticado via @supabase/ssr Node.
    // Los specs cambio6-5-event-refinement.spec.ts dependen de este setup.
    {
      name: 'cambio6-5-setup',
      testMatch: /auth\.setup\.ts/,
      use: { browserName: 'chromium', viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'chromium',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 900 } },
      // Excluir auth.setup.ts y los specs Cambio 6.5 que requieren storageState
      testIgnore: [/auth\.setup\.ts/, /cambio6-5-event-refinement\.spec\.ts/],
    },
    {
      name: 'cambio6-5-e2e',
      testMatch: /cambio6-5-event-refinement\.spec\.ts/,
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 900 },
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['cambio6-5-setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30000,
  },
})
