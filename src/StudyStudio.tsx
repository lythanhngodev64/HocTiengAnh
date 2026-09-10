import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { WordVisual } from './WordVisual';
import { RoomExplorer } from './RoomExplorer';
import { themes, groups, wordById, type VocabularyWord } from './vocabulary';
import { selectLessonWords, lessonOptions } from './learning.mjs';
import { type LearningProgress, type TestAnswer } from './LearningJourney';

type Mode = 'name' | 'sound';
type Stage = 'setup' | 'intro' | 'practice' | 'complete' | 'rooms';
type Props = {
  initialTheme: string;
  initialCount: number;
  onThemeChange: (id: string) => void;
  onCountChange: (count: number) => void;
  progress: LearningProgress;
  phonicsReady: boolean;
  onSpeak: (word: VocabularyWord, slow: boolean, mode: Mode) => void;
  onStop: () => void;
  onGuide: (id: string) => void;
  onDirty: (dirty: boolean) => void;
  onHome: () => void;
  onAnswer: (wordId: string, mode: Mode, firstTryCorrect: boolean) => void;
  onMistake: (wordId: string, mode: Mode) => void;
  onComplete: (entry: {
    id: string;
    activity: 'learn';
    themeId: string;
    mode: Mode;
    completedAt: string;
    answers: TestAnswer[];
  }) => void;
};
export function StudyStudio(props: Props) {
  const [themeId, setThemeId] = useState(props.initialTheme);
  const [mode, setMode] = useState<Mode>('name');
  const [count, setCount] = useState(props.initialCount);
  const [stage, setStage] = useState<Stage>('setup');
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(false);
  const [wrong, setWrong] = useState<string[]>([]);
  const [picker, setPicker] = useState(false);
  const [groupId, setGroupId] = useState('home');
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [showDemo, setShowDemo] = useState(() => {
    try {
      return localStorage.getItem('english-garden.lesson-demo-seen') !== 'yes';
    } catch {
      return true;
    }
  });
  const [demoStep, setDemoStep] = useState(0);
  const session = useRef({
    id: '',
    answers: [] as TestAnswer[],
    mistake: false,
    finished: false,
  });
  const theme = themes.find((item) => item.id === themeId)!;
  const target = words[index];
  const options = useMemo(
    () =>
      target
        ? (lessonOptions(words, target, count, mode) as VocabularyWord[])
        : [],
    [words, target, count, mode],
  );
  const inProgress = stage === 'intro' || stage === 'practice';
  function request(action: () => void) {
    props.onStop();
    if (inProgress) setPending(() => action);
    else action();
  }
  function setup() {
    props.onStop();
    props.onDirty(false);
    setStage('setup');
  }
  function start() {
    props.onStop();
    const selected = selectLessonWords(
      themeId,
      props.progress,
      mode,
    ) as VocabularyWord[];
    setWords(selected);
    setIndex(0);
    setCorrect(false);
    setWrong([]);
    session.current = {
      id: crypto.randomUUID(),
      answers: [],
      mistake: false,
      finished: false,
    };
    props.onDirty(true);
    setStage('intro');
  }
  function next() {
    props.onStop();
    if (stage === 'intro') {
      if (index + 1 === words.length) {
        setStage('practice');
        setIndex(0);
      } else setIndex(index + 1);
    } else if (stage === 'practice' && correct && !session.current.finished) {
      if (index + 1 === words.length) {
        session.current.finished = true;
        props.onComplete({
          id: session.current.id,
          activity: 'learn',
          themeId,
          mode,
          completedAt: new Date().toISOString(),
          answers: [...session.current.answers],
        });
        props.onDirty(false);
        setStage('complete');
      } else {
        setIndex(index + 1);
        setCorrect(false);
        setWrong([]);
        session.current.mistake = false;
      }
    }
  }
  function answer(word: VocabularyWord) {
    if (
      correct ||
      session.current.answers.some((item) => item.wordId === target.id)
    )
      return;
    props.onStop();
    if (word.id === target.id) {
      const firstTryCorrect = !session.current.mistake;
      session.current.answers.push({ wordId: target.id, firstTryCorrect });
      props.onAnswer(target.id, mode, firstTryCorrect);
      setCorrect(true);
      props.onSpeak(target, false, mode);
    } else {
      props.onMistake(target.id, mode);
      session.current.mistake = true;
      setWrong((current) => [...new Set([...current, word.id])]);
    }
  }
  return (
    <section className="study-studio" aria-labelledby="study-title">
      <div className="study-heading">
        <div>
          <p className="section-kicker">CÙNG BÉ KHÁM PHÁ</p>
          <h1 id="study-title">
            {stage === 'rooms'
              ? 'Ngôi nhà của bé'
              : `${theme.icon} ${theme.label}`}
          </h1>
        </div>
        <div className="study-toolbar">
          <Button variant="outline" onClick={() => request(setup)}>
            Bài học nhỏ
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              request(() => {
                props.onDirty(false);
                setStage('rooms');
              })
            }
          >
            Khám phá căn phòng
          </Button>
        </div>
      </div>
      {stage === 'setup' && (
        <div className="study-setup">
          <h2>Mỗi lần một chút, bé học thật vui!</h2>
          <p>Làm quen với tối đa 5 từ, rồi cùng chơi nghe – chọn hình.</p>
          <div className="study-toolbar">
            <Button
              variant="outline"
              onClick={() => {
                setGroupId(theme.groupId);
                setPicker(true);
              }}
            >
              Đổi chủ đề
            </Button>
            <fieldset>
              <legend>Số hình lựa chọn</legend>
              {[2, 3, 4].map((n) => (
                <Button
                  key={n}
                  variant="outline"
                  aria-pressed={count === n}
                  onClick={() => {
                    setCount(n);
                    props.onCountChange(n);
                  }}
                >
                  {n} hình
                </Button>
              ))}
            </fieldset>
          </div>
          {themeId === 'alphabet' && (
            <fieldset className="study-toolbar">
              <legend>Cách luyện chữ cái</legend>
              <Button
                variant="outline"
                aria-pressed={mode === 'name'}
                onClick={() => setMode('name')}
              >
                Tên chữ
              </Button>
              <Button
                variant="outline"
                disabled={!props.phonicsReady}
                aria-pressed={mode === 'sound'}
                onClick={() => setMode('sound')}
              >
                Âm chữ
              </Button>
            </fieldset>
          )}
          <Button className="study-start" onClick={start}>
            ▶ Bắt đầu học
          </Button>
          <Button variant="outline" onClick={() => props.onGuide('intro')}>
            🔊 Hướng dẫn
          </Button>
          {showDemo && (
            <div className="study-demo">
              <strong>Chơi thế nào nhỉ?</strong>
              <div className="demo-interaction">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDemoStep(1);
                    props.onSpeak(wordById('cat')!, false, 'name');
                  }}
                >
                  ① 🔊 Nghe thử
                </Button>
                <button
                  className={`demo-picture ${demoStep === 1 ? 'demo-point' : ''}`}
                  onClick={() => {
                    setDemoStep(2);
                    props.onStop();
                  }}
                  aria-label="② Chạm hình con mèo để chơi thử"
                >
                  <WordVisual word={wordById('cat')!} />
                  <span>
                    {demoStep === 2 ? '✓ Đúng rồi!' : '② 👆 Chạm hình'}
                  </span>
                </button>
                <span role="status">
                  {demoStep === 0
                    ? 'Con thử chạm vào loa nhé.'
                    : demoStep === 1
                      ? 'Con vừa nghe “cat”. Chạm con mèo nhé.'
                      : 'Giỏi lắm! Bé đã biết cách chơi rồi.'}
                </span>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDemo(false);
                  props.onStop();
                  try {
                    localStorage.setItem(
                      'english-garden.lesson-demo-seen',
                      'yes',
                    );
                  } catch {
                    /* Optional device preference only. */
                  }
                }}
              >
                Bé đã hiểu rồi
              </Button>
            </div>
          )}
        </div>
      )}
      {(stage === 'intro' || stage === 'practice') && target && (
        <div className="study-lesson">
          <div className="study-step">
            <strong>{stage === 'intro' ? 'Làm quen' : 'Cùng chơi'}</strong>
            <span>
              {index + 1}/{words.length}
            </span>
            <Button
              variant="outline"
              onClick={() =>
                props.onGuide(stage === 'intro' ? 'intro' : 'choose')
              }
            >
              🔊 Hướng dẫn
            </Button>
          </div>
          <div className="study-toolbar">
            <Button
              className="listen-button"
              onClick={() => props.onSpeak(target, false, mode)}
            >
              🔊{' '}
              {themeId === 'alphabet'
                ? mode === 'sound'
                  ? 'Nghe âm chữ'
                  : 'Nghe tên chữ'
                : 'Nghe từ'}
            </Button>
            <Button
              variant="outline"
              onClick={() => props.onSpeak(target, true, mode)}
            >
              🐢 Nghe chậm
            </Button>
          </div>
          {stage === 'intro' ? (
            <button
              className="study-intro-card"
              onClick={() => props.onSpeak(target, false, mode)}
              aria-label={`Nghe ${target.word}`}
            >
              <WordVisual word={target} />
              <strong lang="en">{target.word}</strong>
              <span>{target.meaning}</span>
            </button>
          ) : (
            <div className={`study-choices choices-${options.length}`}>
              {options.map((word, i) => (
                <button
                  key={word.id}
                  className={`study-choice ${wrong.includes(word.id) ? 'is-wrong' : ''} ${correct && word.id === target.id ? 'is-correct' : ''}`}
                  disabled={correct || wrong.includes(word.id)}
                  onClick={() => answer(word)}
                  aria-label={`Hình ${i + 1}`}
                >
                  <WordVisual word={word} />
                  <span>{correct && word.id === target.id ? '✓' : i + 1}</span>
                </button>
              ))}
            </div>
          )}
          <p className="study-feedback" role="status">
            {stage === 'intro'
              ? 'Con chạm hình để nghe, rồi chạm Tiếp nhé.'
              : correct
                ? `Đúng rồi! ${target.word} — ${target.meaning}.`
                : wrong.length
                  ? 'Mình nghe lại thật chậm rồi thử tiếp nhé.'
                  : 'Con nghe rồi chạm vào hình nhé.'}
          </p>
          <Button
            className="study-next"
            disabled={stage === 'practice' && !correct}
            onClick={next}
          >
            {index + 1 === words.length
              ? stage === 'intro'
                ? 'Cùng chơi →'
                : 'Hoàn thành ★'
              : 'Tiếp →'}
          </Button>
        </div>
      )}
      {stage === 'complete' && (
        <div className="study-complete">
          <span aria-hidden="true">🌼</span>
          <h2>Con đã luyện xong {words.length} từ!</h2>
          <p>
            {session.current.answers.every((item) => item.firstTryCorrect)
              ? 'Con nhận ra tất cả ngay lần đầu. Giỏi lắm!'
              : 'Con đã kiên trì nghe và thử lại. Giỏi lắm!'}
          </p>
          <div className="study-toolbar">
            <Button onClick={props.onHome}>Về khu vườn</Button>
            <Button variant="outline" onClick={setup}>
              Chọn bài tiếp
            </Button>
            <Button variant="outline" onClick={() => props.onGuide('complete')}>
              🔊 Nghe lời khen
            </Button>
          </div>
        </div>
      )}
      {stage === 'rooms' && (
        <RoomExplorer
          onSpeak={(word, slow = false) => props.onSpeak(word, slow, 'name')}
          onStop={props.onStop}
          onGuide={props.onGuide}
        />
      )}
      <Dialog open={picker} onOpenChange={setPicker}>
        <DialogContent className="topic-dialog">
          <DialogTitle>Bé muốn học gì?</DialogTitle>
          <DialogDescription>Chọn nhóm rồi chạm vào chủ đề.</DialogDescription>
          <div className="topic-group-grid">
            {groups.map((group) => (
              <Button
                key={group.id}
                variant="outline"
                aria-pressed={group.id === groupId}
                onClick={() => setGroupId(group.id)}
              >
                {group.icon} {group.label}
              </Button>
            ))}
          </div>
          <div className="topic-choice-grid">
            {themes
              .filter((item) => item.groupId === groupId)
              .map((item) => (
                <Button
                  key={item.id}
                  variant="outline"
                  onClick={() => {
                    setThemeId(item.id);
                    props.onThemeChange(item.id);
                    setMode('name');
                    setPicker(false);
                  }}
                >
                  {item.icon} {item.label}
                </Button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent className="reset-progress-dialog">
          <AlertDialogTitle>Dừng bài đang học?</AlertDialogTitle>
          <AlertDialogDescription>
            Lượt đang dở chưa được ghi vào lịch sử. Những từ đã luyện vẫn được
            giữ.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Học tiếp</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                pending?.();
                setPending(null);
              }}
            >
              Dừng bài
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
