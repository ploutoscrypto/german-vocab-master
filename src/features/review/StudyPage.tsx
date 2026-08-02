import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Home, Settings2, Sparkles, X } from 'lucide-react';
import type {
  QuizDirection,
  ReviewGrade,
  SessionSource,
  StudyMode,
  VocabularyEntry,
} from '@/lib/types';
import { db } from '@/db/database';
import { getSettings, recordReview } from '@/db/repositories';
import { buildQueue } from '@/srs/scheduler';
import { defaultSrsConfig, gradeOutcomes, schedule } from '@/srs/sm2';
import { useAppStore } from '@/app/store';
import { buildMemoryContext, generateInsights } from '@/memory/mnemonic';
import { MemoryPanel } from '@/components/shared/memory-panel';
import { cn, pct, relativeDue } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/shared/empty-state';
import { TtsButton } from '@/components/shared/tts-button';
import { buildQuizItem, isRtlFace } from '@/features/quiz/session';
import type { AnswerVerdict } from '@/features/quiz/answer';
import { TypingCard } from '@/features/quiz/TypingCard';
import { ChoiceCard } from '@/features/quiz/ChoiceCard';
import { SessionSettings } from '@/features/quiz/SessionSettings';

const ARTICLE_COLOR: Record<string, string> = {
  der: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
  die: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
  das: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
};

const GRADES: {
  grade: ReviewGrade;
  variant: 'destructive' | 'outline' | 'default' | 'success';
  key: string;
}[] = [
  { grade: 'again', variant: 'destructive', key: 'review.again' },
  { grade: 'hard', variant: 'outline', key: 'review.hard' },
  { grade: 'good', variant: 'default', key: 'review.good' },
  { grade: 'easy', variant: 'success', key: 'review.easy' },
];

/** Auto-graded modes map their outcome onto the SM-2 grades. */
function verdictToGrade(v: AnswerVerdict): ReviewGrade {
  if (v === 'correct') return 'good';
  if (v === 'almost') return 'hard';
  return 'again';
}

