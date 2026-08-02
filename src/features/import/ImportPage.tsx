import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, FileText, Loader2, Sparkles, Upload } from 'lucide-react';
import type { ImportPreview, ParsedCandidate } from '@/lib/types';
import { db } from '@/db/database';
import { buildPreview, detectSourceName } from '@/parsing/pipeline';
import { commitImport } from '@/db/repositories';
import { autoBackup } from '@/db/backup';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/empty-state';

type Step = 'input' | 'preview' | 'done';

function CandidateRow({ c, muted }: { c: ParsedCandidate; muted?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate font-medium">
          {c.article && <span className="text-muted-foreground">{c.article} </span>}
          {c.german}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {[c.arabic, c.english].filter(Boolean).join(' · ') || '—'}
        </p>
      </div>
      <Badge variant={muted ? 'muted' : 'secondary'} className="shrink-0">
        {t(`category.${c.category}`)}
      </Badge>
    </div>
  );
}

function Bucket({
  title,
  tone,
  items,
  render,
}: {
  title: string;
  tone: 'default' | 'success' | 'warning' | 'muted';
  items: unknown[];
  render: () => React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center gap-2">
        <Badge variant={tone}>{items.length}</Badge>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="max-h-64 overflow-y-auto">{render()}</div>
    </Card>
  );
}

export function ImportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('input');
  const [text, setText] = useState('');
  const [source, setSource] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [includeReview, setIncludeReview] = useState(true);
  const [result, setResult] = useState<{ added: number; merged: number } | null>(
    null,
  );

  async function handleFile(file: File) {
    const content = await file.text();
    setText(content);
    if (!source) {
      // ChatGPT exports carry their conversation title on the first line —
      // a much better source label than the mangled filename.
      const title = detectSourceName(content);
      setSource(title ?? file.name.replace(/\.[^.]+$/, ''));
    }
  }

  async function analyze() {
    if (!text.trim()) return;
    setAnalyzing(true);
    try {
      const existing = await db.vocabulary.toArray();
      const src = source.trim() || detectSourceName(text) || 'Import';
      const result = buildPreview(text, existing, src);
      setPreview(result);
      setStep('preview');
    } finally {
      setAnalyzing(false);
    }
  }

  async function commit() {
    if (!preview) return;
    const rec = await commitImport({
      fresh: preview.fresh,
      merges: preview.merges,
      needsReview: includeReview ? preview.needsReview : [],
      filename: preview.source,
    });
    setResult({ added: rec.added, merged: rec.merged });
    void autoBackup();
    setStep('done');
  }

  if (step === 'done' && result) {
    return (
      <div>
        <PageHeader title={t('import.title')} onBack={() => navigate('/')} />
        <div className="pt-6 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-success/15 text-success">
            <Check className="size-8" />
          </div>
          <h2 className="text-xl font-bold">{t('import.committedTitle')}</h2>
          <p className="mt-2 text-muted-foreground">
            {t('import.committedDesc', {
              added: result.added,
              merged: result.merged,
            })}
          </p>
          <div className="mx-auto mt-6 flex max-w-xs flex-col gap-2">
            <Button size="lg" onClick={() => navigate('/study/new')}>
              {t('import.reviewNow')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setText('');
                setSource('');
                setPreview(null);
                setResult(null);
                setStep('input');
              }}
            >
              {t('import.importMore')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'preview' && preview) {
    const total =
      preview.fresh.length + (includeReview ? preview.needsReview.length : 0);
    const nothing =
      preview.fresh.length === 0 &&
      preview.merges.length === 0 &&
      preview.needsReview.length === 0;

    return (
      <div className="space-y-4">
        <PageHeader
          title={t('import.previewTitle')}
          onBack={() => setStep('input')}
        />

        {nothing ? (
          <EmptyState
            icon={Sparkles}
            title={t('import.nothingFound')}
            description={t('import.nothingFoundDesc')}
            action={
              <Button onClick={() => setStep('input')}>
                {t('import.reanalyze')}
              </Button>
            }
          />
        ) : (
          <>
            <Bucket
              title={t('import.newWords')}
              tone="success"
              items={preview.fresh}
              render={() =>
                preview.fresh.map((c, i) => <CandidateRow key={i} c={c} />)
              }
            />
            <Bucket
              title={t('import.merged')}
              tone="default"
              items={preview.merges}
              render={() =>
                preview.merges.map((m, i) => (
                  <CandidateRow key={i} c={m.candidate} muted />
                ))
              }
            />
            {preview.needsReview.length > 0 && (
              <Card className="p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="warning">{preview.needsReview.length}</Badge>
                    <h3 className="font-semibold">{t('import.needsReview')}</h3>
                  </div>
                  <Switch
                    checked={includeReview}
                    onCheckedChange={setIncludeReview}
                    aria-label={t('import.includeReview')}
                  />
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {preview.needsReview.map((c, i) => (
                    <CandidateRow key={i} c={c} muted />
                  ))}
                </div>
              </Card>
            )}

            <div className="sticky bottom-20 z-10">
              <Button
                size="lg"
                className="w-full shadow-lg"
                disabled={total === 0}
                onClick={() => void commit()}
              >
                {preview.merges.length > 0
                  ? t('import.commitMerged', {
                      count: total,
                      merged: preview.merges.length,
                    })
                  : t('import.commit', { count: total })}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('import.title')} subtitle={t('import.subtitle')} onBack={() => navigate('/')} />

      <Tabs defaultValue="paste">
        <TabsList className="w-full">
          <TabsTrigger value="paste" className="flex-1">
            {t('import.pasteTab')}
          </TabsTrigger>
          <TabsTrigger value="file" className="flex-1">
            {t('import.fileTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paste">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('import.pastePlaceholder')}
            className="min-h-[220px]"
          />
        </TabsContent>

        <TabsContent value="file">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) void handleFile(f);
            }}
            className="flex min-h-[180px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/50"
          >
            {text ? (
              <>
                <FileText className="size-8 text-primary" />
                <p className="text-sm font-medium">
                  {source || 'file'} · {text.length} chars
                </p>
              </>
            ) : (
              <>
                <Upload className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium">{t('import.dropHere')}</p>
                <p className="text-xs text-muted-foreground">{t('import.orBrowse')}</p>
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.markdown,.csv,text/plain,text/markdown,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </TabsContent>
      </Tabs>

      <div className="space-y-1.5">
        <Label htmlFor="source">{t('import.sourceLabel')}</Label>
        <Input
          id="source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder={t('import.sourcePlaceholder')}
        />
      </div>

      <p className="text-xs text-muted-foreground">{t('import.formatsHint')}</p>

      <Button
        size="lg"
        className="w-full"
        disabled={!text.trim() || analyzing}
        onClick={() => void analyze()}
      >
        {analyzing ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {analyzing ? t('import.analyzing') : t('import.analyze')}
      </Button>
    </div>
  );
}
