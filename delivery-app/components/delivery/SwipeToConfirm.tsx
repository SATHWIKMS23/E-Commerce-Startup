"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronRight, Check } from "lucide-react";

interface SwipeToConfirmProps {
  label: string;
  confirmedLabel?: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  colorScheme?: "blue" | "emerald" | "amber" | "indigo";
}

export function SwipeToConfirm({
  label,
  confirmedLabel = "Confirmed",
  onConfirm,
  disabled = false,
  colorScheme = "blue",
}: SwipeToConfirmProps) {
  const [dragProgress, setDragProgress] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);

  const colors = {
    blue: {
      sliderBg: "bg-blue-600",
      trackActive: "bg-blue-500/20",
      buttonBg: "hover:bg-blue-600/30",
    },
    emerald: {
      sliderBg: "bg-emerald-600",
      trackActive: "bg-emerald-500/20",
      buttonBg: "hover:bg-emerald-600/30",
    },
    amber: {
      sliderBg: "bg-amber-600",
      trackActive: "bg-amber-500/20",
      buttonBg: "hover:bg-amber-600/30",
    },
    indigo: {
      sliderBg: "bg-indigo-600",
      trackActive: "bg-indigo-500/20",
      buttonBg: "hover:bg-indigo-600/30",
    },
  }[colorScheme];

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled || isConfirmed || isLoading) return;
    isDraggingRef.current = true;
    startXRef.current = "touches" in e ? e.touches[0].clientX : e.clientX;
  };

  const handleTouchMove = (e: TouchEvent | MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const maxDrag = containerRef.current.clientWidth - 56; // 56px handle size
    const delta = Math.max(0, Math.min(maxDrag, clientX - startXRef.current));
    const progress = delta / maxDrag;
    setDragProgress(progress);

    if (progress >= 0.95) {
      triggerConfirm();
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (dragProgress < 0.95) {
      setDragProgress(0);
    }
  };

  const triggerConfirm = async () => {
    if (isConfirmed || isLoading) return;
    isDraggingRef.current = false;
    setDragProgress(1);
    setIsConfirmed(true);
    setIsLoading(true);

    try {
      await onConfirm();
    } catch {
      setIsConfirmed(false);
      setDragProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const onMove = (e: TouchEvent | MouseEvent) => handleTouchMove(e);
    const onEnd = () => handleTouchEnd();

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onEnd);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [dragProgress]);

  return (
    <div className="w-full space-y-2 select-none">
      <div
        ref={containerRef}
        onMouseDown={handleTouchStart}
        onTouchStart={handleTouchStart}
        className={`relative h-14 rounded-2xl p-1 overflow-hidden transition-all duration-200 border ${
          disabled
            ? "opacity-50 cursor-not-allowed border-white/5 bg-white/[0.02]"
            : "cursor-pointer border-white/10 bg-white/[0.04]"
        }`}
      >
        {/* Dynamic Track Fill */}
        <div
          className={`absolute inset-y-0 left-0 transition-all ${colors.trackActive}`}
          style={{ width: `${dragProgress * 100}%` }}
        />

        {/* Center Prompt Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs sm:text-sm font-semibold tracking-wide text-white/80">
            {isConfirmed ? confirmedLabel : label}
          </span>
        </div>

        {/* Draggable Thumb Knob */}
        <div
          className={`absolute top-1 bottom-1 w-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform ${
            isConfirmed ? "bg-emerald-500" : colors.sliderBg
          }`}
          style={{
            transform: `translateX(${
              containerRef.current
                ? dragProgress * (containerRef.current.clientWidth - 56)
                : 0
            }px)`,
          }}
        >
          {isConfirmed ? (
            <Check className="h-5 w-5 animate-scale-in" />
          ) : (
            <ChevronRight className="h-5 w-5 animate-pulse" />
          )}
        </div>
      </div>

      {/* Accessible Button Alternative */}
      <button
        type="button"
        disabled={disabled || isLoading || isConfirmed}
        onClick={triggerConfirm}
        className="w-full text-center text-[11px] text-white/40 hover:text-white/80 transition-colors py-1 cursor-pointer"
      >
        Or tap here to confirm
      </button>
    </div>
  );
}
