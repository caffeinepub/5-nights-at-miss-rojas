import { useCallback, useEffect, useRef, useState } from "react";
import type { GameMode } from "../hooks/useGameEngine";

interface PowerCell {
  id: number;
  x: number;
  y: number;
  visible: boolean;
}

interface PowerMinigameProps {
  onSuccess: () => void;
  onFailure: () => void;
  mode?: GameMode;
}

const TOTAL_CELLS = 8;

function randomPosition(): { x: number; y: number } {
  // Keep cells within safe bounds (10-90% of width, 15-80% of height)
  return {
    x: 10 + Math.random() * 80,
    y: 15 + Math.random() * 65,
  };
}

function createCells(): PowerCell[] {
  return Array.from({ length: TOTAL_CELLS }, (_, i) => ({
    id: i,
    ...randomPosition(),
    visible: true,
  }));
}

export default function PowerMinigame({
  onSuccess,
  onFailure,
  mode = "normal",
}: PowerMinigameProps) {
  const isNightmare = mode === "nightmare";
  const CLICKS_NEEDED = 2;
  const TIME_LIMIT = 3;

  const [cells, setCells] = useState<PowerCell[]>(createCells);
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [finished, setFinished] = useState(false);
  const resolvedRef = useRef(false);
  const nextIdRef = useRef(TOTAL_CELLS);

  // Countdown timer
  useEffect(() => {
    if (finished) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 0.05;
        if (next <= 0) {
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [finished]);

  // Check win/lose condition
  useEffect(() => {
    if (finished || resolvedRef.current) return;

    if (clicks >= CLICKS_NEEDED) {
      resolvedRef.current = true;
      setFinished(true);
      setTimeout(() => onSuccess(), 400);
      return;
    }

    if (timeLeft <= 0) {
      resolvedRef.current = true;
      setFinished(true);
      setTimeout(() => onFailure(), 400);
    }
  }, [clicks, timeLeft, finished, onSuccess, onFailure]);

  const handleCellClick = useCallback(
    (cellId: number) => {
      if (finished || resolvedRef.current) return;

      setClicks((prev) => prev + 1);

      // Replace clicked cell with a new one at a random position
      setCells((prev) =>
        prev.map((cell) => {
          if (cell.id !== cellId) return cell;
          return {
            id: nextIdRef.current++,
            ...randomPosition(),
            visible: true,
          };
        }),
      );
    },
    [finished],
  );

  const progressPercent = (timeLeft / TIME_LIMIT) * 100;
  const clickProgressPercent = Math.min(100, (clicks / CLICKS_NEEDED) * 100);
  const isSuccess = clicks >= CLICKS_NEEDED;

  return (
    <div
      data-ocid="minigame.modal"
      className="absolute inset-0 z-40 flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(40,0,0,0.97) 0%, rgba(10,0,0,0.99) 100%)",
      }}
    >
      {/* Scanlines overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)",
        }}
      />

      {/* Flashing border emergency effect */}
      <div
        className="absolute inset-0 pointer-events-none z-10 animate-pulse"
        style={{
          border: "4px solid rgba(255,50,0,0.6)",
          boxShadow:
            "inset 0 0 40px rgba(255,50,0,0.15), 0 0 40px rgba(255,50,0,0.3)",
        }}
      />

      {/* Header */}
      <div className="relative z-20 px-6 pt-5 pb-3 flex flex-col items-center gap-2 pointer-events-none">
        {/* Flashing title */}
        <div
          className="font-display font-black uppercase tracking-widest text-center animate-pulse"
          style={{
            fontSize: "clamp(1.2rem, 3vw, 2rem)",
            color: "#ff3300",
            textShadow: "0 0 20px #ff3300, 0 0 40px #ff0000",
            letterSpacing: "0.15em",
          }}
        >
          ⚡ EMERGENCY POWER RESTORE ⚡
        </div>
        <div
          className="font-body text-sm tracking-wide text-center"
          style={{
            color: isNightmare
              ? "rgba(255,80,80,0.9)"
              : "rgba(255,150,100,0.9)",
          }}
        >
          {`Click ${CLICKS_NEEDED} cells to restore power! You have ${TIME_LIMIT} seconds!`}
        </div>
      </div>

      {/* Progress bars */}
      <div className="relative z-20 px-6 pb-2 space-y-2 pointer-events-none">
        {/* Time bar */}
        <div className="flex items-center gap-3">
          <span
            className="font-display font-bold text-xs uppercase tracking-widest w-14 text-right flex-shrink-0"
            style={{
              color: timeLeft < 2 ? "#ff3300" : "rgba(255,180,100,0.9)",
            }}
          >
            TIME
          </span>
          <div className="flex-1 h-3 bg-black/60 rounded-full overflow-hidden border border-red-900/60">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPercent}%`,
                background:
                  progressPercent > 50
                    ? "linear-gradient(90deg, #ff6600, #ffaa00)"
                    : progressPercent > 25
                      ? "linear-gradient(90deg, #ff3300, #ff6600)"
                      : "linear-gradient(90deg, #cc0000, #ff3300)",
                boxShadow:
                  progressPercent > 25
                    ? "0 0 8px rgba(255,100,0,0.6)"
                    : "0 0 8px rgba(255,0,0,0.8)",
                transition: "width 0.05s linear",
              }}
            />
          </div>
          <span
            className="font-display font-bold text-sm w-10 flex-shrink-0"
            style={{ color: timeLeft < 2 ? "#ff3300" : "#ff8844" }}
          >
            {Math.ceil(timeLeft)}s
          </span>
        </div>

        {/* Click progress bar */}
        <div className="flex items-center gap-3">
          <span
            className="font-display font-bold text-xs uppercase tracking-widest w-14 text-right flex-shrink-0"
            style={{ color: "rgba(100,255,150,0.9)" }}
          >
            CELLS
          </span>
          <div className="flex-1 h-3 bg-black/60 rounded-full overflow-hidden border border-green-900/60">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${clickProgressPercent}%`,
                background: "linear-gradient(90deg, #00aa44, #44ff88)",
                boxShadow: "0 0 8px rgba(0,255,100,0.6)",
              }}
            />
          </div>
          <span
            className="font-display font-bold text-sm w-10 flex-shrink-0"
            style={{ color: "#44ff88" }}
          >
            {clicks}/{CLICKS_NEEDED}
          </span>
        </div>
      </div>

      {/* Play area — power cells */}
      <div
        data-ocid="minigame.canvas_target"
        className="relative z-20 flex-1 mx-4 mb-4 rounded-lg overflow-hidden"
        style={{
          border: "1px solid rgba(255,80,0,0.3)",
          background: "rgba(0,0,0,0.4)",
          cursor: "crosshair",
        }}
      >
        {/* Grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,50,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,50,0,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Success / failure overlay */}
        {finished && (
          <div
            className="absolute inset-0 flex items-center justify-center z-30"
            style={{
              background: isSuccess
                ? "rgba(0,50,20,0.85)"
                : "rgba(60,0,0,0.85)",
            }}
          >
            <div
              className="font-display font-black uppercase text-center"
              style={{
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                color: isSuccess ? "#44ff88" : "#ff3300",
                textShadow: isSuccess
                  ? "0 0 30px #44ff88, 0 0 60px #00ff66"
                  : "0 0 30px #ff3300, 0 0 60px #ff0000",
              }}
            >
              {isSuccess ? "⚡ POWER RESTORED! ⚡" : "💀 POWER FAILED! 💀"}
            </div>
          </div>
        )}

        {/* Power cells */}
        {cells.map((cell) => (
          <PowerCellButton
            key={cell.id}
            cell={cell}
            onClick={() => handleCellClick(cell.id)}
            disabled={finished}
          />
        ))}
      </div>
    </div>
  );
}

