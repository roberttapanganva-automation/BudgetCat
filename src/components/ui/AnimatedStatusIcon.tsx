import type { LucideIcon } from "../../lib/icons";

type AnimatedStatusIconProps = {
  icon: LucideIcon;
  animation?: "none" | "spin" | "pulse" | "bounce" | "ping";
  className?: string;
  label?: string;
};

const animationClass = {
  none: "",
  spin: "animate-spin",
  pulse: "animate-pulse",
  bounce: "animate-bounce",
  ping: "animate-ping",
};

export function AnimatedStatusIcon({
  icon: Icon,
  animation = "none",
  className = "",
  label,
}: AnimatedStatusIconProps) {
  return (
    <Icon
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`h-4 w-4 shrink-0 text-muted-foreground ${animationClass[animation]} ${className}`}
    />
  );
}