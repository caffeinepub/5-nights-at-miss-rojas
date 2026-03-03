import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import GameScreen from "./GameScreen";
import {
  type AnimatronicId,
  type GameMode,
  useGameEngine,
} from "./hooks/useGameEngine";

const KILLER_INFO: Record<AnimatronicId, { displayName: string; tip: string }> =
  {
    missRojas: {
      displayName: "Miss Rojas",
      tip: "She comes from the LEFT. Watch the left camera and close the left door when she reaches LEFT DOOR CAM.",
    },
    mrsPineda: {
      displayName: "Mrs. Pineda",
      tip: "She comes from the RIGHT. Keep an eye on the right camera and close the right door when she reaches RIGHT DOOR CAM.",
    },
    coachStutz: {
      displayName: "Coach Stutz",
      tip: "He moves FAST from the LEFT. Check LEFT DOOR CAM often and close the left door quickly — he doesn't wait.",
    },
    mrMoody: {
      displayName: "Mr. Moody",
      tip: "Mr. Moody is friendly and won't hurt you. If you died, check the other animatronics — they were the real threat.",
    },
    coachWolferd: {
      displayName: "Coach Wolferd",
      tip: "He is RARE but deadly. When you see the WOLFERD SPAWNED warning, close the right door immediately and wait for him to leave.",
    },
  };

