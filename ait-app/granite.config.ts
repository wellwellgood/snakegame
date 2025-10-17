import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'snakegame',
  brand: {
    displayName: 'snakegame', // 화면에 노출될 앱의 한글 이름으로 바꿔주세요.
    primaryColor: '#3182F6', // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
    icon: 'https://deploysnakegame.netlify.app/terms/icon.png', // 화면에 노출될 앱의 아이콘 이미지 주소로 바꿔주세요.
    bridgeColorMode: 'basic',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'concurrently -k "npm run web:start" "wait-on http-get://127.0.0.1:8082 --log -t 60000 && electron ."',
      build: 'npm run web:build',
    },
  },
  permissions: [],
  outdir: 'dist',
});
