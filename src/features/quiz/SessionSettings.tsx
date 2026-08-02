import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { QuizDirection, SessionSource, StudyMode } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const MODES: StudyMode[] = ['review', 'flashcard', 'typing', 'multiple-choice', 'mixed'];
const DIRECTIONS: QuizDirection[] = ['de-ar', 'ar-de', 'de-en', 'en-de'];
const POOLS: SessionSource[] = ['due', 'new', 'wrong', 'favorites', 'recent', 'random', 'all'];

function Choice({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-start text-sm font-medium transition-colors tap-safe',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card hover:bg-secondary',
      )}
    >
      <span className="truncate">{label}</span>
      {active && <Check className="size-4 shrink-0" />}
    </button>
  );
}

export function SessionSettings({
  open,
  onOpenChange,
  mode,
  direction,
  pool,
  onModeChange,
  onDirectionChange,
  onPoolChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: StudyMode;
  direction: QuizDirection;
  pool: SessionSource;
  onModeChange: (m: StudyMode) => void;
  onDirectionChange: (d: QuizDirection) => void;
  onPoolChange: (p: SessionSource) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('quiz.settingsTitle')}</DialogTitle>
          <DialogDescription>{t('quiz.settingsDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-muted-foreground">
              {t('quiz.mode')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => (
                <Choice
                  key={m}
                  active={mode === m}
                  label={t(`quiz.mode_${m}`)}
                  onClick={() => onModeChange(m)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-muted-foreground">
              {t('quiz.direction')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DIRECTIONS.map((d) => (
                <Choice
                  key={d}
                  active={direction === d}
                  label={t(`quiz.dir_${d}`)}
                  onClick={() => onDirectionChange(d)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-muted-foreground">
              {t('quiz.pool')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {POOLS.map((p) => (
                <Choice
                  key={p}
                  active={pool === p}
                  label={t(`quiz.pool_${p}`)}
                  onClick={() => onPoolChange(p)}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
