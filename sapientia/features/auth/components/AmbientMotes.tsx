'use client';

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/shared/services/motion.service';
import styles from '../styles/Login.module.css';

const MAX_DRIFTING = 24;
const POINTER_SPAWN_CHANCE = 0.35;

interface Mote {
  x: number;
  y: number;
  radius: number;
  life: number;
  decay: number;
  vx: number;
  vy: number;
  alpha: number;
}

/** Drifting motes rise from the bottom; pointer motes are brighter, scatter and fade fast. */
function makeMote(x: number, y: number, fromPointer: boolean): Mote {
  return {
    x,
    y,
    radius: fromPointer ? Math.random() * 2 + 1 : Math.random() * 1.5 + 0.5,
    life: 1,
    decay: fromPointer ? 0.025 : 0.005,
    vx: (Math.random() - 0.5) * (fromPointer ? 1.2 : 0.4),
    vy: fromPointer ? (Math.random() - 0.5) * 1.2 : -(Math.random() * 0.5 + 0.2),
    alpha: fromPointer ? 0.8 : Math.random() * 0.4 + 0.15,
  };
}

/** The prototype's gold dust over the classroom. Decorative only, and off when the reader asks for reduced motion. */
export function AmbientMotes() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || prefersReducedMotion()) return;

    let motes: Mote[] = [];
    let frame = 0;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (Math.random() < POINTER_SPAWN_CHANCE) motes.push(makeMote(event.clientX, event.clientY, true));
    };
    const draw = () => {
      const light = document.documentElement.dataset.theme === 'light';
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (motes.length < MAX_DRIFTING && Math.random() < 0.15) motes.push(makeMote(Math.random() * canvas.width, canvas.height + 10, false));
      context.fillStyle = light ? '#c89d38' : '#fce5a3';
      context.shadowColor = light ? '#b88628' : '#e5b955';
      context.shadowBlur = light ? 4 : 6;
      for (const mote of motes) {
        mote.x += mote.vx;
        mote.y += mote.vy;
        mote.life -= mote.decay;
        if (mote.life <= 0) continue;
        context.globalAlpha = mote.life * mote.alpha;
        context.beginPath();
        context.arc(mote.x, mote.y, mote.radius, 0, Math.PI * 2);
        context.fill();
      }
      motes = motes.filter((mote) => mote.life > 0);
      frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.motes} aria-hidden="true" />;
}
