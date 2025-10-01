import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'snakegame',
  brand: {
    displayName: 'snakegame', // 화면에 노출될 앱의 한글 이름으로 바꿔주세요.
    primaryColor: '#3182F6', // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
    icon: "", // 화면에 노출될 앱의 아이콘 이미지 주소로 바꿔주세요.
    bridgeColorMode: 'basic',
  },
  web: {
    host: '0.0.0.0',
    port: 8081,
    commands: {
      dev: 'cross-env HOST=0.0.0.0 PORT=8081 react-scripts start',
      build: 'react-scripts build',
    },
  },
  permissions: [],
  outdir: 'build',
});
