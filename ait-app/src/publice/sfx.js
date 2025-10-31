// public/sfx.js
import eatUrl from "./assets/gameSoundEffect.mp3";

let ctx, eatBuf;

export async function initSfx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    console.log('[SFX] AudioContext 생성, state:', ctx.state);
  }

  // ✅ 초기화 시 resume 시도
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
      console.log('[SFX] AudioContext resumed on init');
    } catch (e) {
      console.log('[SFX] Resume on init failed:', e?.message);
    }
  }

  if (!eatBuf) {
    const res = await fetch(eatUrl);
    const arr = await res.arrayBuffer();
    eatBuf = await ctx.decodeAudioData(arr);
    console.log('[SFX] Sound buffer loaded');
  }
}

export function getAudioContext() {
  return ctx;
}

export async function resumeSfx() {
  if (!ctx) return;
  if (ctx.state !== 'running') {
    try {
      await ctx.resume();
      console.log('[SFX] resumeSfx 성공, state:', ctx.state);
    } catch (e) {
      console.log('[SFX] resumeSfx 실패:', e?.message);
    }
  }
}

export function setSfxMuted(muted) {
  window.__SNAKE_SFX_MUTED = muted;
}

export async function playEat() {
  if (window.__SNAKE_SFX_MUTED) return;
  if (!ctx || !eatBuf) return;

  // ✅ 재생 전 AudioContext 상태 확인
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
      console.log('[SFX] playEat에서 resume 성공');
    } catch (e) {
      console.log('[SFX] playEat에서 resume 실패:', e?.message);
      return;
    }
  }

  const src = ctx.createBufferSource();
  src.buffer = eatBuf;
  const gain = ctx.createGain();
  gain.gain.value = 0.6;
  src.connect(gain).connect(ctx.destination);
  src.start(0);
}