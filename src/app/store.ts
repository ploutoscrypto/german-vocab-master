import { create } from 'zustand';
import type { Settings, ThemeMode } from '@/lib/types';
import { defaultSettings, getSettings, saveSettings } from '@/db/repositories';
import i18n, { applyDocumentLang } from '@/i18n';

interface AppState {
  settings: Settings | null;
  ready: boolean;
  /**
   * Set when IndexedDB is unavailable (private browsing, a sandboxed iframe,
   * or storage disabled by policy). The whole app depends on local storage, so
   * we surface this instead of hanging on the splash screen forever.
   */
  storageError: string | null;
  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
  syncSystemTheme: () => void;
}

function resolveDark(theme: ThemeMode): boolean {
  if (typeof window === 'undefined') return false;
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolveDark(theme));
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: null,
  ready: false,
  storageError: null,

  load: async () => {
    try {
      const settings = await getSettings();
      applyTheme(settings.theme);
      await i18n.changeLanguage(settings.uiLanguage);
      applyDocumentLang(settings.uiLanguage);
      set({ settings, ready: true, storageError: null });
    } catch (err) {
      // Never leave the user staring at a splash screen: finish booting with
      // defaults and let the UI explain that storage is blocked.
      applyTheme('system');
      applyDocumentLang(defaultSettings.uiLanguage);
      set({
        settings: defaultSettings,
        ready: true,
        storageError: err instanceof Error ? err.message : String(err),
      });
    }
  },

  update: async (patch) => {
    try {
      const settings = await saveSettings(patch);
      if (patch.theme) applyTheme(settings.theme);
      if (patch.uiLanguage) {
        await i18n.changeLanguage(settings.uiLanguage);
        applyDocumentLang(settings.uiLanguage);
      }
      set({ settings });
    } catch (err) {
      set({ storageError: err instanceof Error ? err.message : String(err) });
    }
  },

  syncSystemTheme: () => {
    const s = get().settings;
    if (s && s.theme === 'system') applyTheme('system');
  },
}));
