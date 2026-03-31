import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  // In CI, use `next start` (pre-built) so routes load instantly.
  // Locally, use `next dev` for hot-reload convenience.
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure"
  },
  projects: [
    ...(!isCI
      ? [
          {
            name: "setup",
            testMatch: /warmup\.setup\.ts/,
            teardown: undefined
          }
        ]
      : []),
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: isCI ? [] : ["setup"]
    }
  ],
  webServer: {
    command: isCI
      ? "npx next start --hostname 127.0.0.1 --port 3100"
      : "npx next dev --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !isCI,
    timeout: 180_000,
    env: isCI ? { ...process.env } : { ...process.env, NODE_ENV: "development" }
  }
});
