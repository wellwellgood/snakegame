// granite.config.ts
import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "snakegame",
  brand: {
    displayName: "스네이크 게임",
    primaryColor: "#3182F6",
    icon: "https://deploysnakegame.netlify.app/terms/icon.png",
    bridgeColorMode: "basic",
  },
  web: {
    host: "https://deploysnakegame.netlify.app/",
    port: 8082, // CRA 기본
    commands: { dev: "cross-env HOST=0.0.0.0 PORT=8082 react-scripts start", build: "react-scripts build" },
  },
  outdir: "build",
  permissions: [],
});
