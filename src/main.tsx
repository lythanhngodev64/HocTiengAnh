import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createRoot } from 'react-dom/client';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  themes,
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
};

const progressStorageKey = 'english-garden.learning-progress.v2';
const optionLetters = ['A', 'B', 'C', 'D'];
const questionsPerTest = 10;

function shuffle<T>(items: T[]) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const replacementIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[replacementIndex]] = [
      result[replacementIndex],
      result[index],
    ];
  }

  return result;
}

function isThemeId(value: string): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}

function createQuestion(
  themeId: ThemeId,
  learnedIds: string[],
  excludedTargetIds: string[] = [],
): Quiz {
  const themeWords = wordsForTheme(themeId);
  const availableWords = themeWords.filter(
    (word) => !excludedTargetIds.includes(word.id),
  );
  const unlearnedWords = availableWords.filter(
    (word) => !learnedIds.includes(word.id),
  );
  const targetPool =
    unlearnedWords.length > 0
      ? unlearnedWords
      : availableWords.length > 0
        ? availableWords
        : themeWords;
  const target = shuffle(targetPool)[0]!;
  const distractors = shuffle(
    themeWords.filter((word) => word.id !== target.id),
  ).slice(0, 3);

  return {
    target,
    options: shuffle([target, ...distractors]),
  };
}

function loadProgress(): LearningProgress {
  const emptyProgress: LearningProgress = {
    stars: 0,
    learnedIds: [],
    badges: [],
  };

  try {
    const stored = window.localStorage.getItem(progressStorageKey);
    if (!stored) {
      return emptyProgress;
    }

    const parsed = JSON.parse(stored) as Partial<LearningProgress>;
    const learnedIds = Array.isArray(parsed.learnedIds)
      ? parsed.learnedIds.filter((value): value is string => typeof value === 'string')
      : [];
    const badges = Array.isArray(parsed.badges)
      ? parsed.badges.filter((value): value is ThemeId =>
          typeof value === 'string' && isThemeId(value),
        )
      : [];

    return {
      stars:
        typeof parsed.stars === 'number' && Number.isFinite(parsed.stars)
          ? Math.max(0, Math.floor(parsed.stars))
          : 0,
      learnedIds: [...new Set(learnedIds)],
      badges: [...new Set(badges)],
    };
  } catch {
    return emptyProgress;
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
    manifest.words.every((word) => typeof word === 'string')
  );
}

