import { defineConfig } from "@playwright/test";

const port = Number(process.env.L3BTY_E2E_PORT ?? 3000);

export default defineConfig({
  testDir: "./tests/responsive",
  timeout: 90_000,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: `http://localhost:${port}`,
    channel: "chrome",
    locale: "ar-EG",
    trace: "retain-on-failure",
  },
  webServer: process.env.L3BTY_E2E_EXTERNAL === "1" ? undefined : {
    command: `node node_modules/next/dist/bin/next start -p ${port}`,
    url: `http://localhost:${port}/dashboard`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
