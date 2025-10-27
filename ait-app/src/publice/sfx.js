// publice/sfx.js
import eatUrl from "./assets/gameSoundEffect.mp3";

let ctx, eatBuf;

export async function initSfx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (!eatBuf) {
    const res = await fetch(eatUrl);
    const arr = await res.arrayBuffer();
    eatBuf = await ctx.decodeAudioData(arr);
  }
}
export function getAudioContext() { return ctx; }

export function resumeSfx() {
  ctx?.resume().catch(() => {});
}

// ✅ 효과음 토글 반영 (App.js → sfx.js)
export function setSfxMuted(muted) {
  window.__SNAKE_SFX_MUTED = muted;
}

// ✅ 실제 재생
export function playEat() {
  if (window.__SNAKE_SFX_MUTED) return; // ← 핵심 가드 추가
  if (!ctx || !eatBuf) return;
  const src = ctx.createBufferSource();
  src.buffer = eatBuf;
  const gain = ctx.createGain();
  gain.gain.value = 0.6;
  src.connect(gain).connect(ctx.destination);
  src.start(0);
}

//백그라운드 전환시 BMG 
document.addEventListener("visibilitychange", async() => {
  if (!ctx) return;

  if(document.visibilityState === 'hidden'){
    try {
      await ctx.suspend();
    } catch {}
  } else {
    try {
      await ctx.resume();
    } catch {}
  }
});