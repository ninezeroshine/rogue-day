/**
 * Rogue-Day Icon System
 * Based on Lucide React with custom styling
 */

import { 
    // Navigation
    Target,
    LayoutList,
    BarChart3,
    User,
    
    // Actions
    Play,
    Check,
    CheckCircle,
    X,
    XCircle,
    Plus,
    Trash2,
    Save,
    
    // Game/Run
    Zap,
    Flame,
    Timer,
    Clock,
    Sparkles,
    Trophy,
    Medal,
    Rocket,
    
    // Stats
    TrendingUp,
    Calendar,
    Award,
    Star,
    
    // Tasks/Templates
    FileText,
    Package,
    Copy,
    Layers,
    
    // Settings
    Settings,
    Volume2,
    Vibrate,
    Bell,
    Info,
    AlertTriangle,
    
    // Misc
    ChevronDown,
    ChevronRight,
    Plane,
    Crosshair,
    BookOpen,
    Leaf,
    
    type LucideProps,
} from 'lucide-react';
import { memo, type FC } from 'react';

// ===== ICON WRAPPER =====

export interface IconProps extends Omit<LucideProps, 'ref'> {
    size?: number | string;
    color?: string;
    className?: string;
}

// Default icon styles for consistency
const defaultProps: Partial<IconProps> = {
    size: 20,
    strokeWidth: 2,
};

// ===== NAVIGATION ICONS =====

export const IconRun: FC<IconProps> = memo((props) => (
    <Target {...defaultProps} {...props} />
));

export const IconTemplates: FC<IconProps> = memo((props) => (
    <LayoutList {...defaultProps} {...props} />
));

export const IconJournal: FC<IconProps> = memo((props) => (
    <BarChart3 {...defaultProps} {...props} />
));

export const IconProfile: FC<IconProps> = memo((props) => (
    <User {...defaultProps} {...props} />
));

// ===== GAME ICONS =====

export const IconEnergy: FC<IconProps> = memo((props) => (
    <Zap {...defaultProps} {...props} />
));

export const IconXP: FC<IconProps> = memo((props) => (
    <Sparkles {...defaultProps} {...props} />
));

export const IconFire: FC<IconProps> = memo((props) => (
    <Flame {...defaultProps} {...props} />
));

export const IconTimer: FC<IconProps> = memo((props) => (
    <Timer {...defaultProps} {...props} />
));

export const IconClock: FC<IconProps> = memo((props) => (
    <Clock {...defaultProps} {...props} />
));

export const IconTrophy: FC<IconProps> = memo((props) => (
    <Trophy {...defaultProps} {...props} />
));

export const IconMedal: FC<IconProps> = memo((props) => (
    <Medal {...defaultProps} {...props} />
));

export const IconRocket: FC<IconProps> = memo((props) => (
    <Rocket {...defaultProps} {...props} />
));

export const IconExtraction: FC<IconProps> = memo((props) => (
    <Plane {...defaultProps} {...props} />
));

// ===== TIER ICONS =====

export const IconTier1: FC<IconProps> = memo((props) => (
    <Leaf {...defaultProps} {...props} />
));

export const IconTier2: FC<IconProps> = memo((props) => (
    <Zap {...defaultProps} {...props} />
));

export const IconTier3: FC<IconProps> = memo((props) => (
    <Flame {...defaultProps} {...props} />
));

// ===== ACTION ICONS =====

export const IconPlay: FC<IconProps> = memo((props) => (
    <Play {...defaultProps} {...props} />
));

export const IconCheck: FC<IconProps> = memo((props) => (
    <Check {...defaultProps} {...props} />
));

export const IconCheckCircle: FC<IconProps> = memo((props) => (
    <CheckCircle {...defaultProps} {...props} />
));

export const IconX: FC<IconProps> = memo((props) => (
    <X {...defaultProps} {...props} />
));

export const IconXCircle: FC<IconProps> = memo((props) => (
    <XCircle {...defaultProps} {...props} />
));

export const IconPlus: FC<IconProps> = memo((props) => (
    <Plus {...defaultProps} {...props} />
));

export const IconTrash: FC<IconProps> = memo((props) => (
    <Trash2 {...defaultProps} {...props} />
));

export const IconSave: FC<IconProps> = memo((props) => (
    <Save {...defaultProps} {...props} />
));

// ===== STATS ICONS =====

export const IconTrending: FC<IconProps> = memo((props) => (
    <TrendingUp {...defaultProps} {...props} />
));

export const IconCalendar: FC<IconProps> = memo((props) => (
    <Calendar {...defaultProps} {...props} />
));

export const IconAward: FC<IconProps> = memo((props) => (
    <Award {...defaultProps} {...props} />
));

export const IconStar: FC<IconProps> = memo((props) => (
    <Star {...defaultProps} {...props} />
));

// ===== TEMPLATE/PRESET ICONS =====

export const IconTemplate: FC<IconProps> = memo((props) => (
    <FileText {...defaultProps} {...props} />
));

export const IconPreset: FC<IconProps> = memo((props) => (
    <Package {...defaultProps} {...props} />
));

export const IconCopy: FC<IconProps> = memo((props) => (
    <Copy {...defaultProps} {...props} />
));

export const IconLayers: FC<IconProps> = memo((props) => (
    <Layers {...defaultProps} {...props} />
));

// ===== SETTINGS ICONS =====

export const IconSettings: FC<IconProps> = memo((props) => (
    <Settings {...defaultProps} {...props} />
));

export const IconSound: FC<IconProps> = memo((props) => (
    <Volume2 {...defaultProps} {...props} />
));

export const IconVibrate: FC<IconProps> = memo((props) => (
    <Vibrate {...defaultProps} {...props} />
));

export const IconBell: FC<IconProps> = memo((props) => (
    <Bell {...defaultProps} {...props} />
));

export const IconInfo: FC<IconProps> = memo((props) => (
    <Info {...defaultProps} {...props} />
));

export const IconWarning: FC<IconProps> = memo((props) => (
    <AlertTriangle {...defaultProps} {...props} />
));

// ===== MISC ICONS =====

export const IconChevronDown: FC<IconProps> = memo((props) => (
    <ChevronDown {...defaultProps} {...props} />
));

export const IconChevronRight: FC<IconProps> = memo((props) => (
    <ChevronRight {...defaultProps} {...props} />
));

export const IconCrosshair: FC<IconProps> = memo((props) => (
    <Crosshair {...defaultProps} {...props} />
));

export const IconBook: FC<IconProps> = memo((props) => (
    <BookOpen {...defaultProps} {...props} />
));

// ===== HELPER: Get tier icon by level =====

export function getTierIcon(tier: 1 | 2 | 3): FC<IconProps> {
    switch (tier) {
        case 1: return IconTier1;
        case 2: return IconTier2;
        case 3: return IconTier3;
    }
}

// ===== COLOR PRESETS =====

export const iconColors = {
    primary: 'var(--accent-primary)',
    secondary: 'var(--accent-secondary)',
    xp: 'var(--accent-xp)',
    warning: 'var(--accent-warning)',
    danger: 'var(--accent-danger)',
    muted: 'var(--text-muted)',
    default: 'currentColor',
} as const;

