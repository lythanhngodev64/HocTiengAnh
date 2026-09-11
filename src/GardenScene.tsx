import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import './GardenScene.css';

const artworkCache = new Map<string, Promise<HTMLImageElement[]>>();
function loadArtwork(base: string) {
  let pending = artworkCache.get(base);
  if (!pending) {
    pending = Promise.all(
      [
        'garden-motion.png',
        'motion-atlas.png',
        'rabbit.png',
        'rabbit-wave.png',
      ].map(async (file) => {
        const image = new Image();
        image.src = `${base}images/garden/${file}`;
        await image.decode();
        return image;
      }),
    );
    artworkCache.set(base, pending);
    pending.catch(() => artworkCache.delete(base));
  }
  return pending;
}

// Only decorative state lives here: nothing is written to learning progress.
export function GardenScene() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const rabbitButton = useRef<HTMLButtonElement>(null);
  const butterflyButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const controller = useRef({
    toggle: () => {},
    react: (_index: number) => {},
  });
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(true);
  const base = import.meta.env.BASE_URL;

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let stopped = media.matches;
    let disposed = false;
    let loaded = false;
    let frame = 0;
    let last = 0;
    let clock = 0;
    let width = 1;
    let height = 1;
    let reactions = [0, 0, 0];
    let staticPoses = [false, false, false];
    let background: HTMLImageElement,
      atlas: HTMLImageElement,
      rabbit: HTMLImageElement,
      wave: HTMLImageElement;
    const positionButton = (
      button: HTMLButtonElement | null,
      x: number,
      y: number,
      w: number,
      h: number,
    ) => {
      if (!button) return;
      button.style.transform = `translate(${x}px, ${y}px)`;
      button.style.width = `${w}px`;
      button.style.height = `${h}px`;
    };
    const sprite = (
      cell: number,
      x: number,
      y: number,
      w: number,
      h: number,
      rotation = 0,
      mirror = false,
    ) => {
      context.save();
      context.translate(x + w / 2, y + h / 2);
      context.rotate(rotation);
      context.scale(mirror ? -1 : 1, 1);
      context.drawImage(
        atlas,
        ((cell % 4) * atlas.width) / 4,
        (Math.floor(cell / 4) * atlas.height) / 2,
        atlas.width / 4,
        atlas.height / 2,
        -w / 2,
        -h / 2,
        w,
        h,
      );
      context.restore();
    };
    const draw = () => {
      if (!loaded || disposed) return;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      const scale = Math.max(
        width / background.width,
        height / background.height,
      );
      context.drawImage(
        background,
        (width - background.width * scale) / 2,
        (height - background.height * scale) / 2,
        background.width * scale,
        background.height * scale,
      );
      const mobile = width <= 600;
      const t = clock / 1000;
      // Clouds and birds stay in the upper sky; all UI is on a higher layer.
      for (let i = 0; i < 2; i++) {
        const w = width * (mobile ? 0.36 : 0.23);
        const x =
          ((width * (0.3 + i * 0.45) + t * (i ? 5 : 8)) % (width + w)) - w;
        sprite(6, x, height * (0.04 + i * 0.12), w, w * 0.65);
      }
      const branchW = width * (mobile ? 0.3 : 0.24);
      sprite(
        7,
        -branchW * 0.14,
        -branchW * 0.12,
        branchW,
        branchW * 0.8,
        Math.sin(t * 0.8) * 0.035,
      );
      sprite(
        7,
        width - branchW * 0.85,
        -branchW * 0.1,
        branchW,
        branchW * 0.8,
        Math.sin(t * 0.7 + 2) * 0.035,
        true,
      );
      for (let i = 0; i < (mobile ? 1 : 2); i++) {
        const phase = ((t + i * 6) % 14) / 10;
        if (phase > 1) continue;
        const size = mobile ? 55 : 76;
        const x = i ? width * (1 - phase) : width * phase - size;
        const y =
          height * 0.035 + Math.sin(phase * Math.PI) * height * 0.07 + i * 17;
        sprite(
          i * 2 + (Math.floor(t * 5) % 2),
          x,
          y,
          size,
          size,
          Math.sin(t * 2) * 0.07,
          Boolean(i),
        );
      }
      const rh = Math.min(height * 0.62, width * (mobile ? 0.46 : 0.4));
      const rw = (rh * rabbit.width) / rabbit.height;
      const rx = width - rw - width * 0.025;
      const active = reactions[0] > clock;
      const waving =
        stopped || media.matches
          ? staticPoses[0]
          : active
            ? Math.floor(t * 5) % 2 === 0
            : t % 11 < 1.5;
      const ry =
        height -
        rh -
        height * 0.04 -
        (active ? Math.abs(Math.sin(t * 7)) * 7 : Math.sin(t * 1.7) * 3);
      context.save();
      context.translate(rx + rw / 2, ry + rh);
      context.rotate(Math.sin(t) * 0.018);
      context.drawImage(waving ? wave : rabbit, -rw / 2, -rh, rw, rh);
      context.restore();
      positionButton(rabbitButton.current, rx, ry, rw, rh);
      for (let i = 0; i < 2; i++) {
        const button = butterflyButtons.current[i];
        if (button) button.hidden = mobile && i === 1;
        if (mobile && i === 1) continue;
        const size = mobile ? 54 : 66;
        const remaining = reactions[i + 1] - clock;
        const loop = remaining > 0 ? (1 - remaining / 2000) * Math.PI * 2 : 0;
        const x =
          width * (mobile ? 0.55 : i ? 0.51 : 0.13) +
          Math.sin(t * 0.7 + i) * (mobile ? 4 : 12) +
          Math.sin(loop) * (mobile ? 10 : 28);
        const y =
          height -
          size -
          (mobile ? 65 : 80) +
          Math.sin(t * 1.3 + i) * 7 -
          (1 - Math.cos(loop)) * (mobile ? 8 : 20);
        sprite(
          staticPoses[i + 1] ? 5 : 4 + (Math.floor(t * 4 + i) % 2),
          x,
          y,
          size,
          size,
          Math.sin(t + i) * 0.12,
          Boolean(i),
        );
        positionButton(button, x, y, size, size);
      }
    };
    const tick = (now: number) => {
      if (disposed || stopped || document.hidden || !loaded) return;
      if (last) clock += Math.min(now - last, 50);
      last = now;
      draw();
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      last = 0;
      draw();
      if (loaded && !disposed && !stopped && !document.hidden)
        frame = requestAnimationFrame(tick);
    };
    const resize = () => {
      const rect = element.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      element.width = Math.max(1, Math.round(width * ratio));
      element.height = Math.max(1, Math.round(height * ratio));
      draw();
    };
    const changePreference = () => {
      stopped = media.matches;
      setPaused(stopped);
      reactions = [0, 0, 0];
      staticPoses = [false, false, false];
      sync();
    };
    controller.current = {
      toggle: () => {
        stopped = !stopped;
        reactions = [0, 0, 0];
        staticPoses = [false, false, false];
        setPaused(stopped);
        sync();
      },
      react: (index) => {
        if (!loaded || disposed) return;
        if (stopped || media.matches) {
          staticPoses[index] = !staticPoses[index];
          draw();
        } else if (reactions[index] <= clock) {
          reactions[index] = clock + 2000;
        }
      },
    };
    setPaused(stopped);
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    media.addEventListener('change', changePreference);
    document.addEventListener('visibilitychange', sync);
    resize();
    loadArtwork(base)
      .then((images) => {
        if (disposed) return;
        [background, atlas, rabbit, wave] = images;
        loaded = true;
        setReady(true);
        sync();
      })
      .catch(() => {
        // Keep the existing static garden and rabbit if any new artwork fails.
        if (!disposed) setReady(false);
      });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      media.removeEventListener('change', changePreference);
      document.removeEventListener('visibilitychange', sync);
      controller.current = { toggle: () => {}, react: () => {} };
    };
  }, [base]);

  return (
    <>
      <canvas
        ref={canvas}
        className="home-canvas"
        aria-hidden="true"
        style={{ visibility: ready ? 'visible' : 'hidden' }}
      />
      {!ready && (
        <img
          className="home-rabbit"
          src={`${base}images/garden/rabbit.png`}
          alt=""
        />
      )}
      <div
        className="garden-interactions"
        style={{ visibility: ready ? 'visible' : 'hidden' }}
      >
        <button
          ref={rabbitButton}
          className="garden-animal-hit"
          aria-label="Chạm thỏ để vẫy tay"
          title="Chạm thỏ để vẫy tay"
          onClick={() => controller.current.react(0)}
        />
        {[0, 1].map((i) => (
          <button
            key={i}
            ref={(button) => {
              butterflyButtons.current[i] = button;
            }}
            className="garden-animal-hit garden-butterfly-hit"
            aria-label={`Chạm bướm ${i + 1} để bay một vòng`}
            title="Chạm bướm để bay một vòng"
            onClick={() => controller.current.react(i + 1)}
          />
        ))}
        <button
          className="garden-motion-toggle"
          onClick={() => controller.current.toggle()}
          aria-pressed={!paused}
        >
          {paused ? (
            <Play size={16} aria-hidden="true" />
          ) : (
            <Pause size={16} aria-hidden="true" />
          )}
          {paused ? 'Bật chuyển động' : 'Tạm dừng chuyển động'}
        </button>
      </div>
    </>
  );
}
