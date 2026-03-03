import { useCallback, useEffect, useRef, useState } from "react";
import { useActor } from "./useActor";

export type GameScreen = "start" | "game" | "gameover" | "winnight" | "wingame";

export type AnimatronicId =
  | "missRojas"
  | "mrsPineda"
  | "coachStutz"
  | "mrMoody"
  | "coachWolferd";

export interface AnimatronicState {
  id: AnimatronicId;
  name: string;
  currentRoom: string; // where they ARE (fully arrived)
  previousRoom: string; // where they came from (for walk animation)
  walkProgress: number; // 0 = just left previousRoom, 1 = fully arrived
  isWalking: boolean; // true while walking animation is in progress
  path: string[];
  side: "left" | "right";
  moveTimer: number;
  retreatTimer: number;
  atDoor: boolean;
  friendly: boolean; // Mr. Moody doesn't kill the player
  active: boolean; // whether this animatronic has spawned yet
  rareSpawn: boolean; // Coach Wolferd: spawns rarely and retreats quickly
  rareTimer: number; // timer for rare animatronics to auto-retreat
}

export interface GameState {
  screen: GameScreen;
  night: number;
  power: number;
  leftDoorClosed: boolean;
  rightDoorClosed: boolean;
  cameraOpen: boolean;
  time: number; // seconds elapsed (0-150)
  animatronics: AnimatronicState[];
  jumpscareVisible: boolean;
  jumpscareAnm: AnimatronicId | null;
  survivedNight: number;
  bestNight: number;
  bestTime: number;
  loadingScore: boolean;
  powerMinigameActive: boolean; // true when power hits 0 and minigame is running
  wolferdJustSpawned: boolean; // true for ~2.5 seconds after Wolferd spawns
}

const NIGHT_DURATION = 150; // seconds (slower)
const BASE_DRAIN = 0.6; // %/sec (slower)
const DOOR_DRAIN = 0.4; // % per closed door /sec (slower)
const CAMERA_DRAIN = 0.3; // %/sec when camera open (slower)

const TICK_INTERVAL = 5000; // ms between AI ticks

// Coach Wolferd: rare spawn chance per tick (3%), active for only ~10-15 ticks before retreating
const WOLFERD_SPAWN_CHANCE = 0.03;
const WOLFERD_MAX_TICKS = 3; // auto-retreats after this many ticks at door

// Coach Stutz walks at 1.5x the normal speed (walkProgress advances faster)
const STUTZ_WALK_SPEED = 1.5;

const ANIMATRONIC_PATHS: Record<
  AnimatronicId,
  {
    path: string[];
    side: "left" | "right";
    name: string;
    friendly?: boolean;
    rareSpawn?: boolean;
  }
> = {
  missRojas: {
    name: "Miss Rojas",
    path: ["Cam1", "Cam2", "Cam4", "LEFT_CAM", "LEFT_DOOR"],
    side: "left",
  },
  mrsPineda: {
    name: "Mrs. Pineda",
    path: ["Cam3", "Cam5", "RIGHT_CAM", "RIGHT_DOOR"],
    side: "right",
  },
  coachStutz: {
    name: "Coach Stutz",
    path: ["Cam2", "Cam4", "LEFT_CAM", "LEFT_DOOR"],
    side: "left",
  },
  mrMoody: {
    name: "Mr. Moody",
    path: ["Cam6", "Cam5", "RIGHT_CAM", "RIGHT_DOOR"],
    side: "right",
    friendly: true,
  },
  coachWolferd: {
    name: "Coach Wolferd",
    path: ["Cam3", "Cam2", "RIGHT_CAM", "RIGHT_DOOR"],
    side: "right",
    rareSpawn: true,
  },
};

function createInitialAnimatronics(): AnimatronicState[] {
  return (Object.keys(ANIMATRONIC_PATHS) as AnimatronicId[]).map((id) => {
    const def = ANIMATRONIC_PATHS[id];
    const isRare = def.rareSpawn ?? false;
    return {
      id,
      name: def.name,
      currentRoom: def.path[0],
      previousRoom: def.path[0],
      walkProgress: 1,
      isWalking: false,
      path: def.path,
      side: def.side,
      moveTimer: 0,
      retreatTimer: 0,
      atDoor: false,
      friendly: def.friendly ?? false,
      active: !isRare, // rare spawns start inactive
      rareSpawn: isRare,
      rareTimer: 0,
    };
  });
}

