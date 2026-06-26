/**
 * Shared animation presets for OpenNotes.
 * Centralizes spring configs and transition patterns for consistent micro-interactions.
 */

/** Snappy spring for buttons & small elements */
export const springSnappy = {
  type: "spring" as const,
  stiffness: 500,
  damping: 30,
  mass: 0.8,
};

/** Gentle spring for panels & larger surfaces */
export const springGentle = {
  type: "spring" as const,
  stiffness: 350,
  damping: 28,
  mass: 1,
};

/** Bouncy spring for playful feedback (icons, toggles) */
export const springBouncy = {
  type: "spring" as const,
  stiffness: 400,
  damping: 20,
  mass: 0.6,
};

/** Smooth ease-out for fades & opacity */
export const easeSmooth = [0.22, 1, 0.36, 1] as const;

/** Standard press feedback (scale down slightly) */
export const tapScale = { scale: 0.95 };

/** Light press for small buttons */
export const tapScaleSmall = { scale: 0.92 };

/** Reusable whileHover for interactive icons/buttons */
export const hoverLift = { scale: 1.05 };
export const hoverLiftSmall = { scale: 1.08 };

/** Icon crossfade preset — use with AnimatePresence mode="wait" */
export const iconFade = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
  transition: springSnappy,
};

/** Slide-up + fade for popups/menus */
export const popupEnter = {
  initial: { opacity: 0, y: 4, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 4, scale: 0.97 },
  transition: { duration: 0.2, ease: easeSmooth },
};

/** Spring-based popup for context menus */
export const contextMenuEnter = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: springGentle,
};

/** List item stagger container */
export const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.03 },
  },
};

/** List item stagger child */
export const staggerItem = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springSnappy,
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.15, ease: easeSmooth },
  },
};
