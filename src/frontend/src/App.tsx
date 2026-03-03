import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import GameScreen from "./GameScreen";
import { type AnimatronicId, useGameEngine } from "./hooks/useGameEngine";

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
  } = useGameEngine();

  const [shakeActive, setShakeActive] = useState(false);

  // Trigger shake on jumpscare
  useEffect(() => {
    if (state.jumpscareVisible) {
      setShakeActive(true);
      const t = setTimeout(() => setShakeActive(false), 600);
      return () => clearTimeout(t);
    }
  }, [state.jumpscareVisible]);

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
            className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
            style={{
              background:
                "radial-gradient(ellipse at center top, #0a1a0d 0%, #020604 60%, #010302 100%)",
            }}
          >
            {/* Scanlines */}
            <div className="crt-overlay" />

            {/* Animated background grid */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage:
                  "linear-gradient(oklch(0.65 0.18 140) 1px, transparent 1px), linear-gradient(90deg, oklch(0.65 0.18 140) 1px, transparent 1px)",
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

              {/* High Score */}
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
                  className="border rounded-sm px-6 py-3 space-y-1"
                  style={{
                    borderColor: "oklch(0.25 0.05 140)",
                    background: "oklch(0.08 0.015 145 / 0.8)",
                  }}
                >
                  <div
                    className="font-display font-bold text-xs uppercase tracking-widest"
                    style={{ color: "oklch(0.5 0.06 140)" }}
                  >
                    HIGH SCORE
                  </div>
                  <div
                    className="font-body text-sm"
                    style={{ color: "oklch(0.7 0.15 140)" }}
                  >
                    Best Night:{" "}
                    <span
                      className="font-bold"
                      style={{ color: "oklch(0.65 0.18 140)" }}
                    >
                      {state.bestNight > 0 ? `Night ${state.bestNight}` : "—"}
                    </span>
                    {" · "}
                    Best Time:{" "}
                    <span
                      className="font-bold"
                      style={{ color: "oklch(0.65 0.18 140)" }}
                    >
                      {state.bestTime > 0 ? formatTime(state.bestTime) : "—"}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Night selection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-3 w-full"
              >
                <div
                  className="font-display font-bold text-xs uppercase tracking-widest"
                  style={{ color: "oklch(0.5 0.06 140)" }}
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
                        onClick={() => unlocked && startGame(night)}
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
                            ? {
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
                onClick={() => startGame(1)}
                className="font-display font-black uppercase tracking-widest px-12 py-4 text-lg rounded-sm border-2 transition-all duration-200"
                style={{
                  borderColor: "oklch(0.65 0.18 140)",
                  color: "oklch(0.08 0.015 145)",
                  background: "oklch(0.65 0.18 140)",
                  boxShadow:
                    "0 0 20px oklch(0.65 0.18 140 / 0.5), 0 0 50px oklch(0.65 0.18 140 / 0.2)",
                }}
              >
                START NIGHT 1
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
                    Best Night:{" "}
                    <span
                      className="font-bold"
                      style={{ color: "oklch(0.7 0.15 25)" }}
                    >
                      {state.bestNight > 0 ? `Night ${state.bestNight}` : "—"}
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
                style={{ color: "oklch(0.6 0.1 140)" }}
              >
                Miss Rojas has been defeated... for now.
                <br />
                The school is safe once again.
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
    </div>
  );
}
