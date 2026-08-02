import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import type { AnswerVerdict } from './answer';
import { checkAnswer } from './answer';
import type { QuizItem } from './session';
import { isRtlFace } from './session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function TypingCard({
  item,
  onResolved,
}: {
  item: QuizItem;
  /** Fired once the learner has seen the outcome and continues. */
  onResolved: (verdict: AnswerVerdict) => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [verdict, setVerdict] = useState<AnswerVerdict | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue('');
    setVerdict(null);
    inputRef.current?.focus();
  }, [item.entry.id, item.direction]);

  const rtl = isRtlFace(item.answerFace);

  function submit() {
    if (verdict) return;
    setVerdict(checkAnswer(value, item.answerText));
  }

  function continueNext() {
    if (verdict) onResolved(verdict);
  }

  return (
    <div className="w-full max-w-md space-y-4">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (verdict) continueNext();
            else submit();
          }
        }}
        readOnly={verdict !== null}
        dir={rtl ? 'rtl' : 'ltr'}
        placeholder={t('quiz.typePlaceholder')}
        className={cn(
          'h-14 text-center text-xl',
          rtl && 'lang-ar',
          verdict === 'correct' && 'border-success text-success',
          verdict === 'almost' && 'border-warning text-warning',
          verdict === 'wrong' && 'border-destructive text-destructive',
        )}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      {verdict && (
        <div className="animate-fade-in space-y-2 text-center">
          {verdict === 'correct' && (
            <p className="flex items-center justify-center gap-2 font-semibold text-success">
              <Check className="size-5" /> {t('quiz.correct')}
            </p>
          )}
          {verdict === 'almost' && (
            <p className="font-semibold text-warning">{t('quiz.almost')}</p>
          )}
          {verdict === 'wrong' && (
            <p className="flex items-center justify-center gap-2 font-semibold text-destructive">
              <X className="size-5" /> {t('quiz.wrong')}
            </p>
          )}
          {verdict !== 'correct' && (
            <p
              className={cn('text-xl font-semibold', rtl && 'lang-ar')}
              dir={rtl ? 'rtl' : 'ltr'}
            >
              {item.answerText}
            </p>
          )}
        </div>
      )}

      {verdict === null ? (
        <Button size="lg" className="w-full" disabled={!value.trim()} onClick={submit}>
          {t('quiz.check')}
        </Button>
      ) : (
        <div className="flex gap-2">
          {verdict !== 'correct' && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onResolved('correct')}
            >
              {t('quiz.iWasRight')}
            </Button>
          )}
          <Button size="lg" className="flex-1" onClick={continueNext}>
            {t('quiz.continue')}
          </Button>
        </div>
      )}
    </div>
  );
}
