'use client';

/**
 * useScrollReveal — Intersection Observer powered scroll animations.
 *
 * Adds `.is-visible` class to elements when they enter the viewport.
 * CSS handles the actual animation via .reveal and .reveal-delay-* classes.
 *
 * Usage:
 *   const ref = useScrollReveal<HTMLDivElement>({ threshold: 0.1, delay: 0 });
 *   <div ref={ref} className="reveal">Content</div>
 */

import { useEffect, useRef } from 'react';

export interface UseScrollRevealOptions {
  /** Viewport fraction threshold (0–1). Default: 0.1 */
  threshold?: number;
  /** Animation delay in ms. Default: 0 */
  delay?: number;
  /** Whether to only trigger once. Default: true */
  once?: boolean;
  /** Root margin. Default: '0px 0px -40px 0px' (trigger slightly before fully in view) */
  rootMargin?: string;
}

export function useScrollReveal<T extends HTMLElement>(
  options: UseScrollRevealOptions = {}
) {
  const { threshold = 0.1, delay = 0, once = true, rootMargin = '0px 0px -40px 0px' } = options;
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Add base class
    el.classList.add('reveal');
    if (delay > 0) {
      el.classList.add(`reveal-delay-${Math.min(Math.ceil(delay / 80), 5)}`);
      el.style.transitionDelay = `${delay}ms`;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            if (once) {
              observer.unobserve(entry.target);
            }
          } else if (!once) {
            entry.target.classList.remove('is-visible');
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [threshold, delay, once, rootMargin]);

  return ref;
}
