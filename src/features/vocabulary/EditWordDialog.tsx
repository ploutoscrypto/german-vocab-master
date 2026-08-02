import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import type { Article, VocabularyEntry } from '@/lib/types';
import { CATEGORIES } from '@/lib/categories';
import { deleteEntry, updateEntry } from '@/db/repositories';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/select-native';
import { MemoryPanel } from '@/components/shared/memory-panel';
import type { MemoryInsights } from '@/memory/mnemonic';

export function EditWordDialog({
  entry,
  open,
  onOpenChange,
  insights,
}: {
  entry: VocabularyEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insights?: MemoryInsights | null;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<VocabularyEntry | null>(entry);
  const [examplesText, setExamplesText] = useState('');

  useEffect(() => {
    setForm(entry);
    setExamplesText(entry?.examples.join('\n') ?? '');
  }, [entry]);

  if (!form) return null;

  const set = <K extends keyof VocabularyEntry>(
    key: K,
    value: VocabularyEntry[K],
  ) => setForm((f) => (f ? { ...f, [key]: value } : f));

  async function save() {
    if (!form) return;
    await updateEntry(form.id, {
      german: form.german.trim(),
      article: form.article,
      plural: form.plural?.trim() || null,
      english: form.english.trim(),
      arabic: form.arabic.trim(),
      category: form.category,
      notes: form.notes.trim(),
      examples: examplesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    onOpenChange(false);
  }

  async function remove() {
    if (!form) return;
    if (window.confirm(t('vocab.deleteConfirm'))) {
      await deleteEntry(form.id);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('vocab.edit')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1 space-y-1.5">
              <Label>{t('vocab.fieldArticle')}</Label>
              <NativeSelect
                value={form.article ?? ''}
                onChange={(e) =>
                  set('article', (e.target.value || null) as Article)
                }
              >
                <option value="">—</option>
                <option value="der">der</option>
                <option value="die">die</option>
                <option value="das">das</option>
              </NativeSelect>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>{t('vocab.fieldGerman')}</Label>
              <Input
                value={form.german}
                onChange={(e) => set('german', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>{t('vocab.fieldPlural')}</Label>
              <Input
                value={form.plural ?? ''}
                onChange={(e) => set('plural', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('vocab.fieldCategory')}</Label>
              <NativeSelect
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`category.${c}`)}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('vocab.fieldArabic')}</Label>
            <Input
              value={form.arabic}
              onChange={(e) => set('arabic', e.target.value)}
              dir="rtl"
              className="lang-ar"
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('vocab.fieldEnglish')}</Label>
            <Input
              value={form.english}
              onChange={(e) => set('english', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('vocab.fieldExamples')}</Label>
            <Textarea
              value={examplesText}
              onChange={(e) => setExamplesText(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('vocab.fieldNotes')}</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          {insights && <MemoryPanel insights={insights} />}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" onClick={() => void remove()}>
            <Trash2 className="text-destructive" />
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void save()}>{t('common.save')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
