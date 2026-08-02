import { useTranslation } from 'react-i18next';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { MemoryLevel } from '@/lib/types';

const VARIANT: Record<MemoryLevel, BadgeProps['variant']> = {
  new: 'muted',
  learning: 'warning',
  review: 'default',
  mastered: 'success',
};

export function LevelBadge({ level }: { level: MemoryLevel }) {
  const { t } = useTranslation();
  return <Badge variant={VARIANT[level]}>{t(`level.${level}`)}</Badge>;
}
