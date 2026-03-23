'use client';

import { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  opacity: number;
  pulse: number;
  pulseSpeed: number;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  // Read theme from HTML class — no context import needed
  const [isDark, setIsDark] = useState(true);

  // Watch for theme class changes on <html>
  useEffect(() => {
    const update = () => setIsDark(!document.documentElement.classList.contains('light'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;

    // ── Theme palette (Professional Trading Platform) ──────────
    const BG_STOPS = isDark
      ? [
          { pos: 0,   color: '#01030b' },
          { pos: 0.4, color: '#040914' },
          { pos: 0.7, color: '#070f1c' },
          { pos: 1,   color: '#010205' },
        ]
      : [
          { pos: 0,   color: '#f8fafc' },
          { pos: 0.4, color: '#f1f5f9' },
          { pos: 0.7, color: '#e2e8f0' },
          { pos: 1,   color: '#f8fafc' },
        ];

    const BLOBS = isDark
      ? [
          { x: 0.15, y: 0.20, r: 0.55, c: 'rgba(56,189,248,0.05)'  }, // Cyan
          { x: 0.80, y: 0.70, r: 0.50, c: 'rgba(59,130,246,0.04)'  }, // Blue
          { x: 0.50, y: 0.50, r: 0.45, c: 'rgba(16,185,129,0.03)'  }, // Emerald
          { x: 0.20, y: 0.80, r: 0.40, c: 'rgba(56,189,248,0.04)'  }, // Cyan
          { x: 0.85, y: 0.15, r: 0.38, c: 'rgba(59,130,246,0.05)'  }, // Blue
        ]
      : [
          { x: 0.15, y: 0.20, r: 0.55, c: 'rgba(56,189,248,0.04)'  },
          { x: 0.80, y: 0.70, r: 0.50, c: 'rgba(59,130,246,0.03)'  },
          { x: 0.50, y: 0.40, r: 0.45, c: 'rgba(16,185,129,0.02)'  },
          { x: 0.20, y: 0.80, r: 0.40, c: 'rgba(56,189,248,0.03)'  },
          { x: 0.85, y: 0.15, r: 0.38, c: 'rgba(59,130,246,0.04)'  },
        ];

    const PARTICLE_COLOR = isDark ? '56,189,248'  : '2,132,199'; // Cyan
    const LINE_COLOR     = isDark ? '59,130,246'  : '37,99,235'; // Blue


    // ── Particles ──────────────────────────────────────────────
    const COUNT    = Math.min(Math.floor((W * H) / 12000), 90);
    const MAX_DIST = 160;
    const particles: Particle[] = [];

    const mkP = (): Particle => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.55, vy: (Math.random() - 0.5) * 0.55,
      radius: 1.5 + Math.random() * 2.5,
      opacity: 0.3 + Math.random() * 0.5,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.015 + Math.random() * 0.02,
    });
    for (let i = 0; i < COUNT; i++) particles.push(mkP());

    const blobPhases = BLOBS.map((_, i) => ({ phase: i * Math.PI * 0.7, speed: 0.003 + i * 0.0008 }));

    const resize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W; canvas.height = H;
    };
    window.addEventListener('resize', resize);

    let tick = 0;

    const drawBG = (c: CanvasRenderingContext2D) => {
      const g = c.createLinearGradient(0, 0, W, H);
      for (const s of BG_STOPS) g.addColorStop(s.pos, s.color);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    };

    const drawAurora = (c: CanvasRenderingContext2D) => {
      for (let i = 0; i < BLOBS.length; i++) {
        const blob = BLOBS[i]; const bp = blobPhases[i];
        bp.phase += bp.speed;
        const bx = blob.x * W + Math.sin(bp.phase) * W * 0.06;
        const by = blob.y * H + Math.cos(bp.phase * 0.7) * H * 0.05;
        const br = blob.r * Math.max(W, H);
        const g  = c.createRadialGradient(bx, by, 0, bx, by, br);
        g.addColorStop(0, blob.c);
        g.addColorStop(0.5, blob.c.replace(/[\d.]+\)$/, '0.03)'));
        g.addColorStop(1, 'transparent');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
      }
    };

    const drawGrid = (c: CanvasRenderingContext2D) => {
      c.setLineDash([2, 18]); c.lineWidth = 1;
      c.strokeStyle = isDark ? 'rgba(56,189,248,0.04)' : 'rgba(2,132,199,0.06)';
      for (let x = 0; x < W; x += 80) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
      for (let y = 0; y < H; y += 80) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      c.setLineDash([]);
    };

    const drawParticles = (c: CanvasRenderingContext2D) => {
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.pulse += p.pulseSpeed;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        const pulsed = p.opacity * (0.7 + 0.3 * Math.sin(p.pulse));
        const r      = p.radius  * (0.85 + 0.15 * Math.sin(p.pulse));
        const glow   = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
        glow.addColorStop(0,   `rgba(${PARTICLE_COLOR},${pulsed * 0.5})`);
        glow.addColorStop(0.4, `rgba(${PARTICLE_COLOR},${pulsed * 0.15})`);
        glow.addColorStop(1,   `rgba(${PARTICLE_COLOR},0)`);
        c.fillStyle = glow; c.beginPath(); c.arc(p.x, p.y, r * 4, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2);
        c.fillStyle = `rgba(${PARTICLE_COLOR},${Math.min(1, pulsed + 0.2)})`; c.fill();
      }
    };

    const drawLines = (c: CanvasRenderingContext2D) => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d > MAX_DIST) continue;
          const alpha = (1 - d / MAX_DIST) * (isDark ? 0.20 : 0.18);
          c.strokeStyle = `rgba(${LINE_COLOR},${alpha})`;
          c.lineWidth   = (1 - d / MAX_DIST) * 1.2;
          c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
        }
      }
    };

    const drawHalos = (c: CanvasRenderingContext2D) => {
      if (tick % 3 !== 0) return;
      for (const p of particles) {
        if (p.radius < 3.2) continue;
        const haloR = 20 + 10 * Math.sin(p.pulse);
        const g     = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloR);
        g.addColorStop(0, `rgba(${PARTICLE_COLOR},0.10)`);
        g.addColorStop(1, `rgba(${PARTICLE_COLOR},0)`);
        c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, haloR, 0, Math.PI * 2); c.fill();
      }
    };

    const draw = () => {
      tick++;
      drawBG(ctx); drawAurora(ctx); drawGrid(ctx);
      drawLines(ctx); drawHalos(ctx); drawParticles(ctx);
      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    />
  );
}
