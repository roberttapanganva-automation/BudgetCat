import { forwardRef, type ComponentType } from "react";
import type { Icon, IconProps } from "@phosphor-icons/react";
import {
  ArrowsClockwise,
  ArrowCircleDown,
  ArrowCircleUp,
  ArrowRight,
  Barbell,
  Bank,
  Bell,
  Briefcase,
  BuildingOffice,
  Bus,
  CalendarBlank,
  CalendarDots,
  CalendarPlus,
  Car,
  CaretDown,
  CaretRight,
  ChartBar,
  Check,
  CheckCircle,
  Clock,
  Coffee,
  CircleNotch,
  CreditCard,
  CurrencyCircleDollar,
  CurrencyDollar,
  Database,
  DownloadSimple,
  Drop,
  FilmSlate,
  FunnelSimple,
  GasPump,
  GearSix,
  Gift,
  GraduationCap,
  HandCoins,
  Heart,
  Heartbeat,
  House,
  Info,
  Lamp,
  ListBullets,
  MagnifyingGlass,
  Moon,
  NotePencil,
  PaintBrush,
  PawPrint,
  Phone,
  PiggyBank,
  Airplane,
  Plus,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SignOut,
  DeviceMobile,
  Sparkle,
  Sun,
  Target,
  TrendDown,
  TrendUp,
  Trophy,
  Trash,
  UserCircle,
  UserPlus,
  Wallet,
  Warning,
  WarningCircle,
  WarningOctagon,
  WifiHigh,
  WifiSlash,
  X,
  Lightning,
  SpeakerHigh,
  SpeakerSlash,
  FileArrowDown,
  FileCode,
  HouseLine,
  Briefcase as BriefcaseBusinessIcon,
  Laptop,
  ForkKnife,
  LockKey,
  ChartPieSlice,
} from "@phosphor-icons/react";

export type LucideIcon = Icon;

const withDefaultWeight = (
  IconComponent: Icon,
  weight: IconProps["weight"] = "regular",
) => {
  const Wrapped = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
    <IconComponent
      ref={ref}
      {...props}
      weight={props.weight ?? weight}
    />
  )) as unknown as Icon;
  return Wrapped;
};

export const AlertCircle = withDefaultWeight(WarningCircle);
export const AlertTriangle = withDefaultWeight(WarningOctagon);
export const ArrowDownCircle = withDefaultWeight(ArrowCircleDown, "duotone");
export const ArrowUpCircle = withDefaultWeight(ArrowCircleUp, "duotone");
export const BadgeDollarSign = withDefaultWeight(CurrencyCircleDollar, "duotone");
export const Banknote = withDefaultWeight(Bank, "duotone");
export const BarChart3 = withDefaultWeight(ChartBar, "duotone");
export const CalendarClock = withDefaultWeight(CalendarDots, "duotone");
export const CalendarDays = withDefaultWeight(CalendarBlank, "duotone");
export const CheckCircle2 = withDefaultWeight(CheckCircle, "duotone");
export const ChevronDown = withDefaultWeight(CaretDown);
export const ChevronRight = withDefaultWeight(CaretRight);
export const CircleDollarSign = withDefaultWeight(CurrencyCircleDollar, "duotone");
export const Clock3 = withDefaultWeight(Clock, "duotone");
export const DollarSign = withDefaultWeight(CurrencyDollar);
export const Download = withDefaultWeight(DownloadSimple);
export const Droplets = withDefaultWeight(Drop, "duotone");
export const Filter = withDefaultWeight(FunnelSimple);
export const Fuel = withDefaultWeight(GasPump, "duotone");
export const HeartPulse = withDefaultWeight(Heartbeat, "duotone");
export const HelpCircle = withDefaultWeight(Info);
export const Home = withDefaultWeight(House, "duotone");
export const LayoutDashboard = withDefaultWeight(HouseLine, "duotone");
export const Landmark = withDefaultWeight(Bank, "duotone");
export const ListChecks = withDefaultWeight(ListBullets, "duotone");
export const ListFilter = withDefaultWeight(ListBullets, "duotone");
export const Loader2 = withDefaultWeight(CircleNotch, "bold");
export const LogOut = withDefaultWeight(SignOut);
export const LockKeyhole = withDefaultWeight(LockKey);
export const Mail = withDefaultWeight(NotePencil);
export const Palette = withDefaultWeight(PaintBrush, "duotone");
export const Pencil = withDefaultWeight(NotePencil);
export const ReceiptText = withDefaultWeight(Receipt, "duotone");
export const RefreshCcw = withDefaultWeight(ArrowsClockwise);
export const RefreshCw = withDefaultWeight(ArrowsClockwise);
export const RotateCcw = withDefaultWeight(ArrowsClockwise);
export const Search = withDefaultWeight(MagnifyingGlass);
export const Settings = withDefaultWeight(GearSix, "duotone");
export const Sparkles = withDefaultWeight(Sparkle, "duotone");
export const Trash2 = withDefaultWeight(Trash);
export const TrendingDown = withDefaultWeight(TrendDown, "duotone");
export const TrendingUp = withDefaultWeight(TrendUp, "duotone");
export const UserRound = withDefaultWeight(UserCircle, "duotone");
export const Volume2 = withDefaultWeight(SpeakerHigh, "duotone");
export const VolumeX = withDefaultWeight(SpeakerSlash, "duotone");
export const WalletCards = withDefaultWeight(Wallet, "duotone");
export const Wifi = withDefaultWeight(WifiHigh, "duotone");
export const WifiOff = withDefaultWeight(WifiSlash, "duotone");
export const Zap = withDefaultWeight(Lightning, "duotone");
export const FileDown = withDefaultWeight(FileArrowDown, "duotone");
export const FileJson = withDefaultWeight(FileCode, "duotone");
export const BriefcaseBusiness = withDefaultWeight(BriefcaseBusinessIcon, "duotone");
export const Utensils = withDefaultWeight(ForkKnife, "duotone");
export const PieChart = withDefaultWeight(ChartPieSlice, "duotone");

export {
  ArrowRight,
  Bell,
  Briefcase,
  BuildingOffice as Building2,
  Bus,
  CalendarPlus,
  Car,
  Check,
  Coffee,
  CreditCard,
  Database,
  FilmSlate as Film,
  Gift,
  GraduationCap,
  HandCoins,
  Heart,
  Lamp as Lightbulb,
  Moon,
  PawPrint,
  Phone,
  PiggyBank,
  Airplane as Plane,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  DeviceMobile as Smartphone,
  Sun,
  Target,
  Trophy,
  UserPlus,
  Wallet,
  Warning,
  X,
  Barbell as Dumbbell,
  Laptop,
  GearSix as SettingsIcon,
  CalendarBlank as Calendar,
  Receipt,
};
