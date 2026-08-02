import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  Brain,
  CheckCircle2,
  Flame,
  GraduationCap,
  Layers,
  RotateCcw,
  Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { db } from '@/db/database';
import { computeStatistics } from '@/lib/stats';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card } from '@/components/ui/card';

function Stat({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <Card className="p-4">
      <Icon className="mb-2 size-5 text-primary" />
      <p className="text-2xl font-bold tabular-nums">
        {value}
        {suffix && <span className="text-base font-medium text-muted-foreground">{suffix}</span>}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </Card>
  );
}

export function StatisticsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const vocab = useLiveQuery(() => db.vocabulary.toArray());
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], []);

  if (!vocab) return null;

  if (vocab.length === 0) {
    return (
      <div>
        <PageHeader title={t('stats.title')} onBack={() => navigate('/')} />
        <EmptyState icon={BarChart3} title={t('stats.title')} description={t('stats.noData')} />
      </div>
    );
  }

  const s = computeStatistics(vocab, sessions);
  const maxDay = Math.max(1, ...s.history.map((h) => h.reviewed));

  return (
    <div>
      <PageHeader title={t('stats.title')} onBack={() => navigate('/')} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Layers} label={t('stats.total')} value={s.total} />
        <Stat icon={GraduationCap} label={t('stats.mastered')} value={s.mastered} />
        <Stat icon={Brain} label={t('stats.learning')} value={s.learning} />
        <Stat icon={RotateCcw} label={t('stats.forgotten')} value={s.forgotten} />
        <Stat icon={Flame} label={t('stats.streak')} value={s.streak} suffix={` ${t('stats.days')}`} />
        <Stat icon={Target} label={t('stats.accuracy')} value={s.accuracy} suffix="%" />
        <Stat icon={CheckCircle2} label={t('stats.retention')} value={s.retention} suffix="%" />
        <Stat icon={BarChart3} label={t('stats.reviews')} value={s.reviewsTotal} />
      </div>

      <Card className="mt-4 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">{t('stats.history')}</h3>
          <span className="text-sm text-muted-foreground">
            {t('stats.todayReviewed')}: {s.todayReviewed}
          </span>
        </div>
        <div className="flex h-32 items-end justify-between gap-1">
          {s.history.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t bg-primary/80 transition-all"
                  style={{ height: `${(d.reviewed / maxDay) * 100}%` }}
                  title={`${d.date}: ${d.reviewed}`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {d.date.slice(8)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
