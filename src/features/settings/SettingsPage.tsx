import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, RotateCcw, Upload } from 'lucide-react';
import type { DatabaseBackup, ThemeMode, UiLanguage } from '@/lib/types';
import { useAppStore } from '@/app/store';
import { LANGUAGES } from '@/i18n';
import {
  downloadBackup,
  getAutoBackupInfo,
  importBackup,
  parseBackup,
  restoreAutoBackup,
} from '@/db/backup';
import { clamp, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { NativeSelect } from '@/components/ui/select-native';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <Card className="divide-y divide-border">{children}</Card>
    </section>
  );
}

function Row({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.update);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<DatabaseBackup | null>(null);
  const [restored, setRestored] = useState(false);
  const auto = getAutoBackupInfo();

  if (!settings) return null;

  async function onBackupFile(file: File) {
    try {
      setPending(parseBackup(await file.text()));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('settings.title')} onBack={() => navigate('/')} />

      <Section title={t('settings.languageSection')}>
        <Row label={t('settings.uiLanguage')}>
          <NativeSelect
            className="w-40"
            value={settings.uiLanguage}
            onChange={(e) =>
              void update({ uiLanguage: e.target.value as UiLanguage })
            }
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </NativeSelect>
        </Row>
        <Row label={t('settings.explanationLanguage')}>
          <NativeSelect
            className="w-40"
            value={settings.explanationLanguage}
            onChange={(e) =>
              void update({ explanationLanguage: e.target.value as UiLanguage })
            }
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </NativeSelect>
        </Row>
      </Section>

      <Section title={t('settings.appearance')}>
        <Row label={t('settings.theme')}>
          <NativeSelect
            className="w-40"
            value={settings.theme}
            onChange={(e) =>
              void update({ theme: e.target.value as ThemeMode })
            }
          >
            <option value="system">{t('settings.themeSystem')}</option>
            <option value="light">{t('settings.themeLight')}</option>
            <option value="dark">{t('settings.themeDark')}</option>
          </NativeSelect>
        </Row>
      </Section>

      <Section title={t('settings.learning')}>
        <Row label={t('settings.tts')} desc={t('settings.ttsDesc')}>
          <Switch
            checked={settings.ttsEnabled}
            onCheckedChange={(v) => void update({ ttsEnabled: v })}
          />
        </Row>
        <Row label={t('settings.dailyNew')}>
          <Input
            type="number"
            min={0}
            max={999}
            className="w-24"
            value={settings.dailyNewLimit}
            onChange={(e) =>
              void update({ dailyNewLimit: clamp(Number(e.target.value), 0, 999) })
            }
          />
        </Row>
        <Row label={t('settings.dailyReview')}>
          <Input
            type="number"
            min={0}
            max={9999}
            className="w-24"
            value={settings.dailyReviewLimit}
            onChange={(e) =>
              void update({
                dailyReviewLimit: clamp(Number(e.target.value), 0, 9999),
              })
            }
          />
        </Row>
      </Section>

      <Section title={t('settings.data')}>
        <Row label={t('settings.export')} desc={t('settings.exportDesc')}>
          <Button variant="outline" size="sm" onClick={() => void downloadBackup()}>
            <Download className="size-4" />
          </Button>
        </Row>
        <Row label={t('settings.import')} desc={t('settings.importDesc')}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onBackupFile(f);
            }}
          />
        </Row>
        {pending && (
          <div className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">
              {pending.vocabulary.length} {t('common.words')}
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  void importBackup(pending, 'replace').then(() => setPending(null))
                }
              >
                {t('settings.importReplace')}
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  void importBackup(pending, 'merge').then(() => setPending(null))
                }
              >
                {t('settings.importMerge')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPending(null)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}
        <Separator />
        <Row
          label={t('settings.autoBackup')}
          desc={
            auto
              ? t('settings.autoBackupInfo', {
                  date: formatDate(auto.exportedAt, settings.uiLanguage),
                  count: auto.count,
                })
              : t('settings.autoBackupNone')
          }
        >
          {auto && (
            <Button
              variant="outline"
              size="sm"
              disabled={restored}
              onClick={() => void restoreAutoBackup().then(() => setRestored(true))}
            >
              <RotateCcw className="size-4" />
            </Button>
          )}
        </Row>
      </Section>

      <Section title={t('settings.about')}>
        <div className="p-4 text-sm text-muted-foreground">
          {t('settings.aboutText')}
          <p className="mt-2 text-xs">v1.0.0 · {t('settings.installDesc')}</p>
        </div>
      </Section>
    </div>
  );
}