export default function App() {
  const {
    state,
    startGame,
    toggleLeftDoor,
    toggleRightDoor,
    toggleCamera,
    goToMenu,
    retryNight,
    goToNextNight,
    resolvePowerMinigame,
    adminAutoWin,
    adminWinAll,
    adminKillAll,
    adminMaxPower,
    adminToggleFreeze,
    adminUnlockNights,
    adminToggleGodMode,
    adminSkipToNight,
  } = useGameEngine();

  const [shakeActive, setShakeActive] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>("normal");
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [showMoodyAchievement, setShowMoodyAchievement] = useState(false);

  // Trigger shake on jumpscare
  useEffect(() => {
    if (state.jumpscareVisible) {
      setShakeActive(true);
      const t = setTimeout(() => setShakeActive(false), 600);
      return () => clearTimeout(t);
    }
  }, [state.jumpscareVisible]);

  // Show Mr. Moody achievement popup when first earned
  useEffect(() => {
    if (state.mrMoodyAchievement && !showMoodyAchievement) {
      setShowMoodyAchievement(true);
      const t = setTimeout(() => setShowMoodyAchievement(false), 5000);
      return () => clearTimeout(t);
    }
  }, [state.mrMoodyAchievement, showMoodyAchievement]);

  // Cheat code listener: type "ezgg" anywhere to open admin panel
  useEffect(() => {
    let buffer = "";
    const handleKey = (e: KeyboardEvent) => {
      buffer += e.key.toLowerCase();
      if (buffer.length > 4) buffer = buffer.slice(-4);
      if (buffer === "ezgg") {
        setAdminPanelOpen(true);
        buffer = "";
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const maxUnlockedNight = Math.min(5, state.bestNight + 1);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div
      className={`w-screen h-screen overflow-hidden bg-black flex flex-col ${shakeActive ? "screen-shake" : ""}`}
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <AnimatePresence mode="wait">
        {/* ============ START SCREEN ============ */}
        {state.screen === "start" && (
          <motion.div
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden transition-all duration-700"
            style={{
              background:
                selectedMode === "nightmare"
                  ? "radial-gradient(ellipse at center top, #1a0505 0%, #0a0101 60%, #050000 100%)"
                  : "radial-gradient(ellipse at center top, #0a1a0d 0%, #020604 60%, #010302 100%)",
            }}
          >
            {/* Scanlines */}
            <div className="crt-overlay" />

            {/* Animated background grid */}
            <div
              className="absolute inset-0 opacity-5 transition-all duration-700"
              style={{
                backgroundImage:
                  selectedMode === "nightmare"
                    ? "linear-gradient(oklch(0.55 0.22 25) 1px, transparent 1px), linear-gradient(90deg, oklch(0.55 0.22 25) 1px, transparent 1px)"
                    : "linear-gradient(oklch(0.65 0.18 140) 1px, transparent 1px), linear-gradient(90deg, oklch(0.65 0.18 140) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center max-w-2xl">
              {/* Logo / Title */}
              <motion.div
                initial={{ y: -40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="space-y-2"
              >
                <h1
                  className="font-display font-black uppercase leading-none title-glitch"
                  style={{
                    fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                    color: "oklch(0.88 0.08 140)",
                    textShadow:
                      "0 0 20px oklch(0.65 0.18 140), 0 0 60px oklch(0.65 0.18 140 / 0.3)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  5 NIGHTS AT
                </h1>
                <h1
                  className="font-display font-black uppercase leading-none"
                  style={{
                    fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
                    color: "oklch(0.65 0.18 140)",
                    textShadow:
                      "0 0 30px oklch(0.65 0.18 140), 0 0 80px oklch(0.65 0.18 140 / 0.4)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  THE SCHOOL
                </h1>
                <p
                  className="font-body text-sm tracking-[0.2em] uppercase"
                  style={{ color: "oklch(0.5 0.06 140)" }}
                >
                  Can you survive the school?
                </p>
              </motion.div>

              {/* High Scores */}
              {state.loadingScore ? (
                <motion.div
                  data-ocid="game.loading_state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-body text-sm tracking-widest uppercase"
                  style={{ color: "oklch(0.4 0.06 140)" }}
                >
                  Loading scores...
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex gap-3 w-full"
                >
                  {/* Normal Score */}
                  <div
                    className="flex-1 border rounded-sm px-4 py-3 space-y-1"
                    style={{
                      borderColor: "oklch(0.25 0.05 140)",
                      background: "oklch(0.08 0.015 145 / 0.8)",
                    }}
                  >
                    <div
                      className="font-display font-bold text-xs uppercase tracking-widest"
                      style={{ color: "oklch(0.5 0.06 140)" }}
                    >
                      🟢 NORMAL BEST
                    </div>
                    <div
                      className="font-body text-sm"
                      style={{ color: "oklch(0.7 0.15 140)" }}
                    >
                      Night:{" "}
                      <span
                        className="font-bold"
                        style={{ color: "oklch(0.65 0.18 140)" }}
                      >
                        {state.bestNight > 0 ? `${state.bestNight}` : "—"}
                      </span>
                    </div>
                    <div
                      className="font-body text-xs"
                      style={{ color: "oklch(0.55 0.1 140)" }}
                    >
                      Time:{" "}
                      <span className="font-bold">
                        {state.bestTime > 0 ? formatTime(state.bestTime) : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Nightmare Score */}
                  <div
                    className="flex-1 border rounded-sm px-4 py-3 space-y-1"
                    style={{
                      borderColor: "oklch(0.3 0.12 25)",
                      background: "oklch(0.07 0.015 25 / 0.8)",
                    }}
                  >
                    <div
                      className="font-display font-bold text-xs uppercase tracking-widest"
                      style={{ color: "oklch(0.55 0.18 25)" }}
                    >
                      💀 NIGHTMARE BEST
                    </div>
                    <div
                      className="font-body text-sm"
                      style={{ color: "oklch(0.7 0.15 25)" }}
                    >
                      Night:{" "}
                      <span
                        className="font-bold"
                        style={{ color: "oklch(0.65 0.2 25)" }}
                      >
                        {state.nightmareBestNight > 0
                          ? `${state.nightmareBestNight}`
                          : "—"}
                      </span>
                    </div>
                    <div
                      className="font-body text-xs"
                      style={{ color: "oklch(0.5 0.12 25)" }}
                    >
                      Time:{" "}
                      <span className="font-bold">
                        {state.nightmareBestTime > 0
                          ? formatTime(state.nightmareBestTime)
                          : "—"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Mode Picker */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="space-y-3 w-full"
              >
                <div
                  className="font-display font-bold text-xs uppercase tracking-widest text-center"
                  style={{
                    color:
                      selectedMode === "nightmare"
                        ? "oklch(0.55 0.2 25)"
                        : "oklch(0.5 0.06 140)",
                  }}
                >
                  Select Difficulty
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* NORMAL */}
                  <button
                    type="button"
                    data-ocid="game.normal_mode_button"
                    onClick={() => setSelectedMode("normal")}
                    className="flex flex-col items-center gap-2 px-4 py-4 rounded-sm border-2 transition-all duration-300 cursor-pointer"
                    style={
                      selectedMode === "normal"
                        ? {
                            borderColor: "oklch(0.65 0.18 140)",
                            background: "oklch(0.1 0.025 140 / 0.9)",
                            boxShadow:
                              "0 0 18px oklch(0.65 0.18 140 / 0.4), inset 0 0 12px oklch(0.65 0.18 140 / 0.05)",
                            color: "oklch(0.88 0.08 140)",
                          }
                        : {
                            borderColor: "oklch(0.22 0.04 140)",
                            background: "oklch(0.06 0.01 140 / 0.6)",
                            color: "oklch(0.45 0.07 140)",
                          }
                    }
                  >
                    <span className="text-2xl">🟢</span>
                    <div
                      className="font-display font-black uppercase tracking-widest text-sm"
                      style={{
                        color:
                          selectedMode === "normal"
                            ? "oklch(0.75 0.18 140)"
                            : "inherit",
                        textShadow:
                          selectedMode === "normal"
                            ? "0 0 10px oklch(0.65 0.18 140 / 0.6)"
                            : "none",
                      }}
                    >
                      NORMAL
                    </div>
                    <div
                      className="font-body text-xs text-center"
                      style={{ opacity: 0.8 }}
                    >
                      Classic difficulty
                    </div>
                    {selectedMode === "normal" && (
                      <div
                        className="text-[10px] font-display font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={{
                          background: "oklch(0.65 0.18 140 / 0.2)",
                          color: "oklch(0.75 0.18 140)",
                          border: "1px solid oklch(0.65 0.18 140 / 0.4)",
                        }}
                      >
                        ✓ SELECTED
                      </div>
                    )}
                  </button>

                  {/* NIGHTMARE */}
                  <button
                    type="button"
                    data-ocid="game.nightmare_mode_button"
                    onClick={() => setSelectedMode("nightmare")}
                    className="flex flex-col items-center gap-2 px-4 py-4 rounded-sm border-2 transition-all duration-300 cursor-pointer"
                    style={
                      selectedMode === "nightmare"
                        ? {
                            borderColor: "oklch(0.55 0.22 25)",
                            background: "oklch(0.08 0.02 25 / 0.9)",
                            boxShadow:
                              "0 0 18px oklch(0.55 0.22 25 / 0.5), inset 0 0 12px oklch(0.55 0.22 25 / 0.08)",
                            color: "oklch(0.75 0.2 25)",
                          }
                        : {
                            borderColor: "oklch(0.22 0.06 25)",
                            background: "oklch(0.06 0.01 25 / 0.6)",
                            color: "oklch(0.45 0.1 25)",
                          }
                    }
                  >
                    <span className="text-2xl">💀</span>
                    <div
                      className="font-display font-black uppercase tracking-widest text-sm"
                      style={{
                        color:
                          selectedMode === "nightmare"
                            ? "oklch(0.7 0.22 25)"
                            : "inherit",
                        textShadow:
                          selectedMode === "nightmare"
                            ? "0 0 10px oklch(0.55 0.22 25 / 0.8)"
                            : "none",
                      }}
                    >
                      NIGHTMARE
                    </div>
                    <div
                      className="font-body text-xs text-center"
                      style={{ opacity: 0.8 }}
                    >
                      Nearly impossible. You will die.
                    </div>
                    {selectedMode === "nightmare" && (
                      <div
                        className="text-[10px] font-display font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={{
                          background: "oklch(0.55 0.22 25 / 0.2)",
                          color: "oklch(0.7 0.22 25)",
                          border: "1px solid oklch(0.55 0.22 25 / 0.5)",
                        }}
                      >
                        ☠ SELECTED
                      </div>
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Night selection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-3 w-full"
              >
                <div
                  className="font-display font-bold text-xs uppercase tracking-widest"
                  style={{
                    color:
                      selectedMode === "nightmare"
                        ? "oklch(0.5 0.12 25)"
                        : "oklch(0.5 0.06 140)",
                  }}
                >
                  Select Night
                </div>
                <div className="flex gap-2 justify-center flex-wrap">
                  {[1, 2, 3, 4, 5].map((night) => {
                    const unlocked = night <= maxUnlockedNight;
                    return (
                      <button
                        key={night}
                        type="button"
                        data-ocid={`game.night_select.button.${night}`}
                        onClick={() =>
                          unlocked && startGame(night, selectedMode)
                        }
                        disabled={!unlocked}
                        className={`
                          w-14 h-14 font-display font-black text-xl
                          border-2 rounded-sm transition-all duration-200
                          ${
                            unlocked
                              ? "cursor-pointer hover:scale-105 active:scale-95"
                              : "cursor-not-allowed opacity-25"
                          }
                        `}
                        style={
                          unlocked
                            ? selectedMode === "nightmare"
                              ? {
                                  borderColor: "oklch(0.55 0.22 25)",
                                  color: "oklch(0.88 0.08 25)",
                                  background: "oklch(0.1 0.02 25)",
                                  boxShadow:
                                    "0 0 12px oklch(0.55 0.22 25 / 0.4)",
                                }
                              : {
                                  borderColor: "oklch(0.65 0.18 140)",
                                  color: "oklch(0.88 0.08 140)",
                                  background: "oklch(0.1 0.02 145)",
                                  boxShadow:
                                    "0 0 12px oklch(0.65 0.18 140 / 0.3)",
                                }
                            : {
                                borderColor: "oklch(0.2 0.02 145)",
                                color: "oklch(0.3 0.02 145)",
                                background: "oklch(0.07 0.01 145)",
                              }
                        }
                      >
                        {unlocked ? night : "🔒"}
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Start Button */}
              <motion.button
                data-ocid="game.start_button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => startGame(1, selectedMode)}
                className="font-display font-black uppercase tracking-widest px-12 py-4 text-lg rounded-sm border-2 transition-all duration-300"
                style={
                  selectedMode === "nightmare"
                    ? {
                        borderColor: "oklch(0.55 0.22 25)",
                        color: "oklch(0.97 0.01 25)",
                        background: "oklch(0.45 0.22 25)",
                        boxShadow:
                          "0 0 25px oklch(0.55 0.22 25 / 0.7), 0 0 60px oklch(0.55 0.22 25 / 0.3)",
                      }
                    : {
                        borderColor: "oklch(0.65 0.18 140)",
                        color: "oklch(0.08 0.015 145)",
                        background: "oklch(0.65 0.18 140)",
                        boxShadow:
                          "0 0 20px oklch(0.65 0.18 140 / 0.5), 0 0 50px oklch(0.65 0.18 140 / 0.2)",
                      }
                }
              >
                {selectedMode === "nightmare"
                  ? "☠ START NIGHTMARE"
                  : "START NIGHT 1"}
              </motion.button>

              {/* How to play */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center space-y-1 text-[11px] font-body tracking-wide"
                style={{ color: "oklch(0.4 0.05 140)" }}
              >
                <p>
                  CLOSE DOORS to block animatronics · WATCH CAMERAS to track
                  them
                </p>
                <p>SURVIVE until 6 AM · MANAGE YOUR POWER or face the dark</p>
              </motion.div>
            </div>

            {/* Footer */}
            <div
              className="absolute bottom-3 text-center text-[10px] font-body tracking-wide space-y-0.5"
              style={{ color: "oklch(0.3 0.04 140)" }}
            >
              <div style={{ color: "oklch(0.28 0.03 140)", fontSize: "9px" }}>
                formerly 5 Nights at Miss Rojas
              </div>
              <div>
                © {new Date().getFullYear()}. Built with love using{" "}
                <a
                  href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "oklch(0.5 0.1 140)" }}
                >
                  caffeine.ai
                </a>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============ GAME SCREEN ============ */}
        {state.screen === "game" && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            <GameScreen
              state={state}
              onLeftDoor={toggleLeftDoor}
              onRightDoor={toggleRightDoor}
              onCamera={toggleCamera}
              onResolvePowerMinigame={resolvePowerMinigame}
            />
          </motion.div>
        )}

        {/* ============ GAME OVER SCREEN ============ */}
        {state.screen === "gameover" && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
            style={{
              background:
                "radial-gradient(ellipse at center, #1a0000 0%, #080000 50%, #010000 100%)",
            }}
          >
            <div className="crt-overlay" />
            <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center max-w-lg">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <h1
                  className="font-display font-black uppercase"
                  style={{
                    fontSize: "clamp(3rem, 8vw, 6rem)",
                    color: "oklch(0.55 0.22 25)",
                    textShadow:
                      "0 0 30px oklch(0.55 0.22 25), 0 0 80px oklch(0.55 0.22 25 / 0.5)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  GAME OVER
                </h1>
                {state.jumpscareAnm && (
                  <p
                    className="font-display font-bold uppercase tracking-[0.2em] text-base mt-2"
                    style={{
                      color: "oklch(0.75 0.18 25)",
                      textShadow: "0 0 15px oklch(0.55 0.22 25 / 0.5)",
                    }}
                  >
                    YOU WERE CAUGHT BY{" "}
                    <span
                      style={{
                        color: "oklch(0.88 0.22 25)",
                        textShadow: "0 0 20px oklch(0.55 0.22 25)",
                      }}
                    >
                      {KILLER_INFO[state.jumpscareAnm].displayName}
                    </span>
                  </p>
                )}
              </motion.div>

              {/* Tip box */}
              {state.jumpscareAnm && (
                <motion.div
                  data-ocid="game.death_tip"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="border rounded-sm px-6 py-4 space-y-2 w-full"
                  style={{
                    borderColor: "oklch(0.45 0.15 25)",
                    background: "oklch(0.08 0.015 25 / 0.85)",
                  }}
                >
                  <div
                    className="font-display font-bold text-xs uppercase tracking-widest"
                    style={{ color: "oklch(0.6 0.15 25)" }}
                  >
                    HOW TO AVOID{" "}
                    {KILLER_INFO[state.jumpscareAnm].displayName.toUpperCase()}
                  </div>
                  <p
                    className="font-body text-sm leading-relaxed"
                    style={{ color: "oklch(0.75 0.1 25)" }}
                  >
                    {KILLER_INFO[state.jumpscareAnm].tip}
                  </p>
                </motion.div>
              )}

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="border rounded-sm px-8 py-4 space-y-2 w-full"
                style={{
                  borderColor: "oklch(0.3 0.1 25)",
                  background: "oklch(0.06 0.01 25 / 0.8)",
                }}
              >
                <div
                  className="font-display font-bold text-xs uppercase tracking-widest"
                  style={{ color: "oklch(0.5 0.1 25)" }}
                >
                  STATISTICS
                </div>
                <div
                  className="space-y-1 font-body text-sm"
                  style={{ color: "oklch(0.7 0.1 25)" }}
                >
                  <p>
                    Night:{" "}
                    <span
                      className="font-bold"
                      style={{ color: "oklch(0.7 0.15 25)" }}
                    >
                      {state.survivedNight}
                    </span>
                  </p>
                  <p>
                    Time Survived:{" "}
                    <span
                      className="font-bold"
                      style={{ color: "oklch(0.7 0.15 25)" }}
                    >
                      {formatTime(Math.floor(state.time))}
                    </span>
                  </p>
                  <p>
                    {state.mode === "nightmare"
                      ? "💀 Nightmare Best"
                      : "🟢 Normal Best"}
                    :{" "}
                    <span
                      className="font-bold"
                      style={{ color: "oklch(0.7 0.15 25)" }}
                    >
                      {state.mode === "nightmare"
                        ? state.nightmareBestNight > 0
                          ? `Night ${state.nightmareBestNight}`
                          : "—"
                        : state.bestNight > 0
                          ? `Night ${state.bestNight}`
                          : "—"}
                    </span>
                  </p>
                </div>
              </motion.div>

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex gap-4"
              >
                <button
                  type="button"
                  data-ocid="game.retry_button"
                  onClick={retryNight}
                  className="font-display font-black uppercase tracking-widest px-8 py-3 border-2 rounded-sm text-sm transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                  style={{
                    borderColor: "oklch(0.55 0.22 25)",
                    color: "oklch(0.06 0.01 25)",
                    background: "oklch(0.55 0.22 25)",
                    boxShadow: "0 0 20px oklch(0.55 0.22 25 / 0.4)",
                  }}
                >
                  RETRY NIGHT
                </button>
                <button
                  type="button"
                  data-ocid="game.menu_button"
                  onClick={goToMenu}
                  className="font-display font-black uppercase tracking-widest px-8 py-3 border-2 rounded-sm text-sm transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                  style={{
                    borderColor: "oklch(0.3 0.05 25)",
                    color: "oklch(0.65 0.12 25)",
                    background: "transparent",
                  }}
                >
                  MAIN MENU
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ============ WIN NIGHT SCREEN ============ */}
        {state.screen === "winnight" && (
          <motion.div
            key="winnight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
            style={{
              background:
                "radial-gradient(ellipse at center, #001a08 0%, #000a04 50%, #010302 100%)",
            }}
          >
            <div className="crt-overlay" />

            {/* Animated particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  // biome-ignore lint/suspicious/noArrayIndexKey: static decorative particles with fixed count
                  key={i}
                  className="absolute w-1 h-1 rounded-full"
                  style={{
                    background: "oklch(0.65 0.18 140)",
                    left: `${Math.random() * 100}%`,
                    top: "100%",
                    boxShadow: "0 0 6px oklch(0.65 0.18 140)",
                  }}
                  animate={{
                    top: "-5%",
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 3,
                    delay: Math.random() * 2,
                    repeat: Number.POSITIVE_INFINITY,
                  }}
                />
              ))}
            </div>

            <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 150, damping: 12 }}
              >
                <div
                  className="font-display font-black uppercase tracking-[0.3em] text-sm"
                  style={{
                    color: "oklch(0.5 0.06 140)",
                    textShadow: "0 0 10px oklch(0.65 0.18 140 / 0.3)",
                  }}
                >
                  YOU SURVIVED
                </div>
                <h1
                  className="font-display font-black uppercase"
                  style={{
                    fontSize: "clamp(3rem, 8vw, 6rem)",
                    color: "oklch(0.65 0.18 140)",
                    textShadow:
                      "0 0 30px oklch(0.65 0.18 140), 0 0 80px oklch(0.65 0.18 140 / 0.4)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  NIGHT {state.survivedNight}
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="font-body text-sm tracking-wide"
                style={{ color: "oklch(0.5 0.08 140)" }}
              >
                {state.survivedNight < 5
                  ? `Night ${state.survivedNight + 1} awaits... if you dare.`
                  : "The final night approaches..."}
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex gap-4"
              >
                <button
                  type="button"
                  data-ocid="game.start_button"
                  onClick={goToNextNight}
                  className="font-display font-black uppercase tracking-widest px-8 py-3 border-2 rounded-sm text-sm transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                  style={{
                    borderColor: "oklch(0.65 0.18 140)",
                    color: "oklch(0.06 0.01 145)",
                    background: "oklch(0.65 0.18 140)",
                    boxShadow: "0 0 20px oklch(0.65 0.18 140 / 0.5)",
                  }}
                >
                  NIGHT {state.survivedNight + 1} →
                </button>
                <button
                  type="button"
                  data-ocid="game.menu_button"
                  onClick={goToMenu}
                  className="font-display font-black uppercase tracking-widest px-8 py-3 border-2 rounded-sm text-sm transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                  style={{
                    borderColor: "oklch(0.3 0.05 140)",
                    color: "oklch(0.5 0.08 140)",
                    background: "transparent",
                  }}
                >
                  MAIN MENU
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ============ WIN GAME SCREEN ============ */}
        {state.screen === "wingame" && (
          <motion.div
            key="wingame"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
            style={{
              background:
                "radial-gradient(ellipse at center, #001a08 0%, #000a04 50%, #010302 100%)",
            }}
          >
            <div className="crt-overlay" />

            {/* Firework particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 40 }).map((_, i) => (
                <motion.div
                  // biome-ignore lint/suspicious/noArrayIndexKey: static decorative particles with fixed count
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    background:
                      i % 3 === 0
                        ? "oklch(0.65 0.18 140)"
                        : i % 3 === 1
                          ? "oklch(0.55 0.22 25)"
                          : "oklch(0.88 0.08 140)",
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    boxShadow: `0 0 8px ${i % 3 === 0 ? "oklch(0.65 0.18 140)" : "oklch(0.55 0.22 25)"}`,
                  }}
                  animate={{
                    scale: [0, 1.5, 0],
                    opacity: [0, 1, 0],
                    x: [(Math.random() - 0.5) * 100],
                    y: [(Math.random() - 0.5) * 100],
                  }}
                  transition={{
                    duration: 1.5 + Math.random() * 2,
                    delay: Math.random() * 3,
                    repeat: Number.POSITIVE_INFINITY,
                  }}
                />
              ))}
            </div>

            <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center max-w-2xl">
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 10 }}
              >
                <div
                  className="font-display font-black uppercase tracking-[0.3em] text-sm mb-2"
                  style={{ color: "oklch(0.5 0.06 140)" }}
                >
                  🏆 CONGRATULATIONS 🏆
                </div>
                <h1
                  className="font-display font-black uppercase leading-none"
                  style={{
                    fontSize: "clamp(2rem, 6vw, 4.5rem)",
                    color: "oklch(0.65 0.18 140)",
                    textShadow:
                      "0 0 30px oklch(0.65 0.18 140), 0 0 80px oklch(0.65 0.18 140 / 0.4)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  YOU SURVIVED ALL
                </h1>
                <h1
                  className="font-display font-black uppercase leading-none"
                  style={{
                    fontSize: "clamp(3rem, 8vw, 6rem)",
                    color: "oklch(0.88 0.08 140)",
                    textShadow:
                      "0 0 40px oklch(0.65 0.18 140), 0 0 100px oklch(0.65 0.18 140 / 0.5)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  5 NIGHTS!
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="font-body text-sm tracking-wide"
                style={{
                  color:
                    state.mode === "nightmare"
                      ? "oklch(0.65 0.15 25)"
                      : "oklch(0.6 0.1 140)",
                }}
              >
                {state.mode === "nightmare" ? (
                  <>
                    You survived the NIGHTMARE.
                    <br />
                    You are absolutely insane.
                  </>
                ) : (
                  <>
                    Miss Rojas has been defeated... for now.
                    <br />
                    The school is safe once again.
                  </>
                )}
              </motion.p>

              <motion.button
                data-ocid="game.menu_button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToMenu}
                className="font-display font-black uppercase tracking-widest px-12 py-4 border-2 rounded-sm text-lg cursor-pointer transition-all duration-200"
                style={{
                  borderColor: "oklch(0.65 0.18 140)",
                  color: "oklch(0.06 0.01 145)",
                  background: "oklch(0.65 0.18 140)",
                  boxShadow:
                    "0 0 30px oklch(0.65 0.18 140 / 0.6), 0 0 80px oklch(0.65 0.18 140 / 0.3)",
                }}
              >
                MAIN MENU
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Red flash overlay for jumpscare */}
      {state.jumpscareVisible && (
        <div
          className="fixed inset-0 z-50 pointer-events-none red-flash"
          style={{ background: "oklch(0.4 0.22 25 / 0.6)" }}
        />
      )}

      {/* Mr. Moody in room — ambient chill indicator */}
      {state.mrMoodyInRoom && state.screen === "game" && (
        <div
          data-ocid="game.moody_in_room_indicator"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded font-display font-bold uppercase text-xs tracking-widest animate-pulse pointer-events-none"
          style={{
            background: "rgba(136, 170, 255, 0.15)",
            border: "1px solid #88aaff",
            color: "#88aaff",
            textShadow: "0 0 10px #88aaff",
            boxShadow: "0 0 20px rgba(136,170,255,0.2)",
          }}
        >
          😌 Mr. Moody is just chilling in your room...
        </div>
      )}

      {/* Mr. Moody Achievement popup */}
      {showMoodyAchievement && (
        <div
          data-ocid="game.moody_achievement"
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[90] pointer-events-none"
          style={{ minWidth: "320px" }}
        >
          <div
            className="flex items-center gap-4 px-6 py-4 rounded"
            style={{
              background: "rgba(8, 14, 30, 0.97)",
              border: "2px solid #88aaff",
              boxShadow:
                "0 0 30px rgba(136,170,255,0.5), 0 0 80px rgba(136,170,255,0.15)",
            }}
          >
            <div
              className="text-4xl flex-shrink-0"
              style={{ filter: "drop-shadow(0 0 10px #88aaff)" }}
            >
              🏆
            </div>
            <div>
              <div
                className="font-display font-black uppercase tracking-widest text-xs mb-1"
                style={{ color: "rgba(136,170,255,0.6)" }}
              >
                Achievement Unlocked
              </div>
              <div
                className="font-display font-black uppercase tracking-wide text-base"
                style={{
                  color: "#88aaff",
                  textShadow: "0 0 12px #88aaff",
                }}
              >
                MR. MOODY
              </div>
              <div
                className="font-body text-xs mt-0.5"
                style={{ color: "rgba(136,170,255,0.7)" }}
              >
                Mr. Moody came in and sat down. He just wanted to hang.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ ADMIN PANEL ============ */}
      {adminPanelOpen && (
        <div
          data-ocid="admin.modal"
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.85)" }}
        >
          <div
            className="relative w-full max-w-lg mx-4 rounded border-2 p-6 space-y-4"
            style={{
              background: "#030d05",
              borderColor: "#00ff44",
              boxShadow:
                "0 0 40px rgba(0,255,68,0.3), inset 0 0 20px rgba(0,255,68,0.05)",
              fontFamily: "monospace",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div
                style={{
                  color: "#00ff44",
                  textShadow: "0 0 10px #00ff44",
                  letterSpacing: "0.2em",
                }}
                className="text-lg font-bold uppercase"
              >
                &gt; ADMIN PANEL [CHEAT MODE]
              </div>
              <button
                type="button"
                data-ocid="admin.close_button"
                onClick={() => setAdminPanelOpen(false)}
                style={{
                  color: "#00ff44",
                  fontSize: "1.5rem",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Status */}
            <div
              className="text-xs space-y-1"
              style={{ color: "#44ff88", opacity: 0.7 }}
            >
              <div>
                MODE: {state.mode.toUpperCase()} | NIGHT: {state.night} | POWER:{" "}
                {Math.ceil(state.power)}%
              </div>
              <div>
                GOD MODE: {state.godMode ? "ON ✓" : "OFF"} | FROZEN:{" "}
                {state.animatronisFrozen ? "ON ✓" : "OFF"}
              </div>
            </div>

            {/* Buttons grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: "AUTO WIN NIGHT",
                  ocid: "admin.auto_win_button",
                  action: () => {
                    adminAutoWin();
                    setAdminPanelOpen(false);
                  },
                },
                {
                  label: "WIN ALL 5 NIGHTS",
                  ocid: "admin.win_all_button",
                  action: () => {
                    adminWinAll();
                    setAdminPanelOpen(false);
                  },
                },
                {
                  label: "KILL ANIMATRONICS",
                  ocid: "admin.kill_all_button",
                  action: adminKillAll,
                },
                {
                  label: "MAX POWER (100%)",
                  ocid: "admin.max_power_button",
                  action: adminMaxPower,
                },
                {
                  label: state.animatronisFrozen
                    ? "UNFREEZE ANIMATRONICS"
                    : "FREEZE ANIMATRONICS",
                  ocid: "admin.freeze_button",
                  action: adminToggleFreeze,
                },
                {
                  label: "UNLOCK ALL NIGHTS",
                  ocid: "admin.unlock_nights_button",
                  action: adminUnlockNights,
                },
                {
                  label: state.godMode ? "GOD MODE: ON" : "GOD MODE: OFF",
                  ocid: "admin.god_mode_button",
                  action: adminToggleGodMode,
                },
              ].map((btn) => (
                <button
                  key={btn.ocid}
                  type="button"
                  data-ocid={btn.ocid}
                  onClick={btn.action}
                  className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-left transition-all duration-100 hover:scale-[1.02] active:scale-95 cursor-pointer"
                  style={{
                    background: "rgba(0,255,68,0.07)",
                    border: "1px solid rgba(0,255,68,0.4)",
                    color: "#00ff44",
                    textShadow: "0 0 6px rgba(0,255,68,0.4)",
                  }}
                >
                  &gt; {btn.label}
                </button>
              ))}
            </div>

            {/* Skip to Night */}
            <div>
              <div
                className="text-xs uppercase tracking-widest mb-2"
                style={{ color: "#44ff88", opacity: 0.7 }}
              >
                &gt; SKIP TO NIGHT:
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    data-ocid={`admin.skip_night.button.${n}`}
                    onClick={() => {
                      adminSkipToNight(n);
                      setAdminPanelOpen(false);
                    }}
                    className="flex-1 py-2 text-sm font-bold uppercase tracking-widest cursor-pointer transition-all duration-100 hover:scale-105 active:scale-95"
                    style={{
                      background: "rgba(0,255,68,0.1)",
                      border: "1px solid rgba(0,255,68,0.5)",
                      color: "#00ff44",
                    }}
                  >
                    N{n}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div
              className="text-[10px] text-center"
              style={{ color: "rgba(0,255,68,0.3)" }}
            >
              CHEAT CODE ACTIVATED — EZGG — AUTHORIZED ACCESS
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
