import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Library, Search, Star } from 'lucide-react';
import type { VocabularyEntry } from '@/lib/types';
import { searchVocabulary, toggleFavorite } from '@/db/repositories';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { LevelBadge } from '@/components/shared/level-badge';
import { TtsButton } from '@/components/shared/tts-button';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EditWordDialog } from './EditWordDialog';
import { buildMemoryContext, generateInsights } from '@/memory/mnemonic';
import { cn } from '@/lib/utils';

function WordRow({
  entry,
  onOpen,
}: {
  entry: VocabularyEntry;
  onOpen: (e: VocabularyEntry) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(entry)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(entry)}
      className="flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-card"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void toggleFavorite(entry.id);
        }}
        className="shrink-0 text-muted-foreground transition-colors hover:text-warning"
        aria-label="Favorite"
      >
        <Star
          className={cn(
            'size-5',
            entry.favorite && 'fill-warning text-warning',
          )}
        />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {entry.article && (
            <span className="text-muted-foreground">{entry.article} </span>
          )}
          {entry.german}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {[entry.arabic, entry.english].filter(Boolean).join(' · ') || '—'}
        </p>
      </div>
      <TtsButton
        text={`${entry.article ? entry.article + ' ' : ''}${entry.german}`}
        className="size-9"
      />
      <LevelBadge level={entry.memoryLevel} />
    </div>
  );
}

export function VocabularyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [editing, setEditing] = useState<VocabularyEntry | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 180);
    return () => clearTimeout(id);
  }, [query]);

  const results = useLiveQuery(() => searchVocabulary(debounced), [debounced]);

  const categoriesPresent = useMemo(() => {
    const set = new Set<string>();
    (results ?? []).forEach((r) => set.add(r.category));
    return [...set].sort();
  }, [results]);

  const filtered = useMemo(
    () => (results ?? []).filter((r) => !category || r.category === category),
    [results, category],
  );

  // Built from the current result set so related-word suggestions stay relevant
  // without scanning the whole collection on every keystroke.
  const memoryCtx = useMemo(() => buildMemoryContext(results ?? []), [results]);
  const insights = useMemo(
    () => (editing ? generateInsights(editing, memoryCtx) : null),
    [editing, memoryCtx],
  );

  const openEntry = (e: VocabularyEntry) => {
    setEditing(e);
    setOpen(true);
  };

  if (results && results.length === 0 && !debounced) {
    return (
      <div>
        <PageHeader title={t('vocab.title')} onBack={() => navigate('/')} />
        <EmptyState
          icon={Library}
          title={t('vocab.empty')}
          description={t('vocab.emptyDesc')}
          action={
            <Button onClick={() => navigate('/import')}>
              {t('home.importCta')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('vocab.title')}
        subtitle={t('vocab.resultCount', { count: filtered.length })}
        onBack={() => navigate('/')}
      />

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('vocab.searchPlaceholder')}
          className="ps-10"
        />
      </div>

      {categoriesPresent.length > 1 && (
        <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
          <FilterChip
            active={category === null}
            label={t('vocab.filterAll')}
            onClick={() => setCategory(null)}
          />
          {categoriesPresent.map((c) => (
            <FilterChip
              key={c}
              active={category === c}
              label={t(`category.${c}`)}
              onClick={() => setCategory(c)}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {t('vocab.noResults', { query: debounced })}
        </p>
      ) : (
        <div className="space-y-1 lg:grid lg:grid-cols-2 lg:gap-x-4 lg:space-y-0">
          {filtered.map((e) => (
            <WordRow key={e.id} entry={e} onOpen={openEntry} />
          ))}
        </div>
      )}

      <EditWordDialog
        entry={editing}
        open={open}
        onOpenChange={setOpen}
        insights={insights}
      />
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
      )}
    >
      {label}
    </button>
  );
}
