import { useCallback, useEffect, useRef, useState } from "react";
import { useActor } from "./useActor";

export type GameScreen = "start" | "game" | "gameover" | "winnight" | "wingame";

export type AnimatronicId = "missRojas" | "mrBooks" | "carl" | "lunchLady";

export interface AnimatronicState {
  id: AnimatronicId;
  name: string;
  currentRoom: string;
  path: string[];
  side: "left" | "right";
  moveTimer: number;
  retreatTimer: number;
  atDoor: boolean;
}

export interface GameState {
  screen: GameScreen;
  night: number;
  power: number;
  leftDoorClosed: boolean;
  rightDoorClosed: boolean;
  cameraOpen: boolean;
  time: number; // seconds elapsed (0-90)
  animatronics: AnimatronicState[];
  jumpscareVisible: boolean;
  jumpscareAnm: AnimatronicId | null;
  survivedNight: number;
  bestNight: number;
  bestTime: number;
  loadingScore: boolean;
}

const NIGHT_DURATION = 90; // seconds
const BASE_DRAIN = 1.5; // %/sec
const DOOR_DRAIN = 1.0; // % per closed door /sec
const CAMERA_DRAIN = 0.5; // %/sec when camera open

const TICK_INTERVAL = 5000; // ms between AI ticks

const ANIMATRONIC_PATHS: Record<
  AnimatronicId,
  { path: string[]; side: "left" | "right"; name: string }
> = {
  missRojas: {
    name: "Miss Rojas",
    path: ["Cam1", "Cam2", "Cam4", "LEFT_DOOR"],
    side: "left",
  },
  mrBooks: {
    name: "Mr. Books",
    path: ["Cam3", "Cam5", "RIGHT_DOOR"],
    side: "right",
  },
  carl: {
    name: "Carl the Janitor",
    path: ["Cam2", "Cam4", "LEFT_DOOR"],
    side: "left",
  },
  lunchLady: {
    name: "Lunch Lady",
    path: ["Cam6", "Cam5", "RIGHT_DOOR"],
    side: "right",
  },
};

function createInitialAnimatronics(): AnimatronicState[] {
  return (Object.keys(ANIMATRONIC_PATHS) as AnimatronicId[]).map((id) => {
    const def = ANIMATRONIC_PATHS[id];
    return {
      id,
      name: def.name,
      currentRoom: def.path[0],
      path: def.path,
      side: def.side,
      moveTimer: 0,
      retreatTimer: 0,
      atDoor: false,
    };
  });
}

function getMoveChance(night: number): number {
  // Night 1: 10%, Night 5: 40%
  return 0.1 + (night - 1) * 0.075;
}