export function StudyPage() {
  const { source } = useParams<{ source: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.update);
  const srs = settings?.srs ?? defaultSrsConfig;

  const [pool, setPool] = useState<SessionSource>((source ?? 'due') as SessionSource);
  const [mode, setMode] = useState<StudyMode>(settings?.quizMode ?? 'review');
  const [direction, setDirection] = useState<QuizDirection>(
    settings?.quizDirection ?? 'de-ar',
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [all, setAll] = useState<VocabularyEntry[] | null>(null);
  const [queue, setQueue] = useState<VocabularyEntry[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const startRef = useRef(Date.now());
  const busyRef = useRef(false);

  // Load the pool and build the queue whenever the source changes.
  useEffect(() => {
    let active = true;
    void (async () => {
      const entries = await db.vocabulary.toArray();
      const cfg = await getSettings();
      if (!active) return;
      setAll(entries);
      setQueue(
        buildQueue(entries, {
          source: pool,
          newLimit: cfg.dailyNewLimit,
          reviewLimit: cfg.dailyReviewLimit,
        }),
      );
      setRevealed(false);
      setFinished(false);
      startRef.current = Date.now();
    })();
    return () => {
      active = false;
    };
  }, [pool]);

  const current = queue.length > 0 ? queue[0] : null;

  // Rebuild the quiz item only when the card, mode or direction changes, so
  // multiple-choice options stay stable across re-renders.
  const item = useMemo(() => {
    if (!current || !all) return null;
    return buildQuizItem(current, all, mode, direction);
  }, [current, all, mode, direction]);

  // Indexes for the memory helper are built once per loaded pool, not per card.
  const memoryCtx = useMemo(() => buildMemoryContext(all ?? []), [all]);
  const insights = useMemo(
    () => (current ? generateInsights(current, memoryCtx) : null),
    [current, memoryCtx],
  );

  const advance = useCallback(
    async (grade: ReviewGrade) => {
      if (!current || busyRef.current) return;
      busyRef.current = true;
      const ms = Date.now() - startRef.current;
      const res = schedule(current, grade, srs);
      await recordReview(current, grade, mode, ms);
      setReviewed((n) => n + 1);
      if (res.correct) setCorrect((n) => n + 1);

      const updated = res.repeatInSession
        ? await db.vocabulary.get(current.id)
        : undefined;
      setQueue((prev) => {
        const rest = prev.slice(1);
        if (updated) rest.splice(Math.min(rest.length, 6), 0, updated);
        if (rest.length === 0) setFinished(true);
        return rest;
      });
      // Keep the in-memory pool fresh so distractors reflect edits.
      if (updated) {
        setAll((prev) =>
          prev ? prev.map((e) => (e.id === updated.id ? updated : e)) : prev,
        );
      }
      setRevealed(false);
      startRef.current = Date.now();
      busyRef.current = false;
    },
    [current, mode, srs],
  );

  // Keyboard shortcuts for the self-graded modes.
  useEffect(() => {
    if (!item || item.mode === 'typing' || item.mode === 'multiple-choice') return;
    const onKey = (e: KeyboardEvent) => {
      if (!revealed && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        void advance(GRADES[Number(e.key) - 1].grade);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, revealed, advance]);

  function persistMode(m: StudyMode) {
    setMode(m);
    void updateSettings({ quizMode: m });
  }
  function persistDirection(d: QuizDirection) {
    setDirection(d);
    void updateSettings({ quizDirection: d });
  }

  if (all === null) {
    return <div className="grid min-h-dvh place-items-center text-muted-foreground">…</div>;
  }

  // ---- Session complete ----
  if (finished && reviewed > 0) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-success/15 text-success">
            <Check className="size-8" />
          </div>
          <h1 className="text-2xl font-bold">{t('review.doneTitle')}</h1>
          <p className="mt-2 text-muted-foreground">
            {t('review.doneDesc', { count: reviewed, accuracy: pct(correct, reviewed) })}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button size="lg" onClick={() => navigate('/')}>
              <Home />
              {t('review.backHome')}
            </Button>
            <Button variant="outline" onClick={() => setSettingsOpen(true)}>
              <Settings2 />
              {t('quiz.practiceAgain')}
            </Button>
          </div>
        </div>
        <SessionSettings
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          mode={mode}
          direction={direction}
          pool={pool}
          onModeChange={persistMode}
          onDirectionChange={persistDirection}
          onPoolChange={(p) => {
            setPool(p);
            setReviewed(0);
            setCorrect(0);
            setSettingsOpen(false);
          }}
        />
      </div>
    );
  }

  // ---- Nothing in this pile ----
  if (!current || !item) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-6">
        <div className="w-full max-w-sm">
          <EmptyState
            icon={Sparkles}
            title={t('review.emptyTitle')}
            description={t('review.emptyDesc')}
            action={
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate('/')}>{t('review.backHome')}</Button>
                <Button variant="outline" onClick={() => setSettingsOpen(true)}>
                  <Settings2 />
                  {t('quiz.changePool')}
                </Button>
              </div>
            }
          />
        </div>
        <SessionSettings
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          mode={mode}
          direction={direction}
          pool={pool}
          onModeChange={persistMode}
          onDirectionChange={persistDirection}
          onPoolChange={(p) => {
            setPool(p);
            setSettingsOpen(false);
          }}
        />
      </div>
    );
  }

  const outcomes = gradeOutcomes(current, srs);
  const progress = (reviewed / (reviewed + queue.length)) * 100;
  const promptRtl = isRtlFace(item.promptFace);
  const answerRtl = isRtlFace(item.answerFace);
  const selfGraded = item.mode === 'review' || item.mode === 'flashcard';

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 pt-4 lg:max-w-3xl lg:pt-8">
        <Button
          variant="ghost"
          size="icon"
          className="-ms-2"
          onClick={() => navigate('/')}
          aria-label={t('common.close')}
        >
          <X />
        </Button>
        <Progress value={progress} className="flex-1" />
        <span className="w-12 text-end text-sm tabular-nums text-muted-foreground">
          {queue.length}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          aria-label={t('quiz.settingsTitle')}
        >
          <Settings2 />
        </Button>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 lg:max-w-3xl lg:py-10">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {/* Prompt side */}
          {item.promptFace === 'german' && current.article && (
            <span
              className={cn(
                'mb-3 rounded-full px-3 py-1 text-sm font-semibold',
                ARTICLE_COLOR[current.article],
              )}
            >
              {current.article}
            </span>
          )}
          <div className="flex items-center gap-2">
            <h1
              className={cn(
                'text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl',
                promptRtl && 'lang-ar',
              )}
              dir={promptRtl ? 'rtl' : 'ltr'}
            >
              {item.promptText}
            </h1>
            {item.promptFace === 'german' && (
              <TtsButton
                text={`${current.article ? current.article + ' ' : ''}${current.german}`}
              />
            )}
          </div>
          {item.promptFace === 'german' && current.plural && (
            <p className="mt-2 text-sm text-muted-foreground">Pl. {current.plural}</p>
          )}

          {selfGraded && !revealed && (
            <p className="mt-6 text-sm text-muted-foreground">{t('review.thinkPrompt')}</p>
          )}

          {/* Answer side — revealed for self-graded modes */}
          {selfGraded && revealed && (
            <div className="mt-6 w-full max-w-md animate-fade-in space-y-4 text-center lg:max-w-xl">
              <div className="h-px w-full bg-border" />
              <p
                className={cn('text-3xl font-semibold', answerRtl && 'lang-ar')}
                dir={answerRtl ? 'rtl' : 'ltr'}
              >
                {item.answerText}
              </p>
              {item.answerFace !== 'english' && current.english && (
                <p className="text-lg text-muted-foreground">{current.english}</p>
              )}
              {item.promptFace !== 'german' && (
                <p className="text-lg font-medium">
                  {current.article ? `${current.article} ` : ''}
                  {current.german}
                </p>
              )}
              {current.examples.length > 0 && (
                <div className="rounded-xl bg-secondary p-3 text-start text-sm">
                  {current.examples.slice(0, 2).map((ex, i) => (
                    <p key={i} className="text-secondary-foreground">“{ex}”</p>
                  ))}
                </div>
              )}
              {insights && <MemoryPanel insights={insights} />}
            </div>
          )}

          {/* Active modes */}
          {item.mode === 'typing' && (
            <div className="mt-8 w-full">
              <TypingCard
                key={`${current.id}-${item.direction}`}
                item={item}
                onResolved={(v) => void advance(verdictToGrade(v))}
              />
            </div>
          )}
          {item.mode === 'multiple-choice' && (
            <div className="mt-8 w-full">
              <ChoiceCard
                key={`${current.id}-${item.direction}`}
                item={item}
                onResolved={(ok) => void advance(ok ? 'good' : 'again')}
              />
            </div>
          )}
        </div>

        {selfGraded && (
          <div className="mx-auto w-full max-w-md lg:max-w-xl">
            {!revealed ? (
              <Button size="lg" className="w-full" onClick={() => setRevealed(true)}>
                {t('review.showAnswer')}
              </Button>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {GRADES.map(({ grade, variant, key }) => (
                  <Button
                    key={grade}
                    variant={variant}
                    className="h-auto flex-col gap-0.5 py-2.5"
                    onClick={() => void advance(grade)}
                  >
                    <span>{t(key)}</span>
                    <span className="text-[10px] font-normal opacity-70">
                      {relativeDue(outcomes[grade])}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <SessionSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        mode={mode}
        direction={direction}
        pool={pool}
        onModeChange={persistMode}
        onDirectionChange={persistDirection}
        onPoolChange={(p) => {
          setPool(p);
          setReviewed(0);
          setCorrect(0);
          setSettingsOpen(false);
        }}
      />
    </div>
  );
}
