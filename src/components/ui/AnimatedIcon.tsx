import { motion, useReducedMotion, type MotionProps } from "framer-motion";
import { type ReactNode } from "react";

type AnimatedIconVariant =
  | "tap"
  | "pulse"
  | "spin"
  | "success"
  | "warning"
  | "nav";

type AnimatedIconProps = {
  children: ReactNode;
  variant?: AnimatedIconVariant;
  className?: string;
} & MotionProps;

const variants = {
  tap: {
    whileTap: { scale: 0.9 },
    whileHover: { scale: 1.05 },
    transition: { type: "spring", stiffness: 420, damping: 24 },
  },
  pulse: {
    animate: { scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] },
    transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
  },
  spin: {
    animate: { rotate: 360 },
    transition: { duration: 1.2, repeat: Infinity, ease: "linear" },
  },
  success: {
    initial: { scale: 0.85, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { type: "spring", stiffness: 500, damping: 18 },
  },
  warning: {
    animate: { scale: [1, 1.06, 1] },
    transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
  },
  nav: {
    whileTap: { scale: 0.92 },
    whileHover: { y: -1 },
    transition: { type: "spring", stiffness: 400, damping: 26 },
  },
} satisfies Record<AnimatedIconVariant, MotionProps>;

export function AnimatedIcon({
  children,
  variant = "tap",
  className,
  ...props
}: AnimatedIconProps) {
  const prefersReducedMotion = useReducedMotion();
  const motionProps = variants[variant];
  const shouldReduceInfiniteMotion =
    prefersReducedMotion &&
    (variant === "pulse" || variant === "warning" || variant === "spin");

  return (
    <motion.span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      {...(shouldReduceInfiniteMotion ? {} : motionProps)}
      {...props}
    >
      {children}
    </motion.span>
  );
}
