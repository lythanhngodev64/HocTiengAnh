import { GardenScene } from './GardenScene';
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
  const base = import.meta.env.BASE_URL;
  return (
    <section
      className="garden-home"
      aria-labelledby="home-heading"
      style={{ backgroundImage: `url(${base}images/garden/garden.png)` }}
    >
      <GardenScene />
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
