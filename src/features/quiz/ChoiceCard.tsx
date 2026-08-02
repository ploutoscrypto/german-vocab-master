import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import type { QuizItem } from './session';
import { isRtlFace } from './session';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ChoiceCard({
  item,
  onResolved,
}: {
  item: QuizItem;
  onResolved: (correct: boolean) => void;
}) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<number | null>(null);
  const rtl = isRtlFace(item.answerFace);

  useEffect(() => {
    setPicked(null);
  }, [item.entry.id, item.direction]);

  // Keyboard: 1–4 selects an option.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (picked !== null) {
        if (e.key === 'Enter') onResolved(picked === item.correctIndex);
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= item.options.length) setPicked(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picked, item, onResolved]);

  return (
    <div className="w-full max-w-md space-y-3">
      <div className="grid gap-2">
        {item.options.map((opt, i) => {
          const isCorrect = i === item.correctIndex;
          const isPicked = picked === i;
          const revealed = picked !== null;
          return (
            <button
              key={`${opt}-${i}`}
              type="button"
              disabled={revealed}
              onClick={() => setPicked(i)}
              dir={rtl ? 'rtl' : 'ltr'}
              className={cn(
                'flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3.5 text-start text-lg transition-all tap-safe',
                rtl && 'lang-ar',
                !revealed && 'border-border bg-card hover:border-primary/50 active:scale-[0.99]',
                revealed && isCorrect && 'border-success bg-success/10 text-success',
                revealed && isPicked && !isCorrect && 'border-destructive bg-destructive/10 text-destructive',
                revealed && !isCorrect && !isPicked && 'border-border opacity-50',
              )}
            >
              <span className="min-w-0 flex-1 break-words">{opt}</span>
              {revealed && isCorrect && <Check className="size-5 shrink-0" />}
              {revealed && isPicked && !isCorrect && <X className="size-5 shrink-0" />}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <Button
          size="lg"
          className="w-full animate-fade-in"
          onClick={() => onResolved(picked === item.correctIndex)}
        >
          {t('quiz.continue')}
        </Button>
      )}
    </div>
  );
}
