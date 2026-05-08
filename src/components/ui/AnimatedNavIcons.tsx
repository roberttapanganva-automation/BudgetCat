import { motion, useReducedMotion } from "framer-motion";

type AnimatedNavIconProps = {
  active: boolean;
  className?: string;
};

function useDrawVariants() {
  const reduceMotion = useReducedMotion();

  const draw = {
    rest: {
      pathLength: 1,
      opacity: 1,
    },
    hidden: {
      pathLength: reduceMotion ? 1 : 0,
      opacity: 1,
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        duration: 0.78,
        ease: "easeInOut",
      },
    },
  };

  const pop = {
    rest: {
      scale: 1,
      opacity: 1,
    },
    hidden: {
      scale: reduceMotion ? 1 : 0.65,
      opacity: reduceMotion ? 1 : 0,
    },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.22,
        delay: 0.5,
        ease: "easeOut",
      },
    },
  };

  return { draw, pop, reduceMotion };
}

export function AnimatedDashboardIcon({
  active,
  className = "h-5 w-5",
}: AnimatedNavIconProps) {
  const { draw, reduceMotion } = useDrawVariants();

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      className={className}
      fill="none"
      initial={active ? "hidden" : "rest"}
      animate={active ? "visible" : "rest"}
      whileTap={reduceMotion ? undefined : { scale: 0.92 }}
    >
      <rect width="256" height="256" fill="none" />
      <motion.line variants={draw} x1="16" y1="216" x2="240" y2="216" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
      <motion.polyline variants={draw} points="152 216 152 152 104 152 104 216" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
      <motion.line variants={draw} x1="40" y1="116.69" x2="40" y2="216" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
      <motion.line variants={draw} x1="216" y1="216" x2="216" y2="116.69" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
      <motion.path variants={draw} d="M24,132.69l98.34-98.35a8,8,0,0,1,11.32,0L232,132.69" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
    </motion.svg>
  );
}

export function AnimatedLedgerIcon({
  active,
  className = "h-5 w-5",
}: AnimatedNavIconProps) {
  const { draw, pop, reduceMotion } = useDrawVariants();

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      className={className}
      fill="none"
      initial={active ? "hidden" : "rest"}
      animate={active ? "visible" : "rest"}
      whileTap={reduceMotion ? undefined : { scale: 0.92 }}
    >
      <rect width="256" height="256" fill="none" />
      <motion.path variants={draw} d="M40,56V184a16,16,0,0,0,16,16H216a8,8,0,0,0,8-8V80a8,8,0,0,0-8-8H56A16,16,0,0,1,40,56h0A16,16,0,0,1,56,40H192" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
      <motion.circle variants={pop} cx="180" cy="132" r="12" fill="currentColor" />
    </motion.svg>
  );
}

export function AnimatedAddIcon({ className = "h-6 w-6" }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  const draw = {
    hidden: {
      pathLength: reduceMotion ? 1 : 0,
      opacity: 1,
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        duration: 0.46,
        ease: "easeInOut",
      },
    },
  };

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      className={className}
      fill="none"
      initial={reduceMotion ? "visible" : "hidden"}
      animate="visible"
      whileTap={reduceMotion ? undefined : { scale: 0.9, rotate: 90 }}
    >
      <rect width="256" height="256" fill="none" />
      <motion.line variants={draw} x1="128" y1="48" x2="128" y2="208" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="20" />
      <motion.line variants={draw} x1="48" y1="128" x2="208" y2="128" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="20" />
    </motion.svg>
  );
}

export function AnimatedReportsIcon({
  active,
  className = "h-5 w-5",
}: AnimatedNavIconProps) {
  const { draw, reduceMotion } = useDrawVariants();

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      className={className}
      fill="none"
      initial={active ? "hidden" : "rest"}
      animate={active ? "visible" : "rest"}
      whileTap={reduceMotion ? undefined : { scale: 0.92 }}
    >
      <rect width="256" height="256" fill="none" />
      <motion.polyline variants={draw} points="48 208 48 136 96 136" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
      <motion.line variants={draw} x1="224" y1="208" x2="32" y2="208" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
      <motion.polyline variants={draw} points="96 208 96 88 152 88" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
      <motion.polyline variants={draw} points="152 208 152 40 208 40 208 208" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
    </motion.svg>
  );
}

export function AnimatedBillsIcon({
  active,
  className = "h-5 w-5",
}: AnimatedNavIconProps) {
  const { draw, pop, reduceMotion } = useDrawVariants();

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      className={className}
      fill="none"
      initial={active ? "hidden" : "rest"}
      animate={active ? "visible" : "rest"}
      whileTap={reduceMotion ? undefined : { scale: 0.92 }}
    >
      <rect width="256" height="256" fill="none" />
      <motion.rect variants={draw} x="40" y="40" width="176" height="176" rx="8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
      <motion.line variants={draw} x1="176" y1="24" x2="176" y2="56" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
      <motion.line variants={draw} x1="80" y1="24" x2="80" y2="56" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
      <motion.line variants={draw} x1="40" y1="88" x2="216" y2="88" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
      <motion.circle variants={pop} cx="128" cy="132" r="12" fill="currentColor" />
      <motion.circle variants={pop} cx="172" cy="132" r="12" fill="currentColor" />
      <motion.circle variants={pop} cx="84" cy="172" r="12" fill="currentColor" />
      <motion.circle variants={pop} cx="128" cy="172" r="12" fill="currentColor" />
      <motion.circle variants={pop} cx="172" cy="172" r="12" fill="currentColor" />
    </motion.svg>
  );
}