interface PowerCellButtonProps {
  cell: PowerCell;
  onClick: () => void;
  disabled: boolean;
}

function PowerCellButton({ cell, onClick, disabled }: PowerCellButtonProps) {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    if (disabled || clicked) return;
    setClicked(true);
    onClick();
    setTimeout(() => setClicked(false), 100);
  };

  return (
    <button
      type="button"
      data-ocid="minigame.primary_button"
      onClick={handleClick}
      disabled={disabled}
      style={{
        position: "absolute",
        left: `${cell.x}%`,
        top: `${cell.y}%`,
        transform: "translate(-50%, -50%)",
        width: "52px",
        height: "52px",
        borderRadius: "50%",
        border: `2px solid ${clicked ? "#ffffff" : "#44ff88"}`,
        background: clicked
          ? "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(100,255,150,0.8) 60%, rgba(0,200,80,0.6) 100%)"
          : "radial-gradient(circle, rgba(0,255,100,0.3) 0%, rgba(0,180,60,0.15) 60%, rgba(0,100,40,0.1) 100%)",
        boxShadow: clicked
          ? "0 0 25px rgba(100,255,150,1), 0 0 50px rgba(0,255,100,0.8)"
          : "0 0 12px rgba(0,255,100,0.6), 0 0 24px rgba(0,255,100,0.3), inset 0 0 8px rgba(0,200,80,0.2)",
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.1s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "cellPulse 1.5s ease-in-out infinite",
      }}
    >
      <span
        style={{
          fontSize: "20px",
          filter: "drop-shadow(0 0 4px rgba(0,255,100,0.8))",
          userSelect: "none",
        }}
      >
        ⚡
      </span>
    </button>
  );
}
