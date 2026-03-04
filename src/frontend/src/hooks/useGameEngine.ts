import { useCallback, useEffect, useRef, useState } from "react";
import { useActor } from "./useActor";

export type GameScreen = "start" | "game" | "gameover" | "winnight" | "wingame";
export type GameMode = "normal" | "nightmare";

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
  doorKillTimer: number; // seconds elapsed standing at open door (counts up to kill threshold)
}

export interface GameState {
  screen: GameScreen;
  night: number;
  mode: GameMode;
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
  nightmareBestNight: number;
  nightmareBestTime: number;
  loadingScore: boolean;
  powerMinigameActive: boolean; // true when power hits 0 and minigame is running
  wolferdJustSpawned: boolean; // true for ~2.5 seconds after Wolferd spawns
  godMode: boolean; // admin: animatronics can't kill
  animatronisFrozen: boolean; // admin: animatronics don't move
  mrMoodyInRoom: boolean; // true while Mr. Moody is sitting in the player's room
  mrMoodyAchievement: boolean; // true once the achievement has been earned this session
}

const NIGHT_DURATION = 150; // seconds (slower)

// Normal mode constants (now the hard/original settings)
const NORMAL_BASE_DRAIN = 3.5;
const NORMAL_DOOR_DRAIN = 2.0;
const NORMAL_CAMERA_DRAIN = 1.5;
const NORMAL_TICK_INTERVAL = 900;
const NORMAL_WOLFERD_SPAWN_CHANCE = 0.0005;
const NORMAL_WOLFERD_MAX_TICKS = 18;
const NORMAL_STUTZ_WALK_SPEED = 5.0;
const NORMAL_WALK_PROGRESS_DIVISOR = 0.5;
const NORMAL_WOLFERD_MOVE_MULTIPLIER = 99.0;

// Nightmare mode constants (now the easier/lenient settings)
const NIGHTMARE_BASE_DRAIN = 2.2;
const NIGHTMARE_DOOR_DRAIN = 1.0;
const NIGHTMARE_CAMERA_DRAIN = 0.7;
const NIGHTMARE_TICK_INTERVAL = 2500;
const NIGHTMARE_WOLFERD_SPAWN_CHANCE = 0.0005;
const NIGHTMARE_WOLFERD_MAX_TICKS = 3;
const NIGHTMARE_STUTZ_WALK_SPEED = 1.5;
const NIGHTMARE_WALK_PROGRESS_DIVISOR = 2.5;
const NIGHTMARE_WOLFERD_MOVE_MULTIPLIER = 2.0;
const NIGHTMARE_WOLFERD_WALK_DIVISOR = 0.3; // Wolferd walks fast but camera gives a tiny warning

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
      doorKillTimer: 0,
    };
  });
}

function getMoveChance(night: number, mode: GameMode): number {
  if (mode === "normal") {
    // Normal (hard) — Night 1: 75%, Night 5: 99% — almost always moves every tick
    return Math.min(0.99, 0.75 + (night - 1) * 0.06);
  }
  // Nightmare (easier) — Night 1: 35%, Night 5: 75%
  return 0.35 + (night - 1) * 0.1;
}

