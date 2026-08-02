import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DatabaseZap, GraduationCap } from 'lucide-react';
import { useAppStore } from './store';
import { AppShell } from './layout';
import { HomePage } from '@/features/home/HomePage';
import { StudyPage } from '@/features/review/StudyPage';
import { ImportPage } from '@/features/import/ImportPage';
import { VocabularyPage } from '@/features/vocabulary/VocabularyPage';
import { StatisticsPage } from '@/features/statistics/StatisticsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background text-primary">
      <GraduationCap className="size-12 animate-pulse" />
      <p className="text-sm font-medium text-muted-foreground">German Vocabulary Master</p>
    </div>
  );
}

/**
 * The entire app is local-first, so if IndexedDB is unavailable there is
 * nothing useful to show. Explain why and how to fix it rather than failing
 * silently — this happens in private-browsing windows and sandboxed iframes.
 */
function StorageBlocked({ detail }: { detail: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <DatabaseZap className="size-8" />
        </div>
        <h1 className="text-xl font-bold">Local storage is blocked</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          German Vocabulary Master keeps every word on your own device, so it
          needs access to your browser&apos;s local database (IndexedDB). Your
          browser is currently blocking it.
        </p>
        <ul className="mt-4 space-y-1.5 text-start text-sm text-muted-foreground">
          <li>• Turn off private / incognito browsing and reload.</li>
          <li>• Open the app in its own tab rather than an embedded frame.</li>
          <li>• Allow cookies and site data for this site.</li>
        </ul>
        <p className="mt-4 break-words text-xs text-muted-foreground/70">{detail}</p>
      </div>
    </div>
  );
}

export default function App() {
  const ready = useAppStore((s) => s.ready);
  const storageError = useAppStore((s) => s.storageError);
  const load = useAppStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => useAppStore.getState().syncSystemTheme();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (!ready) return <Splash />;
  if (storageError) return <StorageBlocked detail={storageError} />;

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/vocabulary" element={<VocabularyPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="/study/:source" element={<StudyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
