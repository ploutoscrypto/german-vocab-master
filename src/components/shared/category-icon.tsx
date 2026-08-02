import {
  Apple,
  BookA,
  Box,
  Banknote,
  Briefcase,
  Building2,
  Bus,
  Cpu,
  Cross,
  Dumbbell,
  GraduationCap,
  HelpCircle,
  Home,
  Landmark,
  MessageCircle,
  Music,
  Palette,
  PawPrint,
  Plane,
  School,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  Sun,
  Trees,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { CATEGORY_ICON } from '@/lib/categories';

const ICONS: Record<string, LucideIcon> = {
  Sun,
  Apple,
  UtensilsCrossed,
  ShoppingCart,
  Plane,
  Bus,
  Briefcase,
  Building2,
  Stethoscope,
  Cross,
  Cpu,
  Wifi,
  TrendingUp,
  Users,
  Home,
  Landmark,
  Banknote,
  GraduationCap,
  School,
  BookA,
  Zap,
  Palette,
  Box,
  MessageCircle,
  Sparkles,
  PawPrint,
  Trees,
  Dumbbell,
  Music,
  HelpCircle,
};

export function CategoryIcon({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const Icon = ICONS[CATEGORY_ICON[category] ?? 'HelpCircle'] ?? HelpCircle;
  return <Icon className={className} />;
}
