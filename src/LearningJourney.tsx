import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';
import { groups, themes, totalWords, wordById } from './vocabulary';

export type TestAnswer = { wordId: string; firstTryCorrect: boolean };
export type CompletedTest = {
  activity: 'test' | 'learn';
  id: string;
  completedAt: string;
  themeId: string;
  mode: 'name' | 'sound';
  answers: TestAnswer[];
  correct: number;
  score: number;
};
export type LearningProgress = {
  practice: Record<string, { at: string; firstTryCorrect: boolean }>;
  stars: number;
  learnedIds: string[];
  badges: string[];
  history: CompletedTest[];
};

export function LearningJourney({
  progress,
  onBack,
}: {
  progress: LearningProgress;
  onBack: () => void;
}) {
  const [page, setPage] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const pages = Math.max(1, Math.ceil(progress.history.length / 10));
  const currentPage = Math.min(page, pages - 1);
  const learned = new Set(progress.learnedIds);
  const formatTime = (date: string) =>
    new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date));
  return (
    <section className="journey" aria-labelledby="journey-title">
      <div className="journey-heading">
        <h1 id="journey-title" tabIndex={-1} ref={heading}>
          Quá trình học
        </h1>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft size={18} aria-hidden="true" /> Quay lại học
        </Button>
      </div>
      <p className="journey-note">
        Tiến độ được lưu trên trình duyệt này, không đồng bộ sang thiết bị khác.
        Lịch sử chi tiết chỉ ghi nhận các bài hoàn thành từ khi có tính năng
        này; các bài cũ không có ngày học hoặc điểm để khôi phục.
      </p>
      <div className="journey-stats">
        {[
          [`${learned.size}/${totalWords}`, 'Từ đã nhớ'],
          [progress.stars, 'Sao đã nhận'],
          [`${progress.badges.length}/${themes.length}`, 'Chủ đề hoàn thành'],
          [progress.history.length, 'Bài đã ghi nhận'],
        ].map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <section className="journey-section" aria-labelledby="journey-topics">
        <h2 id="journey-topics">Khu vườn của bé</h2>
        {groups.map((group) => (
          <section key={group.id}>
            <h3>
              {group.icon} {group.label}
            </h3>
            <Accordion multiple className="journey-topics">
              {themes
                .filter((theme) => theme.groupId === group.id)
                .map((theme) => {
                  const count = theme.wordIds.filter((id) =>
                    learned.has(id),
                  ).length;
                  return (
                    <AccordionItem
                      value={theme.id}
                      className="journey-topic"
                      key={theme.id}
                    >
                      <AccordionTrigger className="journey-topic-trigger">
                        <span>
                          <span>
                            {theme.icon} {theme.label}
                          </span>
                          <small>
                            {count}/{theme.wordIds.length} đã nhớ{' '}
                            {count === theme.wordIds.length ? '★' : ''}
                          </small>
                          <Progress
                            value={(count / theme.wordIds.length) * 100}
                            className="garden-progress"
                            aria-label={`${theme.label}: ${count}/${theme.wordIds.length} từ đã nhớ`}
                          />
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="journey-words">
                          {theme.wordIds.map((id) => {
                            const word = wordById(id)!;
                            return (
                              <li key={id}>
                                <strong>{word.word}</strong> — {word.meaning}
                                <span
                                  className={
                                    learned.has(id) ? 'remembered' : ''
                                  }
                                >
                                  {learned.has(id) ? '✓ Đã nhớ' : 'Chưa nhớ'}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
            </Accordion>
          </section>
        ))}
      </section>
      <section className="journey-section" aria-labelledby="journey-history">
        <h2 id="journey-history">Lịch sử bài học</h2>
        {!progress.history.length && (
          <p>
            Chưa có bài hoàn thành được ghi nhận. Bé hãy hoàn thành một bài để
            xem kết quả tại đây nhé!
          </p>
        )}
        <Accordion multiple className="journey-history" key={currentPage}>
          {progress.history
            .slice(currentPage * 10, currentPage * 10 + 10)
            .map((entry) => {
              const theme = themes.find((item) => item.id === entry.themeId)!;
              return (
                <AccordionItem
                  value={entry.id}
                  key={entry.id}
                  className="journey-test"
                >
                  <AccordionTrigger className="journey-test-trigger">
                    <span className="journey-test-summary">
                      <span>
                        <strong>
                          {theme.icon} {theme.label}
                        </strong>
                        <small>
                          <time dateTime={entry.completedAt}>
                            {formatTime(entry.completedAt)}
                          </time>{' '}
                          · {entry.activity === 'learn' ? 'Học' : 'Kiểm tra'} ·{' '}
                          {entry.themeId === 'alphabet'
                            ? entry.mode === 'sound'
                              ? 'Âm chữ'
                              : 'Tên chữ'
                            : 'Nghe – chọn hình'}
                        </small>
                      </span>
                      <span
                        className={`journey-score ${entry.score >= 70 ? 'celebrated' : ''}`}
                      >
                        {entry.activity === 'learn'
                          ? `🌼 ${entry.answers.length} từ`
                          : `${entry.score >= 70 ? '★ ' : ''}${entry.score}/100`}
                      </span>
                      <span>
                        Đúng lần đầu: {entry.correct}/{entry.answers.length} câu
                        · Xem chi tiết
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="journey-answer-groups">
                      {[true, false].map((correct) => (
                        <section key={String(correct)}>
                          <h3>
                            {correct
                              ? '✓ Đúng ngay lần đầu'
                              : 'Cùng ôn thêm nhé'}
                          </h3>
                          <ul className="journey-words">
                            {entry.answers
                              .filter(
                                (answer) => answer.firstTryCorrect === correct,
                              )
                              .map((answer) => {
                                const word = wordById(answer.wordId)!;
                                return (
                                  <li key={word.id}>
                                    <strong>{word.word}</strong> —{' '}
                                    {word.meaning}
                                  </li>
                                );
                              })}
                          </ul>
                          {!entry.answers.some(
                            (answer) => answer.firstTryCorrect === correct,
                          ) && (
                            <p>
                              {correct
                                ? 'Mình cùng luyện thêm nhé!'
                                : 'Bé đã đúng ngay tất cả các câu!'}
                            </p>
                          )}
                        </section>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
        </Accordion>
        {pages > 1 && (
          <Pagination aria-label="Trang lịch sử">
            <PaginationContent className="gallery-pagination">
              <PaginationItem>
                <Button
                  variant="outline"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  ← Trang trước
                </Button>
              </PaginationItem>
              <PaginationItem>
                <span aria-live="polite">
                  Trang {currentPage + 1}/{pages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <Button
                  variant="outline"
                  disabled={currentPage + 1 >= pages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Trang sau →
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </section>
    </section>
  );
}
