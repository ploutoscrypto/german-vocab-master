import { Outlet } from 'react-router-dom';
import { NavRail, TabBar } from './nav';

/**
 * Responsive shell: a bottom tab bar on phones, a side rail from `lg` up.
 * Padding uses logical properties so the rail flips to the right in Arabic.
 */
export function AppShell() {
  return (
    <div className="min-h-dvh bg-background">
      <NavRail />
      <div className="lg:ps-60">
        <main className="mx-auto max-w-2xl px-4 pb-24 pt-6 animate-fade-in lg:max-w-5xl lg:px-8 lg:pb-10 lg:pt-10">
          <Outlet />
        </main>
      </div>
      <TabBar />
    </div>
  );
}
