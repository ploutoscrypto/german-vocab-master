import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { speak, ttsSupported } from '@/lib/tts';
import { useAppStore } from '@/app/store';
import { cn } from '@/lib/utils';

export function TtsButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const enabled = useAppStore((s) => s.settings?.ttsEnabled ?? true);
  if (!ttsSupported() || !enabled || !text) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('text-muted-foreground hover:text-primary', className)}
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      aria-label="Listen"
    >
      <Volume2 />
    </Button>
  );
}