function getMoveChance(night: number): number {
  // Night 1: 15%, Night 5: 55%
  return 0.15 + (night - 1) * 0.1;
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
    powerMinigameActive: false,
    wolferdJustSpawned: false,
  });

  // Refs for game loop
  const stateRef = useRef(state);
  const animFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const lastAiTickRef = useRef<number>(0);
  const gameActiveRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const elapsedOffsetRef = useRef<number>(0); // tracks elapsed time for resume
  const jumpscareTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const wolferdSpawnTimerRef = useRef<number>(0); // timestamp of last Wolferd spawn

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
      const elapsed =
        elapsedOffsetRef.current + (timestamp - startTimeRef.current) / 1000;
      const dtSec = (timestamp - lastTickRef.current) / 1000;
      lastTickRef.current = timestamp;

      // Update wolferdJustSpawned based on timer
      const wolferdSpawnedRecently =
        wolferdSpawnTimerRef.current > 0 &&
        Date.now() - wolferdSpawnTimerRef.current < 2500;

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

      // Power out! Start minigame instead of instant death
      if (newPower <= 0 && !s.powerMinigameActive) {
        gameActiveRef.current = false;
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        // Store elapsed time so we can resume from here
        elapsedOffsetRef.current = elapsed;
        setState((prev) => ({
          ...prev,
          power: 0,
          time: newTime,
          powerMinigameActive: true,
        }));
        return;
      }

      // Update walking progress for all animatronics
      let newAnimatronics = s.animatronics.map((anm) => {
        if (!anm.isWalking) return anm;
        // Coach Stutz walks faster
        const speed = anm.id === "coachStutz" ? STUTZ_WALK_SPEED : 1.0;
        const newProgress = Math.min(
          1,
          anm.walkProgress + (dtSec / 2.5) * speed,
        );
        const doneWalking = newProgress >= 1;
        return {
          ...anm,
          walkProgress: newProgress,
          isWalking: !doneWalking,
        };
      });

      // AI ticks
      const aiDt = timestamp - lastAiTickRef.current;
      let gameOver = false;
      let killerAnm: AnimatronicId | null = null;
      let wolferdJustSpawnedThisTick = false;

      if (aiDt >= TICK_INTERVAL) {
        lastAiTickRef.current = timestamp;
        const moveChance = getMoveChance(s.night);

        newAnimatronics = newAnimatronics.map((anm) => {
          const updated = { ...anm };

          // Try to spawn Coach Wolferd if inactive
          if (updated.rareSpawn && !updated.active) {
            if (Math.random() < WOLFERD_SPAWN_CHANCE) {
              updated.active = true;
              updated.currentRoom = updated.path[0];
              updated.previousRoom = updated.path[0];
              updated.rareTimer = 0;
              // Mark Wolferd as just spawned
              wolferdSpawnTimerRef.current = Date.now();
              wolferdJustSpawnedThisTick = true;
            }
            return updated;
          }

          // Skip inactive animatronics
          if (!updated.active) return updated;

          // Skip animatronics still walking
          if (updated.isWalking) return updated;

          if (updated.atDoor) {
            const doorClosed =
              updated.side === "left" ? s.leftDoorClosed : s.rightDoorClosed;

            // Rare animatronics (Wolferd) auto-retreat quickly
            if (updated.rareSpawn) {
              updated.rareTimer += 1;
              if (updated.rareTimer >= WOLFERD_MAX_TICKS || doorClosed) {
                // Retreat and go inactive
                updated.currentRoom = updated.path[0];
                updated.previousRoom = updated.path[updated.path.length - 1];
                updated.walkProgress = 0;
                updated.isWalking = true;
                updated.atDoor = false;
                updated.rareTimer = 0;
                updated.active = false;
                return updated;
              }
              // Wolferd at door with it open -- death handled on arrival in collision check
              return updated;
            }

            if (!doorClosed) {
              // Friendly animatronics retreat instead of killing
              if (updated.friendly) {
                updated.currentRoom = updated.path[0];
                updated.previousRoom = updated.path[updated.path.length - 1];
                updated.walkProgress = 0;
                updated.isWalking = true;
                updated.atDoor = false;
                updated.retreatTimer = 0;
                return updated;
              }
              // Door is open but we only kill on arrival (handled in collision check below)
              return updated;
            }

            updated.retreatTimer += 1;
            if (updated.retreatTimer >= 2 && Math.random() < 0.3) {
              updated.previousRoom = updated.currentRoom;
              updated.currentRoom = updated.path[0];
              updated.walkProgress = 0;
              updated.isWalking = true;
              updated.atDoor = false;
              updated.retreatTimer = 0;
            }
            return updated;
          }

          // Mr. Moody has a lower move chance (quarter) -- very chill
          // Coach Stutz has higher move chance (1.5x) -- fast
          let effectiveMoveChance = moveChance;
          if (updated.friendly) {
            effectiveMoveChance = moveChance * 0.25;
          } else if (updated.id === "coachStutz") {
            effectiveMoveChance = moveChance * 1.5;
          } else if (updated.rareSpawn) {
            // Wolferd moves fast when active
            effectiveMoveChance = moveChance * 2.0;
          }

          if (Math.random() < effectiveMoveChance) {
            const currentIndex = updated.path.indexOf(updated.currentRoom);
            if (currentIndex < updated.path.length - 1) {
              const nextRoom = updated.path[currentIndex + 1];
              updated.previousRoom = updated.currentRoom;
              updated.currentRoom = nextRoom;
              updated.walkProgress = 0;
              updated.isWalking = true;

              if (nextRoom === "LEFT_DOOR" || nextRoom === "RIGHT_DOOR") {
                updated.atDoor = true;
              }
            }
          }

          return updated;
        });

        // Check door collisions: only trigger death when an animatronic
        // JUST arrived at the door this tick (walkProgress went from <1 to 1)
        for (let i = 0; i < newAnimatronics.length; i++) {
          const anm = newAnimatronics[i];
          const prev = s.animatronics[i];
          if (!anm.active) continue;
          if (anm.friendly) continue;
          // Only trigger when they just finished walking INTO a door room
          const justArrived = prev.isWalking && !anm.isWalking && anm.atDoor;
          if (!justArrived) continue;
          const doorClosed =
            anm.side === "left" ? s.leftDoorClosed : s.rightDoorClosed;
          if (!doorClosed) {
            gameOver = true;
            killerAnm = anm.id;
          }
        }
      }

      if (gameOver && killerAnm) {
        setState((prev) => ({
          ...prev,
          animatronics: newAnimatronics,
          power: newPower,
          time: newTime,
          wolferdJustSpawned:
            wolferdSpawnedRecently || wolferdJustSpawnedThisTick,
        }));
        triggerJumpscare(killerAnm, s.night, Math.floor(elapsed));
        return;
      }

      setState((prev) => ({
        ...prev,
        power: newPower,
        time: newTime,
        animatronics: newAnimatronics,
        wolferdJustSpawned:
          wolferdSpawnedRecently || wolferdJustSpawnedThisTick,
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
      elapsedOffsetRef.current = 0;
      wolferdSpawnTimerRef.current = 0;

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
        powerMinigameActive: false,
        wolferdJustSpawned: false,
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

  const resolvePowerMinigame = useCallback(
    (success: boolean) => {
      const s = stateRef.current;
      if (success) {
        // Restore power to 40% and resume the game
        setState((prev) => ({
          ...prev,
          power: 40,
          powerMinigameActive: false,
        }));

        // Resume game loop: reset start time ref so elapsed continues from offset
        gameActiveRef.current = true;
        requestAnimationFrame((ts) => {
          startTimeRef.current = ts;
          lastTickRef.current = ts;
          animFrameRef.current = requestAnimationFrame(runGameLoop);
        });
      } else {
        // Minigame failed - trigger jumpscare
        setState((prev) => ({
          ...prev,
          powerMinigameActive: false,
        }));
        triggerJumpscare("missRojas", s.night, Math.floor(s.time));
      }
    },
    [runGameLoop, triggerJumpscare],
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
    resolvePowerMinigame,
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
