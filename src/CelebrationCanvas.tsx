import { useEffect, useRef } from 'react';

/** A short, silent celebration. Never intercepts taps or repeats on rerender. */
export function CelebrationCanvas({ score }: { score: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || score < 70) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.scale(ratio, ratio);
    const colors = ['#f4b400', '#e85d75', '#36a884', '#498ee0', '#a976d3'];
    const count = score === 100 ? 140 : score >= 90 ? 100 : 65;
    const pieces = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: -20 - Math.random() * height * 0.7,
      speed: 65 + Math.random() * 70,
      drift: (Math.random() - 0.5) * 45,
      angle: Math.random() * Math.PI,
      size: 5 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    let frame = 0;
    let started = 0;
    let previous = 0;
    const stop = () => {
      cancelAnimationFrame(frame);
      context.clearRect(0, 0, width, height);
    };
    const draw = (time: number) => {
      if (!started) {
        started = time;
        previous = time;
      }
      const elapsed = time - started;
      if (elapsed >= 4500 || motion.matches) {
        stop();
        return;
      }
      const delta = Math.min((time - previous) / 1000, 0.05);
      previous = time;
      context.clearRect(0, 0, width, height);
      context.globalAlpha = Math.min(0.85, (4500 - elapsed) / 900);
      for (const piece of pieces) {
        piece.x += piece.drift * delta;
        piece.y += piece.speed * delta;
        piece.angle += delta * 2;
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.angle);
        context.fillStyle = piece.color;
        context.fillRect(
          -piece.size / 2,
          -piece.size / 4,
          piece.size,
          piece.size / 2,
        );
        context.restore();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    motion.addEventListener('change', stop);
    return () => {
      stop();
      motion.removeEventListener('change', stop);
    };
  }, [score]);

  return (
    <canvas ref={canvasRef} className="celebration-canvas" aria-hidden="true" />
  );
}
