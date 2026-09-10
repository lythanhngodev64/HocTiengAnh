import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RotateCcw } from 'lucide-react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { WordVisual } from './WordVisual';
import { CelebrationCanvas } from './CelebrationCanvas';
import {
  createQuestion as makeQuestion,
  reconcileProgress,
} from './learning.mjs';
import {
  themes,
  groups,
  wordById,
  totalWords,
  type ThemeId,
  type VocabularyWord,
  wordsForTheme,
} from './vocabulary';
import './styles.css';

declare global {
  interface Window {
    __englishGardenRoot?: ReturnType<typeof createRoot>;
  }
}

type LearningProgress = {
  stars: number;
  learnedIds: string[];
  badges: ThemeId[];
};

type Quiz = {
  target: VocabularyWord;
  options: VocabularyWord[];
};

type Feedback = 'ready' | 'wrong' | 'correct';
type PlaybackContext = 'quiz' | 'gallery';

type AudioManifest = {
  provider: string;
  model: string;
  voice: string;
  disclosure: string;
  words: string[];
  phonicsApproved?: string[];
};

const progressStorageKey = 'english-garden.learning-progress.v2';
const optionLetters = ['A', 'B', 'C', 'D'];
const questionsPerTest = 10;

type AlphabetMode = 'name' | 'sound';
const createQuestion = makeQuestion as (
  themeId: string,
  learnedIds?: string[],
  excludedIds?: string[],
  mode?: AlphabetMode,
) => Quiz;

function isThemeId(value: string): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}
function loadProgress(): LearningProgress {
  try {
    return reconcileProgress(
      JSON.parse(window.localStorage.getItem(progressStorageKey) ?? 'null'),
    );
  } catch {
    return reconcileProgress(null);
  }
}

function loadInitialVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }

  return window.speechSynthesis.getVoices();
}

function loadStoredVoiceUri() {
  try {
    return window.localStorage.getItem('english-garden.voice-uri') ?? 'auto';
  } catch {
    return 'auto';
  }
}

function voiceScore(voice: SpeechSynthesisVoice) {
  const voiceName = voice.name.toLowerCase();
  const language = voice.lang.toLowerCase();
  let score = 0;

  if (language === 'en-us') score += 50;
  else if (language === 'en-gb') score += 40;
  else if (language.startsWith('en-')) score += 30;
  if (voice.localService) score += 10;
  if (voice.default) score += 5;
  if (/(zira|jenny|aria|ava|samantha|google|david|mark)/.test(voiceName)) {
    score += 8;
  }

  return score;
}

function readableVoiceName(voice: SpeechSynthesisVoice) {
  return voice.name.replace(/^Microsoft\s+/i, '').replace(/\s+Desktop$/i, '');
}

function isAudioManifest(value: unknown): value is AudioManifest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const manifest = value as Partial<AudioManifest>;
  return (
    typeof manifest.provider === 'string' &&
    typeof manifest.model === 'string' &&
    typeof manifest.voice === 'string' &&
    typeof manifest.disclosure === 'string' &&
    Array.isArray(manifest.words) &&
    manifest.words.every((word) => typeof word === 'string') &&
    (manifest.phonicsApproved === undefined ||
      (Array.isArray(manifest.phonicsApproved) &&
        manifest.phonicsApproved.every((id) => typeof id === 'string')))
  );
}

