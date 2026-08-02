/**
 * UI render tests: mount the real React components in jsdom against a real
 * (in-memory) IndexedDB and assert the app actually paints — catching runtime
 * crashes, broken i18n keys and RTL regressions that a type-check cannot see.
 */
import 'fake-indexeddb/auto';
import { JSDOM } from 'jsdom';

// --- jsdom globals must exist before React or Dexie are imported ------------
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
const g = globalThis as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
// Node >=21 exposes a read-only `navigator` getter, so plain assignment throws.
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
  writable: true,
});
// Mirror every DOM constructor/helper jsdom provides (HTMLFormElement, Event,
// MutationObserver, …) rather than enumerating them one by one.
for (const key of Object.getOwnPropertyNames(dom.window)) {
  if (key in globalThis) continue;
  try {
    g[key] = (dom.window as unknown as Record<string, unknown>)[key];
  } catch {
    /* some properties are getter-only; skipping them is fine */
  }
}
g.getComputedStyle = dom.window.getComputedStyle;
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = (id: number) => clearTimeout(id);
g.matchMedia =
  dom.window.matchMedia ??
  (() => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
dom.window.matchMedia = g.matchMedia as typeof dom.window.matchMedia;
g.IS_REACT_ACT_ENVIRONMENT = true;

let failures = 0;
function assert(label: string, cond: boolean, detail = '') {
  console.log(`${cond ? '✓' : '✗'} ${label}${!cond && detail ? ` — ${detail}` : ''}`);
  if (!cond) failures += 1;
}

async function main() {
  // Imported lazily so the globals above are already in place.
  const React = (await import('react')).default;
  const { render, screen, waitFor, cleanup } = await import('@testing-library/react');
  /** The nav rail repeats page labels, so text can legitimately match twice. */
  const has = (re: RegExp | string) => screen.queryAllByText(re).length > 0;
  const waitForText = (re: RegExp | string, what: string) =>
    waitFor(() => {
      if (!has(re)) throw new Error(`${what} not rendered`);
    }, { timeout: 5000 });
  const { db } = await import('@/db/database');
  const { commitImport } = await import('@/db/repositories');
  const { buildPreview } = await import('@/parsing/pipeline');
  const App = (await import('@/app/App')).default;
  const { useAppStore } = await import('@/app/store');

  await db.open();
  await Promise.all([db.vocabulary.clear(), db.settings.clear(), db.sessions.clear()]);

  console.log('--- 1. empty state renders ---');
  render(React.createElement(App));
  await waitForText(/Start your collection/i, 'empty state');
  assert('app boots and shows the empty state', has(/Start your collection/i));
  assert('import call-to-action present', has(/Import vocabulary/i));
  cleanup();

  console.log('\n--- 2. home renders with real vocabulary ---');
  const seeded = buildPreview(
    ['Deutsch', 'Artikel', 'Bedeutung (AR)',
     'Haus', 'das', 'بيت',
     'Wohnung', 'die', 'شقة',
     'Tisch', 'der', 'طاولة'].join('\n'),
    [],
    'seed',
  );
  await commitImport({ fresh: seeded.fresh, merges: [], needsReview: [], filename: 'seed' });
  assert('3 words seeded', (await db.vocabulary.count()) === 3);

  render(React.createElement(App));
  await waitForText(/Review Today/i, 'home');
  assert('Review Today tile renders', has(/Review Today/i));
  assert('Learn New Words tile renders', has(/Learn New Words/i));
  assert('All Vocabulary tile renders', has(/All Vocabulary/i));
  assert('Statistics tile renders', has(/Statistics/i));
  assert('new-word count is shown', has(/3 new words waiting/i));
  assert('navigation renders', has(/Words/i));
  cleanup();

  console.log('\n--- 3. interface languages ---');
  const checks: Array<[string, RegExp]> = [
    ['de', /Heute wiederholen/i],
    ['fr', /Réviser/i],
    ['ar', /مراجعة اليوم/],
  ];
  for (const [lang, expected] of checks) {
    // Go through the store exactly as the Settings screen does: this persists
    // the choice, switches i18next and updates <html lang/dir>.
    await useAppStore.getState().update({ uiLanguage: lang as 'de' | 'fr' | 'ar' });
    render(React.createElement(App));
    await waitForText(expected, `${lang} text`);
    assert(`UI renders in ${lang}`, has(expected));
    if (lang === 'ar') {
      assert('Arabic sets dir=rtl', dom.window.document.documentElement.dir === 'rtl');
    } else {
      assert(`${lang} sets dir=ltr`, dom.window.document.documentElement.dir === 'ltr');
    }
    cleanup();
  }
  await useAppStore.getState().update({ uiLanguage: 'en' });

  console.log('\n--- 4. responsive shell markup ---');
  const { container } = render(React.createElement(App));
  await waitForText(/Review Today/i, 'home');
  const rail = container.querySelector('aside');
  const tabbar = container.querySelector('nav.fixed');
  assert('desktop navigation rail exists', !!rail);
  assert('rail is hidden below lg', !!rail?.className.includes('lg:flex'));
  assert('mobile tab bar exists', !!tabbar);
  assert('tab bar hidden at lg', !!tabbar?.className.includes('lg:hidden'));
  const main = container.querySelector('main');
  assert('content widens on desktop', !!main?.className.includes('lg:max-w-5xl'));
  cleanup();

  console.log('\n--- 5. settings screen mounts ---');
  dom.window.location.hash = '#/settings';
  render(React.createElement(App));
  await waitForText(/Interface language/i, 'settings');
  assert('settings renders language controls', has(/Interface language/i));
  assert('settings renders backup controls', has(/Export database/i));
  cleanup();

  console.log('\n--- 6. store state ---');
  assert('settings loaded into the store', !!useAppStore.getState().settings);
  assert('store marked ready', useAppStore.getState().ready === true);
  assert('no storage error in a healthy environment',
    useAppStore.getState().storageError === null);

  console.log('\n--- 7. storage blocked degrades gracefully (never hangs) ---');
  // Simulate private browsing / a sandboxed iframe: IndexedDB throws.
  const realIndexedDB = globalThis.indexedDB;
  Object.defineProperty(globalThis, 'indexedDB', {
    value: {
      open() { throw new DOMException('The operation is insecure.', 'SecurityError'); },
    },
    configurable: true,
  });
  await db.close();
  useAppStore.setState({ ready: false, settings: null, storageError: null });
  await useAppStore.getState().load();
  const blocked = useAppStore.getState();
  assert('app still finishes booting', blocked.ready === true);
  assert('storage error is captured', !!blocked.storageError);
  assert('falls back to default settings', blocked.settings?.uiLanguage === 'en');

  render(React.createElement(App));
  await waitForText(/Local storage is blocked/i, 'storage-blocked screen');
  assert('explains the problem to the user', has(/Local storage is blocked/i));
  assert('offers a way out', has(/private \/ incognito/i));
  cleanup();

  Object.defineProperty(globalThis, 'indexedDB', {
    value: realIndexedDB,
    configurable: true,
  });

  console.log(`\n${failures === 0 ? 'ALL PASSED ✅' : failures + ' FAILED ❌'}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('UI smoke crashed:', err);
  process.exit(1);
});
