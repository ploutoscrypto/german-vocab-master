import { NavLink } from 'react-router-dom';
import { BarChart3, BookOpen, GraduationCap, Home, Settings, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export const NAV_ITEMS = [
  { to: '/', key: 'home', icon: Home, end: true },
  { to: '/vocabulary', key: 'vocab', icon: BookOpen, end: false },
  { to: '/import', key: 'import', icon: Upload, end: false },
  { to: '/statistics', key: 'stats', icon: BarChart3, end: false },
  { to: '/settings', key: 'settings', icon: Settings, end: false },
] as const;

/** Bottom tab bar — phones and small tablets only. */
export function TabBar() {
  const { t } = useTranslation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 backdrop-blur-lg safe-b lg:hidden">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        {NAV_ITEMS.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={key}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            <Icon className="size-5" />
            <span>{t(`nav.${key}`)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/**
 * Side navigation for desktop. Uses logical inset/padding so it appears on the
 * right automatically in Arabic (RTL) without a separate layout.
 */
export function NavRail() {
  const { t } = useTranslation();
  return (
    <aside className="fixed inset-y-0 start-0 z-40 hidden w-60 flex-col border-e border-border bg-card/60 px-4 py-6 lg:flex">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <GraduationCap className="size-5" />
        </span>
        <span className="text-sm font-bold leading-tight">
          {t('app.name')}
        </span>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={key}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )
            }
          >
            <Icon className="size-5 shrink-0" />
            <span>{t(`nav.${key}`)}</span>
          </NavLink>
        ))}
      </nav>

      <p className="mt-auto px-3 text-xs text-muted-foreground">
        {t('app.tagline')}
      </p>
    </aside>
  );
}
