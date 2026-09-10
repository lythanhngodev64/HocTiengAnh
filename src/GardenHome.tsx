import { useEffect, useRef, useState } from 'react';
import { BookOpen, Sparkles, ChartNoAxesCombined } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GardenHome({
  onLearn,
  onTest,
  onJourney,
}: {
  onLearn: () => void;
  onTest: () => void;
  onJourney: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [animated, setAnimated] = useState(false);
  const base = import.meta.env.BASE_URL;
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;
    const rabbit = new Image();
    rabbit.src = `${base}images/garden/rabbit.png`;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0,
      disposed = false,
      start = 0;
    const draw = (time: number) => {
      const { width, height } = element.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio || 1, 2);
      if (
        element.width !== Math.round(width * ratio) ||
        element.height !== Math.round(height * ratio)
      ) {
        element.width = Math.round(width * ratio);
        element.height = Math.round(height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      const phase = (time - start) / 1000;
      const tall = Math.min(height * 0.62, width * 0.4);
      const wide = (tall * rabbit.width) / rabbit.height;
      const x = width < 600 ? width - wide - 2 : width * 0.72;
      const y = height - tall - height * 0.04 + Math.sin(phase * 1.7) * 4;
      context.save();
      context.translate(x + wide / 2, y + tall);
      context.rotate(Math.sin(phase) * 0.022);
      context.drawImage(rabbit, -wide / 2, -tall, wide, tall);
      context.restore();
      frame = requestAnimationFrame(draw);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      const run =
        !disposed &&
        !document.hidden &&
        !media.matches &&
        rabbit.complete &&
        rabbit.naturalWidth > 0;
      setAnimated(run);
      if (run) {
        start = performance.now();
        frame = requestAnimationFrame(draw);
      } else context.clearRect(0, 0, element.width, element.height);
    };
    rabbit.onload = sync;
    media.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      rabbit.onload = null;
      media.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [base]);
  return (
    <section
      className="garden-home"
      aria-labelledby="home-heading"
      style={{ backgroundImage: `url(${base}images/garden/garden.png)` }}
    >
      <canvas ref={canvas} className="home-canvas" aria-hidden="true" />
      {!animated && (
        <img
          className="home-rabbit"
          src={`${base}images/garden/rabbit.png`}
          alt=""
        />
      )}
      <div className="home-content">
        <span className="home-eyebrow">ENGLISH GARDEN</span>
        <h1 id="home-heading">
          Một khu vườn nhỏ.
          <br />
          Bao điều bé khám phá!
        </h1>
        <p>Nghe, chạm và cùng học nhé.</p>
        <div className="home-actions">
          <Button className="home-learn" onClick={onLearn}>
            <BookOpen aria-hidden="true" />
            <span>
              Học<small>Làm quen từng chút</small>
            </span>
          </Button>
          <Button className="home-test" onClick={onTest}>
            <Sparkles aria-hidden="true" />
            <span>
              Kiểm tra<small>Thử tài nghe của bé</small>
            </span>
          </Button>
        </div>
        <Button variant="outline" className="home-journey" onClick={onJourney}>
          <ChartNoAxesCombined aria-hidden="true" /> Quá trình học
        </Button>
      </div>
    </section>
  );
}
