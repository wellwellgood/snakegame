import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'snake',
  brand: {
    displayName: '스네이크 게임',
    primaryColor: '#3182F6',
    icon: 'https://deploysnakegame.netlify.app/terms/icon.png',
    bridgeColorMode: 'basic',
  },
  webViewProps: { type: 'game' },
  web: {
    host: '0.0.0.0',
    port: 8082,
    commands: {
      dev: 'cross-env HOST=0.0.0.0 PORT=8082 react-scripts start',
      build: 'react-scripts build',
    },
  },
  permissions: [],
  outdir: 'build',
});
