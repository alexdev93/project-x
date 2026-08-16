"use client";

import React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Scroll-reveal primitives. Replaces the old AnimatedBox, keeping its
 * one-shot IntersectionObserver behaviour but honouring prefers-reduced-motion
 * and supporting staggered groups.
 *
 * Distances are deliberately small (12px). Large travel reads as decoration;
 * a short offset reads as the content settling into place.
 */

const DURATION = 0.5;
const EASE = [0.16, 1, 0.3, 1] as const; // easeOutExpo — fast start, soft stop

const offsets = {
  up: { y: 12 },
  down: { y: -12 },
  left: { x: 12 },
  right: { x: -12 },
  none: {},
} as const;

export type RevealDirection = keyof typeof offsets;

function buildVariants(
  direction: RevealDirection,
  reduced: boolean,
): Variants {
  if (reduced) {
    // Still fade so grouped items do not appear all at once with no feedback,
    // but remove all positional travel.
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.01 } },
    };
  }

  return {
    hidden: { opacity: 0, ...offsets[direction] },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: DURATION, ease: EASE },
    },
  };
}

type RevealProps = {
  children: React.ReactNode;
  direction?: RevealDirection;
  /** Seconds to wait before animating. Ignored inside a Stagger. */
  delay?: number;
  className?: string;
  as?: React.ElementType;
};

export function Reveal({
  children,
  direction = "up",
  delay = 0,
  className,
  as,
}: RevealProps) {
  const reduced = useReducedMotion() ?? false;
  const Component = motion[(as as "div") ?? "div"] ?? motion.div;

  return (
    <Component
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -80px 0px" }}
      variants={buildVariants(direction, reduced)}
      transition={reduced ? undefined : { delay }}
    >
      {children}
    </Component>
  );
}

/**
 * Wraps a list so children animate in sequence. Children must be
 * <Stagger.Item> for the sequencing to apply.
 */
export function Stagger({
  children,
  className,
  /** Seconds between each child. Keep small — 0.06 reads as one motion. */
  step = 0.06,
  as: Component = "div",
}: {
  children: React.ReactNode;
  className?: string;
  step?: number;
  as?: React.ElementType;
}) {
  const reduced = useReducedMotion() ?? false;
  const MotionComponent = motion[(Component as "div") ?? "div"] ?? motion.div;

  return (
    <MotionComponent
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1, margin: "0px 0px -80px 0px" }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: reduced ? 0 : step },
        },
      }}
    >
      {children}
    </MotionComponent>
  );
}

function StaggerItem({
  children,
  direction = "up",
  className,
  as: Component = "div",
}: {
  children: React.ReactNode;
  direction?: RevealDirection;
  className?: string;
  as?: React.ElementType;
}) {
  const reduced = useReducedMotion() ?? false;
  const MotionComponent = motion[(Component as "div") ?? "div"] ?? motion.div;

  return (
    <MotionComponent
      className={cn(className)}
      variants={buildVariants(direction, reduced)}
    >
      {children}
    </MotionComponent>
  );
}

Stagger.Item = StaggerItem;
