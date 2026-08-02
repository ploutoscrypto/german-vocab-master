import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowLeftRight,
  Blocks,
  Lightbulb,
  Link2,
  Quote,
  Split,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MemoryInsights } from '@/memory/mnemonic';
import { hasInsights } from '@/memory/mnemonic';
import { useAppStore } from '@/app/store';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function Row({
  icon: Icon,
  label,
  tone = 'default',
  children,
}: {
  icon: LucideIcon;
  label: string;
  tone?: 'default' | 'warning';
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-2.5">
      <Icon
        className={cn(
          'mt-0.5 size-4 shrink-0',
          tone === 'warning' ? 'text-warning' : 'text-primary',
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="mt-0.5 text-sm">{children}</div>
      </div>
    </div>
  );
}

export function MemoryPanel({
  insights,
  className,
}: {
  insights: MemoryInsights;
  className?: string;
}) {
  const { t } = useTranslation();
  const explanationLanguage = useAppStore(
    (s) => s.settings?.explanationLanguage ?? 'en',
  );

  if (!hasInsights(insights)) return null;

  const {
    genderRule,
    compound,
    cognate,
    similar,
    opposites,
    pitfall,
    separable,
    generatedExample,
  } = insights;

  return (
    <div
      className={cn(
        'divide-y divide-border rounded-xl border border-border bg-card p-4 text-start',
        className,
      )}
    >
      <p className="flex items-center gap-2 pb-2 font-semibold">
        <Lightbulb className="size-4 text-primary" />
        {t('memory.title')}
      </p>

      {pitfall && (
        <Row icon={AlertTriangle} label={t('memory.pitfall')} tone="warning">
          {explanationLanguage === 'ar' ? (
            <span className="lang-ar block" dir="rtl">
              {pitfall.ar}
            </span>
          ) : (
            pitfall.en
          )}
        </Row>
      )}

      {genderRule && (
        <Row icon={Lightbulb} label={t('memory.genderRule')}>
          {t(
            genderRule.strength === 'always'
              ? 'memory.suffixAlways'
              : 'memory.suffixUsually',
            { suffix: `-${genderRule.suffix}`, article: genderRule.article },
          )}
        </Row>
      )}

      {compound && (
        <Row icon={Blocks} label={t('memory.compound')}>
          <div className="flex flex-wrap items-center gap-1.5">
            {compound.map((part, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-muted-foreground">+</span>}
                <span className="rounded-lg bg-secondary px-2 py-1">
                  <span className="font-medium">{part.text}</span>
                  {part.gloss && (
                    <span className="text-muted-foreground"> · {part.gloss}</span>
                  )}
                </span>
              </span>
            ))}
          </div>
        </Row>
      )}

      {separable && (
        <Row icon={Split} label={t('memory.separable')}>
          {t('memory.separableHint', {
            prefix: separable.prefix,
            stem: separable.stem,
          })}
        </Row>
      )}

      {cognate && (
        <Row icon={Link2} label={t('memory.cognate')}>
          {t('memory.cognateHint', { word: cognate })}
        </Row>
      )}

      {opposites.length > 0 && (
        <Row icon={ArrowLeftRight} label={t('memory.opposites')}>
          <div className="flex flex-wrap gap-1.5">
            {opposites.map((o) => (
              <Badge key={o.word} variant="outline">
                {o.word}
              </Badge>
            ))}
          </div>
        </Row>
      )}

      {similar.length > 0 && (
        <Row icon={Blocks} label={t('memory.similar')}>
          <div className="space-y-1">
            {similar.map((s) => (
              <div key={s.id} className="flex items-baseline gap-2">
                <span className="font-medium">{s.german}</span>
                {s.meaning && (
                  <span className="truncate text-muted-foreground">{s.meaning}</span>
                )}
                {s.reason === 'lookalike' && (
                  <Badge variant="warning" className="shrink-0">
                    {t('memory.easilyConfused')}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </Row>
      )}

      {generatedExample && (
        <Row icon={Quote} label={t('memory.example')}>
          <span className="italic">{generatedExample}</span>
        </Row>
      )}
    </div>
  );
}