export function useGameEngine() {
  const { actor, isFetching } = useActor();

  const [state, setState] = useState<GameState>({
    screen: "start",
    night: 1,
    power: 100,
    leftDoorClosed: false,
    rightDoorClosed: false,
    cameraOpen: false,
    time: 0,
    animatronics: createInitialAnimatronics(),
    jumpscareVisible: false,
    jumpscareAnm: null,
    survivedNight: 0,
    bestNight: 0,
    bestTime: 0,
    loadingScore: true,
  });

  // Refs for game loop
  const stateRef = useRef(state);
  const animFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const lastAiTickRef = useRef<number>(0);
  const gameActiveRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const jumpscareTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Keep ref in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Load high score when actor is ready
  useEffect(() => {
    if (!actor || isFetching) return;

    actor
      .getHighScore()
      .then((hs) => {
        setState((s) => ({
          ...s,
          bestNight: Number(hs.bestNight),
          bestTime: Number(hs.bestTime),
          loadingScore: false,
        }));
      })
      .catch(() => {
        setState((s) => ({ ...s, loadingScore: false }));
      });
  }, [actor, isFetching]);

  // Stop loading if actor not available after a timeout
  useEffect(() => {
    const t = setTimeout(() => {
      setState((s) => (s.loadingScore ? { ...s, loadingScore: false } : s));
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  const triggerJumpscare = useCallback(
    (anmId: AnimatronicId, night: number, elapsed: number) => {
      gameActiveRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      setState((s) => ({
        ...s,
        jumpscareVisible: true,
        jumpscareAnm: anmId,
      }));

      playJumpscareSound();

      // Save score
      if (actor) {
        actor.saveHighScore(BigInt(night), BigInt(elapsed)).catch(() => {});
      }

      jumpscareTimeoutRef.current = setTimeout(() => {
        setState((s) => ({
          ...s,
          jumpscareVisible: false,
          screen: "gameover",
          survivedNight: night,
          bestNight: Math.max(s.bestNight, night),
          bestTime:
            night > s.bestNight
              ? elapsed
              : s.bestNight === night
                ? Math.max(s.bestTime, elapsed)
                : s.bestTime,
        }));
      }, 1500);
    },
    [actor],
  );

  const runGameLoop = useCallback(
    (timestamp: number) => {
      if (!gameActiveRef.current) return;

      const s = stateRef.current;
      const elapsed = (timestamp - startTimeRef.current) / 1000;
      const dtSec = (timestamp - lastTickRef.current) / 1000;
      lastTickRef.current = timestamp;

      // Power drain
      let drainRate = BASE_DRAIN;
      if (s.leftDoorClosed) drainRate += DOOR_DRAIN;
      if (s.rightDoorClosed) drainRate += DOOR_DRAIN;
      if (s.cameraOpen) drainRate += CAMERA_DRAIN;

      const newPower = Math.max(0, s.power - drainRate * dtSec);
      const newTime = Math.min(NIGHT_DURATION, elapsed);

      // Time won!
      if (newTime >= NIGHT_DURATION) {
        gameActiveRef.current = false;
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        if (actor) {
          actor
            .saveHighScore(BigInt(s.night + 1), BigInt(NIGHT_DURATION))
            .catch(() => {});
        }
        setState((prev) => ({
          ...prev,
          time: NIGHT_DURATION,
          power: newPower,
          screen: s.night >= 5 ? "wingame" : "winnight",
          survivedNight: s.night,
          bestNight: Math.max(prev.bestNight, s.night + 1),
        }));
        return;
      }

      // Power out!
      if (newPower <= 0) {
        triggerJumpscare("missRojas", s.night, Math.floor(elapsed));
        setState((prev) => ({ ...prev, power: 0, time: newTime }));
        return;
      }

      // AI ticks
      const aiDt = timestamp - lastAiTickRef.current;
      let newAnimatronics = [...s.animatronics];
      let gameOver = false;
      let killerAnm: AnimatronicId | null = null;

      if (aiDt >= TICK_INTERVAL) {
        lastAiTickRef.current = timestamp;
        const moveChance = getMoveChance(s.night);

        newAnimatronics = s.animatronics.map((anm) => {
          const updated = { ...anm };

          if (updated.atDoor) {
            const doorClosed =
              updated.side === "left" ? s.leftDoorClosed : s.rightDoorClosed;

            if (!doorClosed) {
              gameOver = true;
              killerAnm = updated.id;
              return updated;
            }

            updated.retreatTimer += 1;
            if (updated.retreatTimer >= 2 && Math.random() < 0.3) {
              updated.currentRoom = updated.path[0];
              updated.atDoor = false;
              updated.retreatTimer = 0;
            }
            return updated;
          }

          if (Math.random() < moveChance) {
            const currentIndex = updated.path.indexOf(updated.currentRoom);
            if (currentIndex < updated.path.length - 1) {
              const nextRoom = updated.path[currentIndex + 1];
              updated.currentRoom = nextRoom;

              if (nextRoom === "LEFT_DOOR" || nextRoom === "RIGHT_DOOR") {
                updated.atDoor = true;
                const doorClosed =
                  updated.side === "left"
                    ? s.leftDoorClosed
                    : s.rightDoorClosed;
                if (!doorClosed) {
                  gameOver = true;
                  killerAnm = updated.id;
                }
              }
            }
          }

          return updated;
        });
      }

      if (gameOver && killerAnm) {
        setState((prev) => ({
          ...prev,
          animatronics: newAnimatronics,
          power: newPower,
          time: newTime,
        }));
        triggerJumpscare(killerAnm, s.night, Math.floor(elapsed));
        return;
      }

      setState((prev) => ({
        ...prev,
        power: newPower,
        time: newTime,
        animatronics: newAnimatronics,
      }));

      animFrameRef.current = requestAnimationFrame(runGameLoop);
    },
    [actor, triggerJumpscare],
  );

  const startGame = useCallback(
    (night: number) => {
      if (jumpscareTimeoutRef.current) {
        clearTimeout(jumpscareTimeoutRef.current);
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      const initialAnimatronics = createInitialAnimatronics();
      gameActiveRef.current = true;
      lastAiTickRef.current = performance.now();

      setState((prev) => ({
        ...prev,
        screen: "game",
        night,
        power: 100,
        leftDoorClosed: false,
        rightDoorClosed: false,
        cameraOpen: false,
        time: 0,
        animatronics: initialAnimatronics,
        jumpscareVisible: false,
        jumpscareAnm: null,
        survivedNight: 0,
      }));

      requestAnimationFrame((ts) => {
        startTimeRef.current = ts;
        lastTickRef.current = ts;
        lastAiTickRef.current = ts;
        animFrameRef.current = requestAnimationFrame(runGameLoop);
      });
    },
    [runGameLoop],
  );

  const toggleLeftDoor = useCallback(() => {
    setState((s) => ({ ...s, leftDoorClosed: !s.leftDoorClosed }));
  }, []);

  const toggleRightDoor = useCallback(() => {
    setState((s) => ({ ...s, rightDoorClosed: !s.rightDoorClosed }));
  }, []);

  const toggleCamera = useCallback(() => {
    setState((s) => ({ ...s, cameraOpen: !s.cameraOpen }));
  }, []);

  const goToMenu = useCallback(() => {
    gameActiveRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setState((s) => ({ ...s, screen: "start", cameraOpen: false }));
  }, []);

  const retryNight = useCallback(() => {
    startGame(stateRef.current.survivedNight || 1);
  }, [startGame]);

  const goToNextNight = useCallback(() => {
    startGame(stateRef.current.survivedNight + 1);
  }, [startGame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      gameActiveRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (jumpscareTimeoutRef.current)
        clearTimeout(jumpscareTimeoutRef.current);
    };
  }, []);

  return {
    state,
    startGame,
    toggleLeftDoor,
    toggleRightDoor,
    toggleCamera,
    goToMenu,
    retryNight,
    goToNextNight,
  };
}

function playJumpscareSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (
        window as unknown as {
          webkitAudioContext: typeof AudioContext;
        }
      ).webkitAudioContext;
    const ctx = new AudioCtx();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(80, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.5);

    osc2.type = "square";
    osc2.frequency.setValueAtTime(160, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 1.2);
    osc2.stop(ctx.currentTime + 1.2);

    const osc3 = ctx.createOscillator();
    const gainNode2 = ctx.createGain();
    osc3.type = "sawtooth";
    osc3.frequency.setValueAtTime(800, ctx.currentTime);
    osc3.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.8);
    gainNode2.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc3.connect(gainNode2);
    gainNode2.connect(ctx.destination);
    osc3.start();
    osc3.stop(ctx.currentTime + 0.8);
  } catch {
    // Audio not available
  }
}
