import { useEffect, useRef } from 'react';

/*
 * CandlestickBackground
 * ─────────────────────
 * Full-screen canvas texture of abstract candlestick columns
 * scrolling upward at slightly varied speeds.
 *
 * Pure canvas 2D — no libraries, no DOM elements per candle.
 * Renders behind hero content, pointer-events-none.
 */

// ── Constants ──────────────────────────────────────────────────

const COL_COUNT      = 12;        // columns across the viewport
const CANDLE_WIDTH   = 4;         // body width in px — thin
const WICK_WIDTH     = 1;         // wick line width
const WICK_RANGE     = [4, 10] as const;   // wick extension above/below body
const BODY_MIN_H     = 3;         // minimum body height (doji-like)
const BODY_MAX_H     = 22;        // maximum body height (marubozu-like)
const OPACITY_MIN    = 0.04;
const OPACITY_MAX    = 0.09;
const GAP_MIN        = 12;        // vertical gap between candles — sparse
const GAP_MAX        = 28;
const BASE_SPEED     = 0.15;      // px per frame at 60 fps — glacial is premium
const SPEED_VARIANCE = 0.06;      // ±6% per column

// How many candles to pre-generate per column (enough to tile 2× viewport)
const BUFFER_FACTOR  = 2.5;

// ── Types ──────────────────────────────────────────────────────

interface Candle {
  bodyH: number;
  wickTop: number;
  wickBot: number;
  opacity: number;
  gap: number;           // gap ABOVE this candle
  totalH: number;        // wickTop + bodyH + wickBot
}

interface Column {
  candles: Candle[];
  speed: number;         // px per frame
  offset: number;        // current vertical scroll offset
  stripH: number;        // total rendered height of the strip
  x: number;             // horizontal center position
}

// ── Helpers ────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function generateCandle(): Candle {
  const bodyH   = randInt(BODY_MIN_H, BODY_MAX_H);
  const wickTop = randInt(WICK_RANGE[0], WICK_RANGE[1]);
  const wickBot = randInt(WICK_RANGE[0], WICK_RANGE[1]);
  const opacity = rand(OPACITY_MIN, OPACITY_MAX);
  const gap     = randInt(GAP_MIN, GAP_MAX);
  const totalH  = wickTop + bodyH + wickBot;
  return { bodyH, wickTop, wickBot, opacity, gap, totalH };
}

function buildColumn(viewportH: number, colIndex: number, totalCols: number, viewportW: number): Column {
  // Even spacing across full viewport width
  const sectionW = viewportW / totalCols;
  const x = sectionW * colIndex + sectionW / 2;

  // Speed: base ± variance, slightly randomised per column
  const speedFactor = 1 + (Math.random() * 2 - 1) * SPEED_VARIANCE;
  const speed = BASE_SPEED * speedFactor;

  // Generate enough candles to fill BUFFER_FACTOR × viewport height
  const targetH = viewportH * BUFFER_FACTOR;
  const candles: Candle[] = [];
  let stripH = 0;
  while (stripH < targetH) {
    const c = generateCandle();
    candles.push(c);
    stripH += c.gap + c.totalH;
  }

  // Start offset randomised so columns aren't aligned
  const offset = Math.random() * stripH;

  return { candles, speed, offset, stripH, x };
}

// ── Component ──────────────────────────────────────────────────

export default function CandlestickBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const columnsRef = useRef<Column[]>([]);
  const rafRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const isDarkRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ── Theme detection ──

    function checkDark() {
      isDarkRef.current = document.documentElement.classList.contains('dark');
    }
    checkDark();

    const themeObserver = new MutationObserver(checkDark);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // ── Resize handler ──

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas!.width  = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width  = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };

      // Rebuild columns on resize
      columnsRef.current = Array.from({ length: COL_COUNT }, (_, i) =>
        buildColumn(h, i, COL_COUNT, w)
      );
    }

    resize();
    window.addEventListener('resize', resize);

    // ── Draw loop ──

    function draw() {
      const { w, h } = sizeRef.current;
      ctx!.clearRect(0, 0, w, h);

      const isDark = isDarkRef.current;
      // White candles on dark bg, black candles on light bg
      const rgb = isDark ? '255,255,255' : '0,0,0';

      // Draw each column
      for (const col of columnsRef.current) {
        // Advance scroll
        col.offset += col.speed;
        if (col.offset >= col.stripH) col.offset -= col.stripH;

        // We draw from a virtual Y that wraps around the strip
        let y = -col.offset;

        // We need to draw enough to cover viewport — may need 2 passes
        for (let pass = 0; pass < 2; pass++) {
          for (const c of col.candles) {
            const candleTop = y + c.gap;
            const wickTopY  = candleTop;
            const bodyTopY  = candleTop + c.wickTop;
            const bodyBotY  = bodyTopY + c.bodyH;
            const wickBotY  = bodyBotY + c.wickBot;

            // Only draw if in viewport
            if (wickBotY > 0 && wickTopY < h) {
              const color = `rgba(${rgb},${c.opacity})`;
              ctx!.fillStyle   = color;
              ctx!.strokeStyle = color;

              // Wick — single 1px line, top to bottom
              ctx!.beginPath();
              ctx!.moveTo(col.x, wickTopY);
              ctx!.lineTo(col.x, wickBotY);
              ctx!.lineWidth = WICK_WIDTH;
              ctx!.stroke();

              // Body — filled rectangle
              ctx!.fillRect(
                col.x - CANDLE_WIDTH / 2,
                bodyTopY,
                CANDLE_WIDTH,
                c.bodyH
              );
            }

            y = wickBotY;
            if (y > h) break; // past viewport, stop this pass
          }

          // Second pass: wrap around to fill remaining gap
          if (pass === 0) y = -col.offset + col.stripH;
        }
      }

      // ── Radial mask ──
      // Full opacity at edges, fully transparent in center-bottom quadrant.
      // We use a large radial gradient as a "clear" layer via destination-out.
      ctx!.save();
      ctx!.globalCompositeOperation = 'destination-out';

      const cx = w * 0.5;
      const cy = h * 0.58;   // where the headline lives
      const rInner = Math.min(w, h) * 0.15;
      const rOuter = Math.min(w, h) * 0.6;

      const grad = ctx!.createRadialGradient(cx, cy, rInner, cx, cy, rOuter);
      grad.addColorStop(0, 'rgba(0,0,0,1)');    // fully erase in centre
      grad.addColorStop(1, 'rgba(0,0,0,0)');    // no erase at edges

      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, w, h);
      ctx!.restore();

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      themeObserver.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
