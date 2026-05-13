"use client";

import { animate, useMotionValue, useTransform } from "framer-motion";
import { motion } from "framer-motion";
import { useEffect } from "react";

export interface CountUpProps {
  value: number;
  fractionDigits?: number;
  suffix?: string;
  prefix?: string;
  durationMs?: number;
}

export function CountUp({
  value,
  fractionDigits = 0,
  suffix,
  prefix,
  durationMs = 900,
}: CountUpProps) {
  const motionValue = useMotionValue(0);
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  const rendered = useTransform(motionValue, (latest) => formatter.format(latest));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: durationMs / 1000,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [value, durationMs, motionValue]);

  return (
    <span className="inline-flex items-baseline">
      {prefix ? <span className="mr-1 text-fg-muted">{prefix}</span> : null}
      <motion.span>{rendered}</motion.span>
      {suffix ? <span className="ml-1 text-fg-muted">{suffix}</span> : null}
    </span>
  );
}