function EnglishGarden() {
  const [progress, setProgress] = useState<LearningProgress>(loadProgress);
  const [activeThemeId, setActiveThemeId] = useState<ThemeId>('bedroom');
  const [question, setQuestion] = useState<Quiz>(() =>
    createQuestion('bedroom', []),
  );
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetError, setResetError] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('home');
  const [galleryPage, setGalleryPage] = useState(0);
  const [alphabetMode, setAlphabetMode] = useState<AlphabetMode>('name');
  const [feedback, setFeedback] = useState<Feedback>('ready');
  const [wrongOptionIds, setWrongOptionIds] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  const [testCorrect, setTestCorrect] = useState(0);
  const [questionHadMistake, setQuestionHadMistake] = useState(false);
  const [testedIds, setTestedIds] = useState<string[]>([]);
  const [testComplete, setTestComplete] = useState(false);
  const [audioMessage, setAudioMessage] = useState('Bấm “Nghe từ” để bắt đầu.');
  const [voices, setVoices] =
    useState<SpeechSynthesisVoice[]>(loadInitialVoices);
  const [voiceUri, setVoiceUri] = useState(loadStoredVoiceUri);
  const [audioManifest, setAudioManifest] = useState<AudioManifest | null>(
    null,
  );
  const speechSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [previewWordId, setPreviewWordId] = useState<string | null>(null);
  const speechToken = useRef(0);
  const activeAudio = useRef<HTMLAudioElement | null>(null);
  const assetBase = import.meta.env.BASE_URL;

  const activeTheme = themes.find((theme) => theme.id === activeThemeId)!;
  const activeWords = useMemo(
    () => wordsForTheme(activeThemeId),
    [activeThemeId],
  );
  const englishVoices = useMemo(
    () =>
      voices
        .filter((voice) => /^en(-|_)/i.test(voice.lang))
        .sort((left, right) => voiceScore(right) - voiceScore(left)),
    [voices],
  );
  const selectedVoice = useMemo(() => {
    if (voiceUri !== 'auto') {
      const rememberedVoice = englishVoices.find(
        (voice) => voice.voiceURI === voiceUri,
      );
      if (rememberedVoice) {
        return rememberedVoice;
      }
    }

    return englishVoices[0];
  }, [englishVoices, voiceUri]);
  const openAiAudioWordIds = useMemo(
    () => new Set(audioManifest?.words ?? []),
    [audioManifest],
  );
  const hasOpenAiAudio = openAiAudioWordIds.has(question.target.id);
  const phonicsReady = wordsForTheme('alphabet').every((word) =>
    audioManifest?.phonicsApproved?.includes(word.id),
  );
  const learnedInTheme = activeWords.filter((word) =>
    progress.learnedIds.includes(word.id),
  ).length;
  const isThemeComplete = learnedInTheme === activeWords.length;
  const currentTestTotal = Math.min(questionsPerTest, activeWords.length);
  const scorePercent = Math.round((testCorrect / currentTestTotal) * 100);
  const scoreLevel =
    scorePercent >= 90
      ? 'excellent'
      : scorePercent >= 70
        ? 'great'
        : scorePercent >= 50
          ? 'good'
          : 'practice';
  const scoreMessage =
    scoreLevel === 'excellent'
      ? 'Xuất sắc! Bé nghe rất tinh!'
      : scoreLevel === 'great'
        ? 'Giỏi lắm! Bé sắp chạm đỉnh rồi!'
        : scoreLevel === 'good'
          ? 'Tốt lắm! Cố thêm một chút nhé!'
          : 'Mình luyện lại và tiến bộ tiếp nhé!';
  const scoreStars =
    scoreLevel === 'excellent'
      ? '★★★'
      : scoreLevel === 'great'
        ? '★★☆'
        : scoreLevel === 'good'
          ? '★☆☆'
          : '🌱';
  const learnedPercent = Math.round(
    (progress.learnedIds.length / totalWords) * 100,
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(progressStorageKey, JSON.stringify(progress));
    } catch {
      // Progress remains usable for this visit if browser storage is unavailable.
    }
  }, [progress]);

  useEffect(() => {
    if (!speechSupported) {
      return;
    }

    const synth = window.speechSynthesis;
    const updateVoices = () => setVoices(synth.getVoices());

    synth.addEventListener('voiceschanged', updateVoices);
    return () => synth.removeEventListener('voiceschanged', updateVoices);
  }, [speechSupported]);

  useEffect(() => {
    let isCurrent = true;

    void fetch(`${assetBase}audio/openai-coral/manifest.json`, {
      cache: 'no-cache',
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((value: unknown) => {
        if (isCurrent && isAudioManifest(value)) {
          setAudioManifest(value);
        }
      })
      .catch(() => {
        // The browser voice remains available until OpenAI audio is generated.
      });

    return () => {
      isCurrent = false;
    };
  }, [assetBase]);

  useEffect(
    () => () => {
      const audio = activeAudio.current;
      if (audio) {
        audio.pause();
        activeAudio.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    },
    [],
  );

  function stopSpeaking() {
    speechToken.current += 1;
    setPreviewWordId(null);
    const audio = activeAudio.current;
    if (audio) {
      audio.pause();
      activeAudio.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  function finishPlayback(context: PlaybackContext, token: number) {
    if (speechToken.current !== token) {
      return;
    }

    if (context === 'gallery') {
      setPreviewWordId(null);
    }
    setAudioMessage(
      context === 'gallery'
        ? 'Đã nghe xong. Chạm một từ khác để nghe tiếp.'
        : 'Đã nghe xong. Hãy chọn một hình.',
    );
  }

  function speakWithBrowserVoice(
    word: string,
    slowly: boolean,
    context: PlaybackContext,
    token: number,
  ) {
    if (!speechSupported || !('speechSynthesis' in window)) {
      if (context === 'gallery') {
        setPreviewWordId(null);
      }
      setAudioMessage(
        'Chưa có tệp OpenAI và trình duyệt không hỗ trợ giọng dự phòng.',
      );
      return;
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(
      slowly ? word + '. ' + word + '.' : word,
    );
    utterance.lang = selectedVoice?.lang ?? 'en-US';
    utterance.rate = slowly ? 0.62 : 0.82;
    utterance.pitch = 1;
    utterance.volume = 1;
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      if (speechToken.current === token) {
        setAudioMessage(
          slowly
            ? 'Đang dùng giọng dự phòng, đọc chậm hai lần.'
            : 'Đang dùng giọng dự phòng của máy.',
        );
      }
    };
    utterance.onend = () => finishPlayback(context, token);
    utterance.onerror = (event) => {
      if (
        speechToken.current === token &&
        event.error !== 'canceled' &&
        event.error !== 'interrupted'
      ) {
        if (context === 'gallery') {
          setPreviewWordId(null);
        }
        setAudioMessage('Chưa thể phát âm thanh. Hãy thử lại.');
      }
    };

    synth.speak(utterance);
  }

  function speakWord(
    entry: VocabularyWord,
    slowly = false,
    context: PlaybackContext = 'quiz',
    mode: AlphabetMode = alphabetMode,
  ) {
    if (context === 'quiz') {
      setPreviewWordId(null);
    }

    const token = speechToken.current + 1;
    speechToken.current = token;

    const previousAudio = activeAudio.current;
    if (previousAudio) {
      previousAudio.pause();
      activeAudio.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const isPhonics = entry.kind === 'letter' && mode === 'sound';
    if (isPhonics && !audioManifest?.phonicsApproved?.includes(entry.id)) {
      setPreviewWordId(null);
      setAudioMessage(
        'Âm chữ này đang chờ kiểm tra. Bé có thể nghe tên chữ trước nhé.',
      );
      return;
    }
    if (!isPhonics && !openAiAudioWordIds.has(entry.id)) {
      speakWithBrowserVoice(entry.word, slowly, context, token);
      return;
    }

    const suffix = (isPhonics ? '-sound' : '') + (slowly ? '-slow' : '');
    const audio = new Audio(
      `${assetBase}audio/openai-coral/${entry.id}${suffix}.mp3`,
    );
    let fallbackStarted = false;
    activeAudio.current = audio;

    const useFallback = () => {
      if (fallbackStarted || speechToken.current !== token) {
        return;
      }

      fallbackStarted = true;
      if (activeAudio.current === audio) {
        activeAudio.current = null;
      }
      if (isPhonics) {
        setPreviewWordId(null);
        setAudioMessage('Chưa phát được âm chữ. Hãy thử lại nhé.');
      } else {
        speakWithBrowserVoice(entry.word, slowly, context, token);
      }
    };

    audio.preload = 'auto';
    audio.volume = 1;
    audio.onplay = () => {
      if (speechToken.current === token) {
        setAudioMessage(
          slowly
            ? 'Giọng OpenAI đang đọc chậm hai lần.'
            : 'Đang phát giọng OpenAI rõ ràng.',
        );
      }
    };
    audio.onended = () => {
      if (activeAudio.current === audio) {
        activeAudio.current = null;
      }
      finishPlayback(context, token);
    };
    audio.onerror = useFallback;
    void audio.play().catch(useFallback);
  }

  function updateVoice(nextValue: string | null) {
    const nextVoice = nextValue ?? 'auto';
    setVoiceUri(nextVoice);
    stopSpeaking();

    try {
      if (nextVoice === 'auto') {
        window.localStorage.removeItem('english-garden.voice-uri');
      } else {
        window.localStorage.setItem('english-garden.voice-uri', nextVoice);
      }
    } catch {
      // The selection remains active for this visit.
    }
  }

  function answerOption(option: VocabularyWord) {
    if (feedback === 'correct') {
      return;
    }

    if (option.id === question.target.id) {
      setFeedback('correct');
      if (!questionHadMistake) {
        setTestCorrect((currentScore) => currentScore + 1);
      }
      setTestedIds((currentIds) =>
        currentIds.includes(question.target.id)
          ? currentIds
          : [...currentIds, question.target.id],
      );
      setAudioMessage(
        'Tuyệt vời! ' +
          question.target.word +
          ' nghĩa là ' +
          question.target.meaning +
          '.',
      );
      setProgress((currentProgress) => {
        const isNewWord = !currentProgress.learnedIds.includes(
          question.target.id,
        );
        const learnedIds = isNewWord
          ? [...currentProgress.learnedIds, question.target.id]
          : currentProgress.learnedIds;
        return reconcileProgress({
          stars: currentProgress.stars + (isNewWord ? 1 : 0),
          learnedIds,
        });
      });
      return;
    }

    setFeedback('wrong');
    setQuestionHadMistake(true);
    setWrongOptionIds((currentIds) =>
      currentIds.includes(option.id) ? currentIds : [...currentIds, option.id],
    );
    setAudioMessage('Chưa đúng. Bấm “Nghe chậm” rồi thử lại nhé.');
  }

  function nextQuestion() {
    stopSpeaking();

    if (round >= currentTestTotal) {
      setTestComplete(true);
      setAudioMessage('Bài kiểm tra đã hoàn thành. Đây là điểm của bé!');
      return;
    }

    const excludedIds = [...testedIds, question.target.id];
    setQuestion(
      createQuestion(
        activeThemeId,
        progress.learnedIds,
        excludedIds,
        alphabetMode,
      ),
    );
    setFeedback('ready');
    setWrongOptionIds([]);
    setRound((currentRound) => currentRound + 1);
    setQuestionHadMistake(false);
    setPreviewWordId(null);
    setAudioMessage('Một từ mới đã sẵn sàng. Hãy nghe thật kỹ.');
  }

  function resetProgress() {
    const emptyProgress = reconcileProgress(null);
    try {
      window.localStorage.setItem(
        progressStorageKey,
        JSON.stringify(emptyProgress),
      );
    } catch {
      setResetError(
        'Chưa thể xóa tiến độ đã lưu. Hãy cho phép trình duyệt lưu dữ liệu rồi thử lại.',
      );
      return;
    }
    setProgress(emptyProgress);
    restartTest(alphabetMode, []);
    setGalleryPage(0);
    setResetOpen(false);
    setAudioMessage('Đã đặt lại tiến độ. Mình cùng học lại từ đầu nhé!');
  }

  function restartTest(
    mode: AlphabetMode = alphabetMode,
    learnedIds = progress.learnedIds,
  ) {
    stopSpeaking();
    setQuestion(createQuestion(activeThemeId, learnedIds, [], mode));
    setFeedback('ready');
    setWrongOptionIds([]);
    setRound(1);
    setTestCorrect(0);
    setQuestionHadMistake(false);
    setTestedIds([]);
    setTestComplete(false);
    setPreviewWordId(null);
    setAudioMessage('Bài mới đã sẵn sàng. Bấm “Nghe từ” nhé!');
  }

  function chooseTheme(value: string | null) {
    if (!value || !isThemeId(value)) {
      return;
    }

    stopSpeaking();
    setActiveThemeId(value);
    setAlphabetMode('name');
    setGalleryPage(0);
    setThemePickerOpen(false);
    setQuestion(createQuestion(value, progress.learnedIds));
    setFeedback('ready');
    setWrongOptionIds([]);
    setRound(1);
    setTestCorrect(0);
    setQuestionHadMistake(false);
    setTestedIds([]);
    setTestComplete(false);
    setPreviewWordId(null);
    setAudioMessage('Đã đổi chủ đề. Bấm “Nghe từ” để bắt đầu.');
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        themePickerOpen ||
        resetOpen ||
        feedback === 'correct' ||
        testComplete
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest('button, input, select, [role="listbox"]')) {
        return;
      }

      const optionIndex = Number(event.key) - 1;
      const option = question.options[optionIndex];
      if (option) {
        answerOption(option);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const feedbackText =
    feedback === 'correct'
      ? (questionHadMistake ? 'Đúng rồi! ' : 'Chính xác, bé được 1 điểm! ') +
        question.target.word +
        ' là ' +
        question.target.meaning +
        '.'
      : feedback === 'wrong'
        ? 'Chưa đúng rồi. Hãy nghe lại thật chậm.'
        : audioMessage;

  return (
    <main className="garden-page">
      <div className="soft-orb soft-orb-one" aria-hidden="true" />
      <div className="soft-orb soft-orb-two" aria-hidden="true" />

      <div className="garden-shell">
        <header className="garden-header">
          <a className="garden-brand" href="./" aria-label="Về đầu bài học">
            <span className="brand-seed" aria-hidden="true">
              A
            </span>
            <span>
              <strong>English Garden</strong>
              <small>Nghe · Chạm · Nhớ từ</small>
            </span>
          </a>

          <div className="header-progress" aria-label="Tiến độ của bé">
            <span className="star-pill">
              <span aria-hidden="true">★</span> {progress.stars}
            </span>
            <span className="badge-pill">
              <span aria-hidden="true">✦</span> {progress.badges.length}/
              {themes.length}
            </span>
            <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="outline"
                            className="reset-progress-button"
                          />
                        }
                        aria-label="Đặt lại tiến độ"
                        onClick={() => {
                          stopSpeaking();
                          setResetError('');
                        }}
                      />
                    }
                  >
                    <RotateCcw size={20} aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-sm">
                    Đặt lại tiến độ
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <AlertDialogContent className="reset-progress-dialog">
                <AlertDialogTitle>Đặt lại toàn bộ tiến độ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Xóa tất cả sao, từ đã nhớ và huy hiệu trên trình duyệt này,
                  đồng thời bắt đầu lại bài đang học. Không thể hoàn tác. Bài
                  học và giọng đọc vẫn được giữ nguyên.
                </AlertDialogDescription>
                {resetError && <p role="alert">{resetError}</p>}
                <AlertDialogFooter>
                  <AlertDialogCancel>Giữ tiến độ</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={resetProgress}
                  >
                    Xóa tiến độ
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </header>

        <section
          className="welcome-strip welcome-strip-unified"
          aria-labelledby="garden-title"
        >
          <div>
            <p className="section-kicker">Khu vườn từ vựng</p>
            <h1 id="garden-title">Mỗi ngày một ít, bé nhớ được nhiều!</h1>
            <p>
              {totalWords} mục học · {themes.length} chủ đề · cùng bé khám phá
            </p>
          </div>
          <div className="word-progress">
            <span>
              Đã nhớ{' '}
              <strong>
                {progress.learnedIds.length}/{totalWords}
              </strong>{' '}
              từ
            </span>
            <Progress
              value={learnedPercent}
              className="garden-progress"
              aria-label={'Đã nhớ ' + learnedPercent + ' phần trăm số từ'}
            />
          </div>
          <div className="current-theme-bar">
            <span>
              <span aria-hidden="true">{activeTheme.icon}</span>{' '}
              <strong>{activeTheme.label}</strong>
              <small>{activeWords.length} mục học</small>
            </span>
            <Button
              onClick={() => {
                setSelectedGroup(activeTheme.groupId);
                setThemePickerOpen(true);
                stopSpeaking();
              }}
              className="change-theme-button"
            >
              Đổi chủ đề
            </Button>
          </div>
        </section>

        <div className="theme-tabs">
          <Dialog open={themePickerOpen} onOpenChange={setThemePickerOpen}>
            <DialogContent className="topic-dialog">
              <DialogTitle>Bé muốn khám phá gì?</DialogTitle>
              <DialogDescription>
                Chọn một nhóm, rồi chạm vào chủ đề bé thích.
              </DialogDescription>
              <div className="topic-group-grid" aria-label="Nhóm chủ đề">
                {groups.map((group) => (
                  <Button
                    key={group.id}
                    variant="outline"
                    aria-pressed={selectedGroup === group.id}
                    onClick={() => setSelectedGroup(group.id)}
                  >
                    <span aria-hidden="true">{group.icon}</span>
                    {group.label}
                  </Button>
                ))}
              </div>
              <div className="topic-choice-grid">
                {themes
                  .filter((theme) => theme.groupId === selectedGroup)
                  .map((theme) => {
                    const count = theme.wordIds.filter((id) =>
                      progress.learnedIds.includes(id),
                    ).length;
                    return (
                      <Button
                        key={theme.id}
                        variant="outline"
                        className="topic-choice"
                        aria-pressed={activeThemeId === theme.id}
                        onClick={() => chooseTheme(theme.id)}
                      >
                        <span className="theme-icon" aria-hidden="true">
                          {theme.icon}
                        </span>
                        <span>
                          <strong>{theme.label}</strong>
                          <small>
                            {count}/{theme.wordIds.length} đã nhớ{' '}
                            {count === theme.wordIds.length ? '★' : ''}
                          </small>
                        </span>
                      </Button>
                    );
                  })}
              </div>
            </DialogContent>
          </Dialog>
          <section className="learning-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">
                  {activeTheme.icon} {activeTheme.label}
                </p>
                <h2>Nghe và chạm đúng hình</h2>
                <p>{activeTheme.description}</p>
              </div>
              <span className="round-chip">
                {testComplete ? 'Đã xong' : `Câu ${round}/${currentTestTotal}`}
              </span>
            </div>

            {activeThemeId === 'alphabet' && (
              <div className="alphabet-toolbar">
                <fieldset aria-label="Cách luyện chữ cái">
                  <Button
                    aria-pressed={alphabetMode === 'name'}
                    onClick={() => {
                      setAlphabetMode('name');
                      restartTest('name');
                    }}
                  >
                    Tên chữ
                  </Button>
                  <Button
                    aria-pressed={alphabetMode === 'sound'}
                    disabled={!phonicsReady}
                    onClick={() => {
                      setAlphabetMode('sound');
                      restartTest('sound');
                    }}
                  >
                    Âm chữ
                  </Button>
                </fieldset>
                <p>
                  Mỗi chữ học một âm cơ bản. Q đi cùng U; X nghe âm cuối trong
                  “box”.
                  {!phonicsReady && ' Bài âm chữ đang chờ kiểm tra giọng đọc.'}
                </p>
              </div>
            )}

            {testComplete && (
              <section
                className={`score-card score-${scoreLevel}`}
                aria-live="polite"
                aria-labelledby="score-title"
              >
                {scorePercent >= 70 && (
                  <CelebrationCanvas score={scorePercent} />
                )}
                <div className="score-sparkles" aria-hidden="true">
                  ✦ · ✧ · ✦
                </div>
                <p className="score-kicker">Kết quả bài kiểm tra</p>
                <div className="score-stars" aria-hidden="true">
                  {scoreStars}
                </div>
                <h2 id="score-title">{scoreMessage}</h2>
                <div className="score-number">
                  <strong>{scorePercent}</strong>
                  <span>/100</span>
                </div>
                <p className="score-percent">
                  Đúng {testCorrect}/{currentTestTotal} câu ngay lần chọn đầu
                  tiên
                </p>
                <Button
                  type="button"
                  className="restart-test-button"
                  onClick={() => restartTest()}
                >
                  <span aria-hidden="true">↻</span>
                  <span>Làm lại bài này</span>
                </Button>
              </section>
            )}

            <div
              className={
                'listen-deck' + (testComplete ? ' is-test-hidden' : '')
              }
            >
              <div className="listen-actions">
                <p className="listen-title">Từ nào đang được đọc?</p>
                <div className="listen-buttons">
                  <Button
                    type="button"
                    className="word-play-button"
                    onClick={() => speakWord(question.target)}
                  >
                    <span aria-hidden="true">🔊</span>
                    <span>
                      {activeThemeId === 'alphabet'
                        ? alphabetMode === 'name'
                          ? 'Nghe tên chữ'
                          : 'Nghe âm chữ'
                        : 'Nghe từ'}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="slow-play-button"
                    onClick={() => speakWord(question.target, true)}
                  >
                    <span aria-hidden="true">🐢</span>
                    <span>Nghe chậm</span>
                  </Button>
                </div>
              </div>

              <div className="voice-setting">
                {hasOpenAiAudio ? (
                  <>
                    <span className="voice-label">Giọng đọc</span>
                    <strong className="ai-voice-name">OpenAI · Coral</strong>
                    <p className="ai-disclosure">
                      Giọng đọc AI do OpenAI tạo, không phải giọng người thật.
                    </p>
                  </>
                ) : (
                  <>
                    <label htmlFor="voice-picker">Giọng dự phòng</label>
                    <Select value={voiceUri} onValueChange={updateVoice}>
                      <SelectTrigger id="voice-picker" className="voice-picker">
                        <SelectValue placeholder="Tự động chọn giọng rõ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">
                          Tự động:{' '}
                          {selectedVoice
                            ? readableVoiceName(selectedVoice)
                            : 'English'}
                        </SelectItem>
                        {englishVoices.map((voice) => (
                          <SelectItem
                            key={voice.voiceURI}
                            value={voice.voiceURI}
                          >
                            {readableVoiceName(voice)} ({voice.lang})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="voice-note">
                      Chưa có tệp âm thanh OpenAI, đang dùng giọng của máy.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div
              className={'quiz-grid' + (testComplete ? ' is-test-hidden' : '')}
              aria-label="Bốn hình để lựa chọn"
            >
              {question.options.map((option, index) => {
                const isCorrectOption = option.id === question.target.id;
                const optionState =
                  feedback === 'correct' && isCorrectOption
                    ? ' is-correct'
                    : wrongOptionIds.includes(option.id)
                      ? ' is-wrong'
                      : '';

                return (
                  <Button
                    key={option.id}
                    type="button"
                    className={'quiz-card' + optionState}
                    onClick={() => answerOption(option)}
                    aria-label={'Chọn hình ' + optionLetters[index]}
                    aria-pressed={feedback === 'correct' && isCorrectOption}
                  >
                    <WordVisual word={option} className="quiz-picture" />
                    <span className="quiz-card-footer">
                      <span className="option-letter">
                        {optionLetters[index]}
                      </span>
                      {feedback === 'correct' && isCorrectOption && (
                        <span className="answer-reveal">
                          <strong lang="en">{option.word}</strong>
                          <small>{option.meaning}</small>
                        </span>
                      )}
                      <span className="answer-mark" aria-hidden="true">
                        {feedback === 'correct' && isCorrectOption ? '✓' : ''}
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>

            <div
              className={
                'feedback-band feedback-' +
                feedback +
                (testComplete ? ' is-test-hidden' : '')
              }
            >
              <div
                className="feedback-text"
                aria-live="polite"
                aria-atomic="true"
              >
                <span className="feedback-symbol" aria-hidden="true">
                  {feedback === 'correct'
                    ? '✦'
                    : feedback === 'wrong'
                      ? '↻'
                      : '💡'}
                </span>
                <p>{feedbackText}</p>
              </div>
              {feedback === 'correct' && (
                <Button
                  type="button"
                  className="next-round-button"
                  onClick={nextQuestion}
                >
                  <span>
                    {round >= currentTestTotal ? 'Xem điểm' : 'Câu mới'}
                  </span>
                  <span aria-hidden="true">→</span>
                </Button>
              )}
            </div>

            <section className="word-gallery" aria-labelledby="gallery-title">
              <div className="gallery-heading">
                <div>
                  <p className="section-kicker">Góc từ vựng</p>
                  <h3 id="gallery-title">Chạm vào từng hình để nghe từ</h3>
                </div>
                <span
                  className={
                    isThemeComplete ? 'theme-status done' : 'theme-status'
                  }
                >
                  {isThemeComplete
                    ? 'Đã nhận huy hiệu!'
                    : learnedInTheme + '/' + activeWords.length + ' từ đã nhớ'}
                </span>
              </div>

              <div className="gallery-grid">
                {activeWords
                  .slice(galleryPage * 8, galleryPage * 8 + 8)
                  .map((word) => {
                    const isLearned = progress.learnedIds.includes(word.id);

                    const example = word.exampleId
                      ? wordById(word.exampleId)
                      : undefined;
                    return (
                      <div
                        key={word.id}
                        className={
                          'gallery-item' +
                          (word.kind === 'letter' ? ' letter-gallery-item' : '')
                        }
                      >
                        <Button
                          type="button"
                          variant="outline"
                          className={
                            'gallery-card' +
                            (isLearned ? ' is-learned' : '') +
                            (previewWordId === word.id ? ' is-listening' : '')
                          }
                          onClick={() => {
                            setPreviewWordId(word.id);
                            speakWord(word, true, 'gallery', 'name');
                          }}
                          aria-label={
                            'Nghe ' +
                            (word.kind === 'letter' ? 'tên chữ ' : 'từ ') +
                            word.word +
                            ', nghĩa là ' +
                            word.meaning
                          }
                        >
                          <WordVisual word={word} className="gallery-picture" />
                          <span className="gallery-copy">
                            <strong lang="en">{word.word}</strong>
                            <small>{word.meaning}</small>
                          </span>
                          {isLearned && (
                            <span className="gallery-check" aria-hidden="true">
                              ✓
                            </span>
                          )}
                        </Button>
                        {word.kind === 'letter' && (
                          <div className="letter-extras">
                            {example && (
                              <Button
                                variant="ghost"
                                className="letter-example"
                                onClick={() =>
                                  speakWord(example, false, 'gallery', 'name')
                                }
                                aria-label={'Nghe ví dụ ' + example.word}
                              >
                                <WordVisual word={example} />
                                <span lang="en">{example.word}</span>
                              </Button>
                            )}
                            <div className="letter-audio-buttons">
                              <Button
                                variant="outline"
                                onClick={() =>
                                  speakWord(word, false, 'gallery', 'name')
                                }
                              >
                                Nghe tên chữ
                              </Button>
                              <Button
                                variant="outline"
                                disabled={
                                  !audioManifest?.phonicsApproved?.includes(
                                    word.id,
                                  )
                                }
                                onClick={() =>
                                  speakWord(word, false, 'gallery', 'sound')
                                }
                              >
                                Nghe âm chữ
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
              <nav className="gallery-pagination" aria-label="Trang từ vựng">
                <Button
                  variant="outline"
                  disabled={galleryPage === 0}
                  onClick={() => {
                    stopSpeaking();
                    setPreviewWordId(null);
                    setGalleryPage((page) => page - 1);
                  }}
                >
                  ← Trang trước
                </Button>
                <span aria-live="polite">
                  Trang {galleryPage + 1}/{Math.ceil(activeWords.length / 8)}
                </span>
                <Button
                  variant="outline"
                  disabled={(galleryPage + 1) * 8 >= activeWords.length}
                  onClick={() => {
                    stopSpeaking();
                    setPreviewWordId(null);
                    setGalleryPage((page) => page + 1);
                  }}
                >
                  Trang sau →
                </Button>
              </nav>
            </section>
          </section>
        </div>

        <p className="keyboard-hint">
          Mẹo: nhấn phím 1, 2, 3 hoặc 4 để chọn hình trong trò chơi.
        </p>
      </div>
    </main>
  );
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Không tìm thấy vùng hiển thị bài học.');
}

const root =
  window.__englishGardenRoot ??
  (window.__englishGardenRoot = createRoot(rootElement));

root.render(<EnglishGarden />);
