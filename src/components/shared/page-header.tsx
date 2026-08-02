import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function PageHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="mb-5 flex items-center gap-3">
      {onBack !== undefined && (
        <Button
          variant="ghost"
          size="icon"
          className="-ms-2 shrink-0"
          onClick={onBack ?? (() => navigate(-1))}
          aria-label="Back"
        >
          <ArrowLeft className="rtl:rotate-180" />
        </Button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {right}
    </header>
  );
}