function EnglishGarden() {
  const [progress, setProgress] = useState<LearningProgress>(loadProgress);
  const [activeThemeId, setActiveThemeId] = useState<ThemeId>('bedroom');
  const [question, setQuestion] = useState<Quiz>(() =>
    createQuestion('bedroom', []),
  );
  const [feedback, setFeedback] = useState<Feedback>('ready');
  const [wrongOptionIds, setWrongOptionIds] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  const [testCorrect, setTestCorrect] = useState(0);
  const [questionHadMistake, setQuestionHadMistake] = useState(false);
  const [testedIds, setTestedIds] = useState<string[]>([]);
  const [testComplete, setTestComplete] = useState(false);
  const [audioMessage, setAudioMessage] = useState(
    'Bấm “Nghe từ” để bắt đầu.',
  );
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(loadInitialVoices);
  const [voiceUri, setVoiceUri] = useState(loadStoredVoiceUri);
  const [audioManifest, setAudioManifest] = useState<AudioManifest | null>(null);
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
  const hasOpenAiAudio = openAiAudioWordIds.size > 0;
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

  useEffect(() => {
    const activeTab = document.querySelector<HTMLElement>(
      '.theme-trigger[aria-selected="true"]',
    );
    activeTab?.scrollIntoView({
      behavior: 'auto',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [activeThemeId]);

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
      setAudioMessage('Chưa có tệp OpenAI và trình duyệt không hỗ trợ giọng dự phòng.');
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

    if (!openAiAudioWordIds.has(entry.id)) {
      speakWithBrowserVoice(entry.word, slowly, context, token);
      return;
    }

    const suffix = slowly ? '-slow' : '';
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
      speakWithBrowserVoice(entry.word, slowly, context, token);
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

  function imageStyle(word: VocabularyWord): CSSProperties {
    return {
      backgroundImage:
        'url(' + assetBase + 'images/vocabulary/' + word.id + '.png)',
      backgroundPosition: 'center',
      backgroundSize: 'contain',
    };
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
        const completedTheme = wordsForTheme(activeThemeId).every((word) =>
          learnedIds.includes(word.id),
        );
        const badges =
          completedTheme && !currentProgress.badges.includes(activeThemeId)
            ? [...currentProgress.badges, activeThemeId]
            : currentProgress.badges;

        return {
          stars: currentProgress.stars + (isNewWord ? 1 : 0),
          learnedIds,
          badges,
        };
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
      createQuestion(activeThemeId, progress.learnedIds, excludedIds),
    );
    setFeedback('ready');
    setWrongOptionIds([]);
    setRound((currentRound) => currentRound + 1);
    setQuestionHadMistake(false);
    setPreviewWordId(null);
    setAudioMessage('Một từ mới đã sẵn sàng. Hãy nghe thật kỹ.');
  }

  function restartTest() {
    stopSpeaking();
    setQuestion(createQuestion(activeThemeId, progress.learnedIds));
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
      if (feedback === 'correct' || testComplete) {
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
        question.target.word + ' là ' + question.target.meaning + '.'
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
            <span className="brand-seed" aria-hidden="true">A</span>
            <span>
              <strong>English Garden</strong>
              <small>Nghe · Chạm · Nhớ từ</small>
            </span>
          </a>

          <div className="header-progress" aria-label="Tiến độ của bé">
            <span className="star-pill"><span aria-hidden="true">★</span> {progress.stars}</span>
            <span className="badge-pill"><span aria-hidden="true">✦</span> {progress.badges.length}/{themes.length}</span>
          </div>
        </header>

        <section className="welcome-strip" aria-labelledby="garden-title">
          <div>
            <p className="section-kicker">Khu vườn từ vựng</p>
            <h1 id="garden-title">Mỗi ngày một ít, bé nhớ được nhiều!</h1>
            <p>{totalWords} từ mới · {themes.length} chủ đề · nghe chậm thật rõ</p>
          </div>
          <div className="word-progress">
            <span>Đã nhớ <strong>{progress.learnedIds.length}/{totalWords}</strong> từ</span>
            <Progress
              value={learnedPercent}
              className="garden-progress"
              aria-label={'Đã nhớ ' + learnedPercent + ' phần trăm số từ'}
            />
          </div>
        </section>

        <Tabs
          value={activeThemeId}
          onValueChange={chooseTheme}
          className="theme-tabs"
        >
          <TabsList className="theme-list" aria-label="Chọn chủ đề">
            {themes.map((theme) => {
              const isComplete = progress.badges.includes(theme.id);

              return (
                <TabsTrigger
                  key={theme.id}
                  value={theme.id}
                  className="theme-trigger"
                  style={{ '--theme-color': theme.color } as CSSProperties}
                >
                  <span className="theme-icon" aria-hidden="true">{theme.icon}</span>
                  <span>
                    <strong>{theme.shortLabel}</strong>
                    <small>{wordsForTheme(theme.id).length} từ</small>
                  </span>
                  {isComplete && <span className="theme-done" aria-label="Đã hoàn thành">✓</span>}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={activeThemeId} className="learning-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">{activeTheme.icon} {activeTheme.label}</p>
                <h2>Nghe và chạm đúng hình</h2>
                <p>{activeTheme.description}</p>
              </div>
              <span className="round-chip">
                {testComplete ? 'Đã xong' : `Câu ${round}/${currentTestTotal}`}
              </span>
            </div>

            {testComplete && (
              <section
                className={`score-card score-${scoreLevel}`}
                aria-live="polite"
                aria-labelledby="score-title"
              >
                <div className="score-sparkles" aria-hidden="true">✦ · ✧ · ✦</div>
                <p className="score-kicker">Kết quả bài kiểm tra</p>
                <div className="score-stars" aria-hidden="true">{scoreStars}</div>
                <h2 id="score-title">{scoreMessage}</h2>
                <div className="score-number">
                  <strong>{testCorrect}</strong>
                  <span>/{currentTestTotal}</span>
                </div>
                <p className="score-percent">{scorePercent}% câu đúng ngay lần chọn đầu tiên</p>
                <Button type="button" className="restart-test-button" onClick={restartTest}>
                  <span aria-hidden="true">↻</span>
                  <span>Làm lại bài này</span>
                </Button>
              </section>
            )}

            <div className={'listen-deck' + (testComplete ? ' is-test-hidden' : '')}>
              <div className="listen-actions">
                <p className="listen-title">Từ nào đang được đọc?</p>
                <div className="listen-buttons">
                  <Button
                    type="button"
                    className="word-play-button"
                    onClick={() => speakWord(question.target)}
                  >
                    <span aria-hidden="true">🔊</span>
                    <span>Nghe từ</span>
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
                <p className="audio-status" aria-live="polite">{audioMessage}</p>
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
                          Tự động: {selectedVoice ? readableVoiceName(selectedVoice) : 'English'}
                        </SelectItem>
                        {englishVoices.map((voice) => (
                          <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
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
                    className={
                      'quiz-card' +
                      optionState
                    }
                    onClick={() => answerOption(option)}
                    aria-label={'Chọn hình ' + optionLetters[index]}
                    aria-pressed={feedback === 'correct' && isCorrectOption}
                  >
                    <span
                      className="quiz-picture"
                      style={imageStyle(option)}
                      aria-hidden="true"
                    />
                    <span className="quiz-card-footer">
                      <span className="option-letter">{optionLetters[index]}</span>
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
              <div className="feedback-text" aria-live="polite" aria-atomic="true">
                <span className="feedback-symbol" aria-hidden="true">
                  {feedback === 'correct' ? '✦' : feedback === 'wrong' ? '↻' : '💡'}
                </span>
                <p>{feedbackText}</p>
              </div>
              {feedback === 'correct' && (
                <Button type="button" className="next-round-button" onClick={nextQuestion}>
                  <span>{round >= currentTestTotal ? 'Xem điểm' : 'Câu mới'}</span>
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
                <span className={isThemeComplete ? 'theme-status done' : 'theme-status'}>
                  {isThemeComplete ? 'Đã nhận huy hiệu!' : learnedInTheme + '/' + activeWords.length + ' từ đã nhớ'}
                </span>
              </div>

              <div className="gallery-grid">
                {activeWords.map((word) => {
                  const isLearned = progress.learnedIds.includes(word.id);

                  return (
                    <Button
                      key={word.id}
                      type="button"
                      variant="outline"
                      className={
                        'gallery-card' +
                        (isLearned ? ' is-learned' : '') +
                        (previewWordId === word.id ? ' is-listening' : '')
                      }
                      onClick={() => {
                        setPreviewWordId(word.id);
                        speakWord(word, true, 'gallery');
                      }}
                      aria-label={'Nghe từ ' + word.word + ', nghĩa là ' + word.meaning}
                    >
                      <span
                        className="gallery-picture"
                        style={imageStyle(word)}
                        aria-hidden="true"
                      />
                      <span className="gallery-copy">
                        <strong lang="en">{word.word}</strong>
                        <small>{word.meaning}</small>
                      </span>
                      {isLearned && <span className="gallery-check" aria-hidden="true">✓</span>}
                    </Button>
                  );
                })}
              </div>
            </section>
          </TabsContent>
        </Tabs>

        <p className="keyboard-hint">Mẹo: nhấn phím 1, 2, 3 hoặc 4 để chọn hình trong trò chơi.</p>
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