export function useGameEngine() {
  const { actor, isFetching } = useActor();

  const [state, setState] = useState<GameState>({
    screen: "start",
    night: 1,
    mode: "normal",
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
    nightmareBestNight: 0,
    nightmareBestTime: 0,
    loadingScore: true,
    powerMinigameActive: false,
    wolferdJustSpawned: false,
    godMode: false,
    animatronisFrozen: false,
    mrMoodyInRoom: false,
    mrMoodyAchievement: false,
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

  // Load high scores when actor is ready
  useEffect(() => {
    if (!actor || isFetching) return;

    Promise.all([actor.getHighScore(), actor.getNightmareScore()])
      .then(([hs, nhs]) => {
        setState((s) => ({
          ...s,
          bestNight: Number(hs.bestNight),
          bestTime: Number(hs.bestTime),
          nightmareBestNight: Number(nhs.bestNight),
          nightmareBestTime: Number(nhs.bestTime),
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

      // Save score (mode-aware)
      if (actor) {
        const isNm = stateRef.current.mode === "nightmare";
        if (isNm) {
          actor
            .saveNightmareScore(BigInt(night), BigInt(elapsed))
            .catch(() => {});
        } else {
          actor.saveHighScore(BigInt(night), BigInt(elapsed)).catch(() => {});
        }
      }

      jumpscareTimeoutRef.current = setTimeout(() => {
        setState((s) => {
          const isNm = s.mode === "nightmare";
          if (isNm) {
            return {
              ...s,
              jumpscareVisible: false,
              screen: "gameover",
              survivedNight: night,
              nightmareBestNight: Math.max(s.nightmareBestNight, night),
              nightmareBestTime:
                night > s.nightmareBestNight
                  ? elapsed
                  : s.nightmareBestNight === night
                    ? Math.max(s.nightmareBestTime, elapsed)
                    : s.nightmareBestTime,
            };
          }
          return {
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
          };
        });
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

      // Mode-aware constants
      const isNightmare = s.mode === "nightmare";
      const baseDrain = isNightmare ? NIGHTMARE_BASE_DRAIN : NORMAL_BASE_DRAIN;
      const doorDrain = isNightmare ? NIGHTMARE_DOOR_DRAIN : NORMAL_DOOR_DRAIN;
      const cameraDrain = isNightmare
        ? NIGHTMARE_CAMERA_DRAIN
        : NORMAL_CAMERA_DRAIN;
      const tickInterval = isNightmare
        ? NIGHTMARE_TICK_INTERVAL
        : NORMAL_TICK_INTERVAL;
      const wolferdSpawnChance = isNightmare
        ? NIGHTMARE_WOLFERD_SPAWN_CHANCE
        : NORMAL_WOLFERD_SPAWN_CHANCE;
      const wolferdMaxTicks = isNightmare
        ? NIGHTMARE_WOLFERD_MAX_TICKS
        : NORMAL_WOLFERD_MAX_TICKS;
      const stutzWalkSpeed = isNightmare
        ? NIGHTMARE_STUTZ_WALK_SPEED
        : NORMAL_STUTZ_WALK_SPEED;
      const walkProgressDivisor = isNightmare
        ? NIGHTMARE_WALK_PROGRESS_DIVISOR
        : NORMAL_WALK_PROGRESS_DIVISOR;
      const wolferdMoveMultiplier = isNightmare
        ? NIGHTMARE_WOLFERD_MOVE_MULTIPLIER
        : NORMAL_WOLFERD_MOVE_MULTIPLIER;

      // Power drain
      let drainRate = baseDrain;
      if (s.leftDoorClosed) drainRate += doorDrain;
      if (s.rightDoorClosed) drainRate += doorDrain;
      if (s.cameraOpen) drainRate += cameraDrain;

      const newPower = Math.max(0, s.power - drainRate * dtSec);
      const newTime = Math.min(NIGHT_DURATION, elapsed);

      // Time won!
      if (newTime >= NIGHT_DURATION) {
        gameActiveRef.current = false;
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        const isNm = s.mode === "nightmare";
        if (actor) {
          if (isNm) {
            actor
              .saveNightmareScore(
                BigInt(s.night + 1 <= 5 ? s.night + 1 : 5),
                BigInt(NIGHT_DURATION),
              )
              .catch(() => {});
          } else {
            actor
              .saveHighScore(
                BigInt(s.night + 1 <= 5 ? s.night + 1 : 5),
                BigInt(NIGHT_DURATION),
              )
              .catch(() => {});
          }
        }
        setState((prev) => {
          if (isNm) {
            return {
              ...prev,
              time: NIGHT_DURATION,
              power: newPower,
              screen: s.night >= 5 ? "wingame" : "winnight",
              survivedNight: s.night,
              nightmareBestNight: Math.max(
                prev.nightmareBestNight,
                s.night + 1,
              ),
            };
          }
          return {
            ...prev,
            time: NIGHT_DURATION,
            power: newPower,
            screen: s.night >= 5 ? "wingame" : "winnight",
            survivedNight: s.night,
            bestNight: Math.max(prev.bestNight, s.night + 1),
          };
        });
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

      // Kill threshold based on mode
      const killThreshold = isNightmare ? 2.5 : 3.0;

      // Update walking progress for all animatronics (skip if frozen)
      let newAnimatronics = s.animatronisFrozen
        ? s.animatronics
        : s.animatronics.map((anm) => {
            // Update doorKillTimer for hostile animatronics standing at an open door
            if (anm.atDoor && !anm.isWalking && anm.active && !anm.friendly) {
              const doorClosed =
                anm.side === "left" ? s.leftDoorClosed : s.rightDoorClosed;
              if (!doorClosed) {
                // Door is open — accumulate kill timer
                return { ...anm, doorKillTimer: anm.doorKillTimer + dtSec };
              }
              // Door just closed — reset timer
              return anm.doorKillTimer > 0 ? { ...anm, doorKillTimer: 0 } : anm;
            }

            if (!anm.isWalking) return anm;
            // Coach Stutz walks faster; Wolferd in nightmare teleports almost instantly
            let divisor = walkProgressDivisor;
            if (anm.id === "coachStutz") {
              divisor = walkProgressDivisor / stutzWalkSpeed;
            } else if (anm.id === "coachWolferd" && !isNightmare) {
              divisor = NIGHTMARE_WOLFERD_WALK_DIVISOR;
            }
            const newProgress = Math.min(1, anm.walkProgress + dtSec / divisor);
            const doneWalking = newProgress >= 1;
            return {
              ...anm,
              walkProgress: newProgress,
              isWalking: !doneWalking,
            };
          });

      // AI ticks (skip if frozen)
      const aiDt = timestamp - lastAiTickRef.current;
      let gameOver = false;
      let killerAnm: AnimatronicId | null = null;
      let wolferdJustSpawnedThisTick = false;
      let mrMoodyJustEntered = false;

      if (!s.animatronisFrozen && aiDt >= tickInterval) {
        lastAiTickRef.current = timestamp;
        const moveChance = getMoveChance(s.night, s.mode);

        newAnimatronics = newAnimatronics.map((anm) => {
          const updated = { ...anm };

          // Try to spawn Coach Wolferd if inactive
          if (updated.rareSpawn && !updated.active) {
            if (Math.random() < wolferdSpawnChance) {
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

            // Rare animatronics (Wolferd) auto-retreat
            if (updated.rareSpawn) {
              updated.rareTimer += 1;
              // In normal (hard) mode: door doesn't make him retreat — only time does
              const shouldRetreat = !isNightmare
                ? updated.rareTimer >= wolferdMaxTicks
                : updated.rareTimer >= wolferdMaxTicks || doorClosed;
              if (shouldRetreat) {
                // Retreat and go inactive
                updated.currentRoom = updated.path[0];
                updated.previousRoom = updated.path[updated.path.length - 1];
                updated.walkProgress = 0;
                updated.isWalking = true;
                updated.atDoor = false;
                updated.rareTimer = 0;
                updated.active = false;
                updated.doorKillTimer = 0;
                return updated;
              }
              // Wolferd at door with it open -- death handled by doorKillTimer below
              return updated;
            }

            if (!doorClosed) {
              // Friendly animatronics (Mr. Moody) enter the room — handled in collision check below
              // Door is open — doorKillTimer accumulates in the rAF loop
              return updated;
            }

            // Door is closed — reset doorKillTimer and handle retreat
            updated.doorKillTimer = 0;
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
            effectiveMoveChance = moveChance * wolferdMoveMultiplier;
          }

          if (Math.random() < effectiveMoveChance) {
            const currentIndex = updated.path.indexOf(updated.currentRoom);
            if (currentIndex < updated.path.length - 1) {
              const nextRoom = updated.path[currentIndex + 1];
              // Only one hostile animatronic allowed at each door at a time
              const isDoorRoom =
                nextRoom === "LEFT_DOOR" || nextRoom === "RIGHT_DOOR";
              const doorBlocked =
                isDoorRoom &&
                newAnimatronics.some(
                  (other) =>
                    other.id !== updated.id &&
                    !other.friendly &&
                    other.active &&
                    (other.currentRoom === nextRoom ||
                      (other.isWalking && other.currentRoom === nextRoom)),
                );
              if (!doorBlocked) {
                updated.previousRoom = updated.currentRoom;
                updated.currentRoom = nextRoom;
                updated.walkProgress = 0;
                updated.isWalking = true;

                if (isDoorRoom) {
                  updated.atDoor = true;
                }
              }
            }
          }

          return updated;
        });

        // Check door collisions:
        // 1. Mr. Moody: trigger achievement when he just arrives with door open
        // 2. Hostile animatronics: kill is now handled by doorKillTimer (timer-based, NOT instant)
        for (let i = 0; i < newAnimatronics.length; i++) {
          const anm = newAnimatronics[i];
          const prev = s.animatronics[i];
          if (!anm.active) continue;
          const justArrived = prev.isWalking && !anm.isWalking && anm.atDoor;
          if (!justArrived) continue;
          const doorClosed =
            anm.side === "left" ? s.leftDoorClosed : s.rightDoorClosed;
          if (anm.friendly) {
            // Mr. Moody enters the room — achievement!
            if (!doorClosed) {
              mrMoodyJustEntered = true;
            }
          }
          // Hostile animatronics: no instant kill here — doorKillTimer handles it
        }

        // Handle Mr. Moody sitting in room: after ~15 ticks he leaves
        for (let i = 0; i < newAnimatronics.length; i++) {
          const anm = newAnimatronics[i];
          if (!anm.friendly || !anm.active || !anm.atDoor) continue;
          if (!anm.isWalking) {
            // He's sitting — count retreat timer, eventually leave
            if (anm.retreatTimer >= 15) {
              newAnimatronics[i] = {
                ...anm,
                currentRoom: anm.path[0],
                previousRoom: anm.path[anm.path.length - 1],
                walkProgress: 0,
                isWalking: true,
                atDoor: false,
                retreatTimer: 0,
                doorKillTimer: 0,
              };
            } else {
              newAnimatronics[i] = {
                ...anm,
                retreatTimer: anm.retreatTimer + 1,
              };
            }
          }
        }
      }

      // Timer-based kill check (every frame): hostile animatronic has been at open door long enough
      if (!gameOver) {
        for (let i = 0; i < newAnimatronics.length; i++) {
          const anm = newAnimatronics[i];
          if (!anm.active || anm.friendly || anm.isWalking || !anm.atDoor)
            continue;
          const doorClosed =
            anm.side === "left" ? s.leftDoorClosed : s.rightDoorClosed;
          if (!doorClosed && !s.godMode && anm.doorKillTimer >= killThreshold) {
            gameOver = true;
            killerAnm = anm.id;
            break;
          }
        }
      }

      // Compute whether Mr. Moody is currently sitting in the room
      const mrMoodyNowInRoom = newAnimatronics.some(
        (a) => a.friendly && a.active && a.atDoor && !a.isWalking,
      );

      if (gameOver && killerAnm) {
        setState((prev) => ({
          ...prev,
          animatronics: newAnimatronics,
          power: newPower,
          time: newTime,
          wolferdJustSpawned:
            wolferdSpawnedRecently || wolferdJustSpawnedThisTick,
          mrMoodyInRoom: mrMoodyNowInRoom,
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
        mrMoodyInRoom: mrMoodyNowInRoom,
        mrMoodyAchievement:
          prev.mrMoodyAchievement || mrMoodyJustEntered || mrMoodyNowInRoom,
      }));

      animFrameRef.current = requestAnimationFrame(runGameLoop);
    },
    [actor, triggerJumpscare],
  );

  const startGame = useCallback(
    (night: number, mode: GameMode = "normal") => {
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
        mode,
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
        godMode: false,
        animatronisFrozen: false,
        mrMoodyInRoom: false,
        mrMoodyAchievement: false,
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
    startGame(stateRef.current.survivedNight || 1, stateRef.current.mode);
  }, [startGame]);

  const goToNextNight = useCallback(() => {
    startGame(stateRef.current.survivedNight + 1, stateRef.current.mode);
  }, [startGame]);

  // ── Admin functions ──────────────────────────────────────────────────────

  const adminAutoWin = useCallback(() => {
    const s = stateRef.current;
    if (s.screen !== "game") return;
    gameActiveRef.current = false;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const isNm = s.mode === "nightmare";
    setState((prev) => {
      if (isNm) {
        return {
          ...prev,
          screen: prev.night >= 5 ? "wingame" : "winnight",
          survivedNight: prev.night,
          nightmareBestNight: Math.max(prev.nightmareBestNight, prev.night + 1),
        };
      }
      return {
        ...prev,
        screen: prev.night >= 5 ? "wingame" : "winnight",
        survivedNight: prev.night,
        bestNight: Math.max(prev.bestNight, prev.night + 1),
      };
    });
  }, []);

  const adminWinAll = useCallback(() => {
    gameActiveRef.current = false;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const isNm = stateRef.current.mode === "nightmare";
    setState((prev) => {
      if (isNm) {
        return {
          ...prev,
          screen: "wingame",
          survivedNight: 5,
          nightmareBestNight: Math.max(prev.nightmareBestNight, 6),
        };
      }
      return {
        ...prev,
        screen: "wingame",
        survivedNight: 5,
        bestNight: Math.max(prev.bestNight, 6),
      };
    });
  }, []);

  const adminKillAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      animatronics: prev.animatronics.map((a) => ({
        ...a,
        active: false,
        atDoor: false,
      })),
    }));
  }, []);

  const adminMaxPower = useCallback(() => {
    setState((prev) => ({ ...prev, power: 100 }));
  }, []);

  const adminToggleFreeze = useCallback(() => {
    setState((prev) => ({
      ...prev,
      animatronisFrozen: !prev.animatronisFrozen,
    }));
  }, []);

  const adminUnlockNights = useCallback(() => {
    setState((prev) => ({ ...prev, bestNight: Math.max(prev.bestNight, 5) }));
  }, []);

  const adminToggleGodMode = useCallback(() => {
    setState((prev) => ({ ...prev, godMode: !prev.godMode }));
  }, []);

  const adminSkipToNight = useCallback(
    (night: number) => {
      startGame(night, stateRef.current.mode);
    },
    [startGame],
  );

  // ─────────────────────────────────────────────────────────────────────────

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
    adminAutoWin,
    adminWinAll,
    adminKillAll,
    adminMaxPower,
    adminToggleFreeze,
    adminUnlockNights,
    adminToggleGodMode,
    adminSkipToNight,
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
