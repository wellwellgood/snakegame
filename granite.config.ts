// granite.config.ts
import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "snakegame",
  brand: {
    displayName: "스네이크 게임",
    primaryColor: "#3182F6",
    icon: "",
    bridgeColorMode: "basic",
  },
  web: {
    host: "localhost",
    port: 3000, // CRA 기본
    commands: { dev: "react-scripts start", build: "react-scripts build" },
  },
  outdir: "build",
  permissions: [],
});
