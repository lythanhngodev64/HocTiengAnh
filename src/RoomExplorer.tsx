import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { rooms } from './room-scenes.mjs';
import { wordById, type VocabularyWord } from './vocabulary';

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
      <h2 id="room-title">Khám phá căn phòng</h2>
      <div className="room-tabs" aria-label="Chọn căn phòng">
        {rooms.map((item) => (
          <Button
            key={item.id}
            variant="outline"
            aria-pressed={roomId === item.id}
            onClick={() => {
              reset(mode);
              setRoomId(item.id);
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <div className="room-play-layout">
        <div className="room-controls">
          <h3>{room.label}</h3>
          <div className="room-tabs">
            <Button
              variant="outline"
              aria-pressed={mode === 'explore'}
              onClick={() => reset('explore')}
            >
              Chạm để nghe
            </Button>
            <Button
              variant="outline"
              aria-pressed={mode === 'find'}
              onClick={() => reset('find')}
            >
              Nghe và tìm
            </Button>
          </div>
          <Button variant="outline" onClick={() => onGuide(mode)}>
            🔊 Hướng dẫn
          </Button>
          {mode === 'find' && (
            <>
              <Button
                className="listen-button"
                onClick={() => onSpeak(wordById(target.wordId)!)}
              >
                🔊 Nghe đồ vật
              </Button>
              <Button
                variant="outline"
                onClick={() => onSpeak(wordById(target.wordId)!, true)}
              >
                🐢 Nghe chậm
              </Button>
            </>
          )}
          <p role="status">{message}</p>
          {mode === 'find' && found && (
            <Button
              onClick={() => {
                onStop();
                setTargetIndex((targetIndex + 1) % room.targets.length);
                setFound(false);
                setHighlight('');
                setMessage('Đồ vật mới đã sẵn sàng. Con nghe rồi tìm nhé.');
              }}
            >
              Tìm đồ vật tiếp →
            </Button>
          )}
          <p className="study-note">Chơi khám phá, không chấm điểm.</p>
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
