"use client";

import { useEffect } from "react";

// Keep portalled dialogs above the on-screen keyboard without disabling pinch zoom.
export default function MobileViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    let frame = 0;
    function update() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (viewport!.scale !== 1) return;
        root.style.setProperty(
          "--mobile-viewport-height",
          `${viewport!.height}px`,
        );
        root.style.setProperty(
          "--mobile-viewport-top",
          `${viewport!.offsetTop}px`,
        );
      });
    }
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      root.style.removeProperty("--mobile-viewport-height");
      root.style.removeProperty("--mobile-viewport-top");
    };
  }, []);
  return null;
}
