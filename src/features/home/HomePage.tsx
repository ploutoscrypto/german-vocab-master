import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  CalendarCheck,
  Flame,
  Library,
  RotateCcw,
  Shuffle,
  Sparkles,
  Upload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { db } from '@/db/database';
import { getStudyCounts } from '@/db/repositories';
import { computeStreak } from '@/lib/stats';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';

function Tile({
  icon: Icon,
  title,
  desc,
  onClick,
  tone = 'default',
  disabled,
  className,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  onClick: () => void;
  tone?: 'default' | 'primary';
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group flex flex-col items-start gap-3 rounded-2xl border p-4 text-start transition-all tap-safe active:scale-[0.98] disabled:opacity-50 lg:p-5',
        tone === 'primary'
          ? 'border-transparent bg-primary text-primary-foreground shadow-md'
          : 'border-border bg-card hover:border-primary/40 hover:shadow-sm',
        className,
      )}
    >
      <span
        className={cn(
          'flex size-11 items-center justify-center rounded-xl',
          tone === 'primary'
            ? 'bg-white/15 text-primary-foreground'
            : 'bg-primary/10 text-primary',
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="space-y-0.5">
        <span className="block font-semibold leading-tight">{title}</span>
        <span
          className={cn(
            'block text-sm',
            tone === 'primary'
              ? 'text-primary-foreground/80'
              : 'text-muted-foreground',
          )}
        >
          {desc}
        </span>
      </span>
    </button>
  );
}

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const counts = useLiveQuery(() => getStudyCounts());
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], []);
  const streak = computeStreak(sessions);

  if (!counts) {
    return <div className="py-20 text-center text-muted-foreground">…</div>;
  }

  if (counts.total === 0) {
    return (
      <EmptyState
        className="pt-24"
        icon={Sparkles}
        title={t('home.emptyTitle')}
        description={t('home.emptyDesc')}
        action={
          <Button size="lg" onClick={() => navigate('/import')}>
            <Upload />
            {t('home.importCta')}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('home.greeting')}</h1>
          <p className="text-sm text-muted-foreground">{t('home.subtitle')}</p>
        </div>
        {streak > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1.5 text-sm font-semibold text-warning">
            <Flame className="size-4" />
            {t('home.streak', { count: streak })}
          </span>
        )}
      </header>

      <Tile
        tone="primary"
        icon={CalendarCheck}
        title={t('home.reviewToday')}
        desc={
          counts.due > 0
            ? t('home.reviewTodayDesc', { count: counts.due })
            : t('home.reviewTodayZero')
        }
        onClick={() => navigate('/study/due')}
        className="lg:min-h-[9rem]"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Tile
          icon={Sparkles}
          title={t('home.learnNew')}
          desc={t('home.learnNewDesc', { count: counts.fresh })}
          onClick={() => navigate('/study/new')}
          disabled={counts.fresh === 0}
        />
        <Tile
          icon={RotateCcw}
          title={t('home.wrongWords')}
          desc={t('home.wrongWordsDesc', { count: counts.wrong })}
          onClick={() => navigate('/study/wrong')}
          disabled={counts.wrong === 0}
        />
        <Tile
          icon={Shuffle}
          title={t('home.random')}
          desc={t('home.randomDesc')}
          onClick={() => navigate('/study/random')}
        />
        <Tile
          icon={Library}
          title={t('home.allVocab')}
          desc={t('home.allVocabDesc', { count: counts.total })}
          onClick={() => navigate('/vocabulary')}
        />
        <Tile
          icon={BarChart3}
          title={t('home.statistics')}
          desc={t('home.statisticsDesc')}
          onClick={() => navigate('/statistics')}
          className="col-span-2 lg:col-span-1"
        />
      </div>
    </div>
  );
}
