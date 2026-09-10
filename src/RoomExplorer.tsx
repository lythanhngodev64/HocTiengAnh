import { useState } from 'react';
import {
  BedDouble,
  Sofa,
  CookingPot,
  Bath,
  Hand,
  Search,
  Volume2,
  Turtle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { rooms } from './room-scenes.mjs';
import { wordById, type VocabularyWord } from './vocabulary';

const roomIcons = {
  bedroom: BedDouble,
  living: Sofa,
  kitchen: CookingPot,
  bathroom: Bath,
};

export function RoomExplorer({
  onSpeak,
  onStop,
  onGuide,
}: {
  onSpeak: (word: VocabularyWord, slow?: boolean) => void;
  onStop: () => void;
  onGuide: (id: string) => void;
}) {
  const [roomId, setRoomId] = useState('bedroom');
  const [mode, setMode] = useState<'explore' | 'find'>('explore');
  const [targetIndex, setTargetIndex] = useState(0);
  const [found, setFound] = useState(false);
  const [highlight, setHighlight] = useState('');
  const [message, setMessage] = useState(
    'Con chạm vào đồ vật để nghe tên nhé.',
  );
  const room = rooms.find((item) => item.id === roomId)!;
  const target = room.targets[targetIndex];
  function reset(nextMode: 'explore' | 'find') {
    onStop();
    setMode(nextMode);
    setTargetIndex(0);
    setFound(false);
    setHighlight('');
    setMessage(
      nextMode === 'explore'
        ? 'Con chạm vào đồ vật để nghe tên nhé.'
        : 'Chạm “Nghe đồ vật” rồi tìm trong phòng nhé.',
    );
  }
  return (
    <section className="room-explorer" aria-labelledby="room-title">
      <h2 id="room-title" className="sr-only">
        Khám phá căn phòng
      </h2>
      <div
        className="room-tabs room-selector"
        role="group"
        aria-label="Chọn căn phòng"
      >
        {rooms.map((item) => {
          const Icon = roomIcons[item.id as keyof typeof roomIcons];
          return (
            <Button
              key={item.id}
              variant="outline"
              aria-pressed={roomId === item.id}
              onClick={() => {
                reset(mode);
                setRoomId(item.id);
              }}
            >
              <Icon aria-hidden="true" /> <span>{item.label}</span>
            </Button>
          );
        })}
      </div>
      <div className="room-play-layout">
        <div className="room-controls">
          <div className="room-control-heading">
            <h3>{room.label}</h3>
            <span>{room.targets.length} đồ vật</span>
          </div>
          <div
            className="room-tabs room-mode-switch"
            role="group"
            aria-label="Chọn cách chơi"
          >
            <Button
              variant="outline"
              aria-pressed={mode === 'explore'}
              onClick={() => reset('explore')}
            >
              <Hand aria-hidden="true" /> Chạm để nghe
            </Button>
            <Button
              variant="outline"
              aria-pressed={mode === 'find'}
              onClick={() => reset('find')}
            >
              <Search aria-hidden="true" /> Nghe và tìm
            </Button>
          </div>
          {mode === 'find' && (
            <div className="room-listen-actions">
              <Button
                className="listen-button"
                onClick={() => onSpeak(wordById(target.wordId)!)}
              >
                <Volume2 aria-hidden="true" /> Nghe đồ vật
              </Button>
              <Button
                variant="outline"
                onClick={() => onSpeak(wordById(target.wordId)!, true)}
              >
                <Turtle aria-hidden="true" /> Nghe chậm
              </Button>
            </div>
          )}
          <div
            className={`room-feedback ${mode === 'find' && found ? 'is-found' : ''}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {mode === 'find' && found ? (
              <Sparkles aria-hidden="true" />
            ) : mode === 'find' ? (
              <Search aria-hidden="true" />
            ) : (
              <Hand aria-hidden="true" />
            )}
            <p>{message}</p>
          </div>
          {mode === 'find' && found && (
            <Button
              className="room-next"
              onClick={() => {
                onStop();
                setTargetIndex((targetIndex + 1) % room.targets.length);
                setFound(false);
                setHighlight('');
                setMessage('Đồ vật mới đã sẵn sàng. Con nghe rồi tìm nhé.');
              }}
            >
              Tìm đồ vật tiếp <ArrowRight aria-hidden="true" />
            </Button>
          )}
          <div className="room-control-footer">
            <Button variant="outline" onClick={() => onGuide(mode)}>
              <Volume2 aria-hidden="true" /> Hướng dẫn
            </Button>
            <p className="study-note">
              Chơi khám phá,
              <br />
              không chấm điểm.
            </p>
          </div>
        </div>
        <div className="room-picture">
          <img
            src={`${import.meta.env.BASE_URL}${room.image}`}
            alt={`Tranh ${room.label} với năm đồ vật để khám phá`}
            draggable={false}
          />
          {room.targets.map((item, index) => {
            const [x, y, width, height] = item.box;
            const word = wordById(item.wordId)!;
            return (
              <button
                key={item.wordId}
                className={`room-hotspot ${highlight === item.wordId ? 'is-highlighted' : ''}`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                }}
                aria-label={
                  mode === 'explore'
                    ? `${word.word} — ${word.meaning}`
                    : `Đồ vật ${index + 1}`
                }
                onClick={() => {
                  if (mode === 'explore') {
                    setHighlight(word.id);
                    onSpeak(word);
                    setMessage(`${word.word} — ${word.meaning}`);
                  } else if (!found && word.id === target.wordId) {
                    setFound(true);
                    setHighlight(word.id);
                    onSpeak(word);
                    setMessage(`Đúng rồi! ${word.word} — ${word.meaning}.`);
                  } else if (!found) {
                    onStop();
                    setHighlight(target.wordId);
                    setMessage(
                      'Mình nghe lại nhé. Đồ vật cần tìm có viền sáng.',
                    );
                  }
                }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
