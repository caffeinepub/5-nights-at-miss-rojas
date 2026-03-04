import { useCallback, useEffect, useRef, useState } from "react";
import PowerMinigame from "./components/PowerMinigame";
import type {
  AnimatronicId,
  AnimatronicState,
  GameState,
} from "./hooks/useGameEngine";

const ROOM_NAMES: Record<string, string> = {
  Cam1: "CLASSROOM",
  Cam2: "HALLWAY",
  Cam3: "LIBRARY",
  Cam4: "EAST HALL",
  Cam5: "CAFETERIA HALL",
  Cam6: "CAFETERIA",
  LEFT_CAM: "LEFT DOOR CAM",
  RIGHT_CAM: "RIGHT DOOR CAM",
  LEFT_DOOR: "LEFT DOOR",
  RIGHT_DOOR: "RIGHT DOOR",
};

const ANIMATRONIC_COLORS: Record<AnimatronicId, string> = {
  missRojas: "#ff4444",
  mrsPineda: "#44ffaa",
  coachStutz: "#ffaa44",
  mrMoody: "#88aaff",
  coachWolferd: "#ffdd00",
};

const ANIMATRONIC_INITIALS: Record<AnimatronicId, string> = {
  missRojas: "MR",
  mrsPineda: "MP",
  coachStutz: "CS",
  mrMoody: "MM",
  coachWolferd: "CW",
};

const ANIMATRONIC_IMAGES: Record<AnimatronicId, string> = {
  missRojas: "/assets/generated/mrs-rojas-animatronic-final.dim_400x700.png",
  mrsPineda:
    "/assets/generated/mrs-pineda-animatronic-semirealistic.dim_400x700.png",
  coachStutz:
    "/assets/generated/coach-stutz-animatronic-semirealistic.dim_400x700.png",
  mrMoody:
    "/assets/generated/mr-moody-animatronic-semirealistic.dim_400x700.png",
  coachWolferd: "/assets/generated/coach-wolferd-animatronic.dim_400x700.png",
};

interface GameScreenProps {
  state: GameState;
  onLeftDoor: () => void;
  onRightDoor: () => void;
  onCamera: () => void;
  onResolvePowerMinigame: (success: boolean) => void;
}

export default function GameScreen({
  state,
  onLeftDoor,
  onRightDoor,
  onCamera,
  onResolvePowerMinigame,
}: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flickerRef = useRef(1.0);
  const flickerTimerRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  // Image cache for animatronic full-body images
  const imgCacheRef = useRef<Partial<Record<AnimatronicId, HTMLImageElement>>>(
    {},
  );
  const [glitchActive, setGlitchActive] = useState(false);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Preload all animatronic images on mount
  useEffect(() => {
    const ids: AnimatronicId[] = [
      "missRojas",
      "mrsPineda",
      "coachStutz",
      "mrMoody",
      "coachWolferd",
    ];
    for (const id of ids) {
      const img = new Image();
      img.src = ANIMATRONIC_IMAGES[id];
      imgCacheRef.current[id] = img;
    }
  }, []);

  // Play Wolferd warning sound when wolferdJustSpawned becomes true
  useEffect(() => {
    if (state.wolferdJustSpawned) {
      playWolferdWarningSound();
    }
  }, [state.wolferdJustSpawned]);

  // Nightmare: frequent screen glitch effect
  useEffect(() => {
    if (state.mode !== "nightmare") return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleGlitch = () => {
      // Glitch every 2-5 seconds — constant psychological pressure
      const delay = 2000 + Math.random() * 3000;
      timeoutId = setTimeout(() => {
        setGlitchActive(true);
        // Sometimes double-glitch
        const glitchDuration = Math.random() < 0.4 ? 250 : 120;
        setTimeout(() => {
          setGlitchActive(false);
          if (Math.random() < 0.4) {
            // Double-glitch
            setTimeout(() => {
              setGlitchActive(true);
              setTimeout(() => {
                setGlitchActive(false);
                scheduleGlitch();
              }, 100);
            }, 80);
          } else {
            scheduleGlitch();
          }
        }, glitchDuration);
      }, delay);
    };
    scheduleGlitch();
    return () => clearTimeout(timeoutId);
  }, [state.mode]);

  // Nightmare: heartbeat starts at 50% power and speeds up as power drops
  const heartbeatInterval =
    state.power < 10 ? 400 : state.power < 25 ? 650 : 1200;
  const heartbeatActive =
    state.mode === "nightmare" &&
    state.power < 50 &&
    !state.jumpscareVisible &&
    !state.powerMinigameActive;

  useEffect(() => {
    if (heartbeatActive) {
      heartbeatTimerRef.current = setInterval(() => {
        playHeartbeat();
      }, heartbeatInterval);
    } else {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    }
    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [heartbeatActive, heartbeatInterval]);

  const getTimeString = (seconds: number): string => {
    const hour = Math.floor((seconds / 150) * 6);
    const hourLabels = [
      "12 AM",
      "1 AM",
      "2 AM",
      "3 AM",
      "4 AM",
      "5 AM",
      "6 AM",
    ];
    return hourLabels[Math.min(hour, 6)];
  };

  const getPowerColor = (power: number): string => {
    if (power > 50) return "#44ff88";
    if (power > 25) return "#ffcc44";
    return "#ff4444";
  };

  const drawOfficeScene = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const { leftDoorClosed, rightDoorClosed, power } = state;

      // Background
      ctx.fillStyle = "#050a08";
      ctx.fillRect(0, 0, w, h);

      // Floor
      const floorGrad = ctx.createLinearGradient(0, h * 0.6, 0, h);
      floorGrad.addColorStop(0, "#0a1209");
      floorGrad.addColorStop(1, "#030705");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, h * 0.6, w, h * 0.4);

      // Ceiling
      const ceilGrad = ctx.createLinearGradient(0, 0, 0, h * 0.15);
      ceilGrad.addColorStop(0, "#020604");
      ceilGrad.addColorStop(1, "#070e09");
      ctx.fillStyle = ceilGrad;
      ctx.fillRect(0, 0, w, h * 0.15);

      // Walls
      ctx.fillStyle = "#060d08";
      ctx.fillRect(0, h * 0.15, w, h * 0.45);

      // Ceiling light flicker
      const flicker = power > 0 ? flickerRef.current : 0;
      if (flicker > 0) {
        const lightGrad = ctx.createRadialGradient(
          w / 2,
          0,
          0,
          w / 2,
          0,
          w * 0.4,
        );
        lightGrad.addColorStop(0, `rgba(140, 200, 120, ${0.15 * flicker})`);
        lightGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = lightGrad;
        ctx.fillRect(0, 0, w, h * 0.5);

        // Light fixture
        ctx.fillStyle = `rgba(180, 220, 160, ${0.9 * flicker})`;
        ctx.fillRect(w / 2 - 60, 0, 120, 8);
        ctx.fillStyle = `rgba(120, 180, 100, ${0.6 * flicker})`;
        ctx.fillRect(w / 2 - 80, 0, 160, 4);
      }

      // --- LEFT DOOR AREA ---
      const doorW = Math.min(w * 0.18, 160);
      const doorH = h * 0.65;
      const doorY = h * 0.15;

      // Left doorframe
      ctx.strokeStyle = "#1a2e1c";
      ctx.lineWidth = 8;
      ctx.strokeRect(10, doorY, doorW, doorH);

      // Left door fill (open = dark abyss, closed = steel door)
      if (leftDoorClosed) {
        const doorGrad = ctx.createLinearGradient(10, 0, 10 + doorW, 0);
        doorGrad.addColorStop(0, "#2a3a2a");
        doorGrad.addColorStop(0.3, "#3a5a3a");
        doorGrad.addColorStop(0.7, "#2a4a2a");
        doorGrad.addColorStop(1, "#1a2a1a");
        ctx.fillStyle = doorGrad;
        ctx.fillRect(10, doorY, doorW, doorH);
        // Door panel details
        ctx.strokeStyle = "#1a2a1a";
        ctx.lineWidth = 2;
        ctx.strokeRect(20, doorY + 20, doorW - 20, doorH * 0.45);
        ctx.strokeRect(20, doorY + doorH * 0.5, doorW - 20, doorH * 0.45);
        // Handle
        ctx.fillStyle = "#4a6a4a";
        ctx.beginPath();
        ctx.arc(10 + doorW - 15, doorY + doorH / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Dark abyss
        const abyssGrad = ctx.createLinearGradient(10, 0, 10 + doorW, 0);
        abyssGrad.addColorStop(0, "#010302");
        abyssGrad.addColorStop(1, "#020504");
        ctx.fillStyle = abyssGrad;
        ctx.fillRect(10, doorY, doorW, doorH);

        // Ominous glow from darkness
        const glowGrad = ctx.createRadialGradient(
          10 + doorW * 0.3,
          doorY + doorH * 0.5,
          0,
          10 + doorW * 0.3,
          doorY + doorH * 0.5,
          doorW * 0.6,
        );
        glowGrad.addColorStop(0, "rgba(20, 60, 20, 0.15)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = glowGrad;
        ctx.fillRect(10, doorY, doorW, doorH);
      }

      // Check if animatronic at left door or left cam (approaching)
      const leftAnm = state.animatronics.find(
        (a) =>
          (a.currentRoom === "LEFT_DOOR" || a.currentRoom === "LEFT_CAM") &&
          !a.isWalking &&
          a.active &&
          !a.friendly,
      );
      if (leftAnm && !leftDoorClosed) {
        // Draw eerie eyes in the darkness
        // Dim if approaching (LEFT_CAM), bright if at door (LEFT_DOOR)
        const leftAtDoor = leftAnm.currentRoom === "LEFT_DOOR";
        const eyeY = doorY + doorH * 0.35;
        const eyeX1 = 10 + doorW * 0.25;
        const eyeX2 = 10 + doorW * 0.65;
        const isNightmareEye = state.mode === "nightmare";

        // Kill timer ramp (0 → 1) — how close to killing
        const killThreshold = isNightmareEye ? 2.5 : 3.0;
        const killRatio = leftAtDoor
          ? Math.min(1, leftAnm.doorKillTimer / killThreshold)
          : 0;

        // Eye radius ramps up as kill timer progresses
        const baseEyeR = isNightmareEye
          ? leftAtDoor
            ? 10
            : 7
          : leftAtDoor
            ? 6
            : 4;
        const eyeR = baseEyeR + killRatio * (isNightmareEye ? 6 : 4);

        // Alpha ramps from 0.45 (cam) / 0.8 (door arrived) → 1.0 (about to kill)
        const baseAlpha = leftAtDoor ? 0.8 + killRatio * 0.2 : 0.45;
        ctx.globalAlpha = baseAlpha;

        // Shadow blur ramps up as they get closer to killing
        const baseShadow = isNightmareEye
          ? leftAtDoor
            ? 60 + killRatio * 40
            : 30
          : leftAtDoor
            ? 20 + killRatio * 30
            : 8;
        ctx.shadowBlur = baseShadow;
        ctx.shadowColor = ANIMATRONIC_COLORS[leftAnm.id];
        ctx.fillStyle = ANIMATRONIC_COLORS[leftAnm.id];
        ctx.beginPath();
        ctx.arc(eyeX1, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyeX2, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();

        if (leftAtDoor && killRatio > 0.3) {
          // Outer glow ring intensifies as kill timer progresses
          ctx.shadowBlur = baseShadow * 1.4;
          ctx.globalAlpha = 0.2 + killRatio * 0.3;
          ctx.beginPath();
          ctx.arc(eyeX1, eyeY, eyeR + 6 + killRatio * 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(eyeX2, eyeY, eyeR + 6 + killRatio * 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      // --- RIGHT DOOR AREA ---
      const rdX = w - doorW - 10;

      // Right doorframe
      ctx.strokeStyle = "#1a2e1c";
      ctx.lineWidth = 8;
      ctx.strokeRect(rdX, doorY, doorW, doorH);

      if (rightDoorClosed) {
        const doorGrad = ctx.createLinearGradient(rdX, 0, rdX + doorW, 0);
        doorGrad.addColorStop(0, "#1a2a1a");
        doorGrad.addColorStop(0.3, "#2a4a2a");
        doorGrad.addColorStop(0.7, "#3a5a3a");
        doorGrad.addColorStop(1, "#2a3a2a");
        ctx.fillStyle = doorGrad;
        ctx.fillRect(rdX, doorY, doorW, doorH);
        ctx.strokeStyle = "#1a2a1a";
        ctx.lineWidth = 2;
        ctx.strokeRect(rdX + 10, doorY + 20, doorW - 20, doorH * 0.45);
        ctx.strokeRect(rdX + 10, doorY + doorH * 0.5, doorW - 20, doorH * 0.45);
        ctx.fillStyle = "#4a6a4a";
        ctx.beginPath();
        ctx.arc(rdX + 15, doorY + doorH / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const abyssGrad = ctx.createLinearGradient(rdX, 0, rdX + doorW, 0);
        abyssGrad.addColorStop(0, "#020504");
        abyssGrad.addColorStop(1, "#010302");
        ctx.fillStyle = abyssGrad;
        ctx.fillRect(rdX, doorY, doorW, doorH);

        const glowGrad = ctx.createRadialGradient(
          rdX + doorW * 0.7,
          doorY + doorH * 0.5,
          0,
          rdX + doorW * 0.7,
          doorY + doorH * 0.5,
          doorW * 0.6,
        );
        glowGrad.addColorStop(0, "rgba(20, 60, 20, 0.15)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = glowGrad;
        ctx.fillRect(rdX, doorY, doorW, doorH);
      }

      // Check if Mr. Moody is chilling at the right door — friendly blue glow
      const moodyAtDoor = state.animatronics.find(
        (a) => a.friendly && a.active && a.atDoor && !a.isWalking,
      );
      if (moodyAtDoor && !rightDoorClosed) {
        const moodyEyeY = doorY + doorH * 0.35;
        const moodyEyeX1 = rdX + doorW * 0.25;
        const moodyEyeX2 = rdX + doorW * 0.65;
        ctx.globalAlpha = 0.8;
        ctx.shadowBlur = 18;
        ctx.shadowColor = "#88aaff";
        ctx.fillStyle = "#88aaff";
        ctx.beginPath();
        ctx.arc(moodyEyeX1, moodyEyeY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(moodyEyeX2, moodyEyeY, 5, 0, Math.PI * 2);
        ctx.fill();
        // Happy smile
        ctx.globalAlpha = 0.5;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(rdX + doorW * 0.45, moodyEyeY + 18, 12, 0, Math.PI);
        ctx.strokeStyle = "#88aaff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      // Check if animatronic at right door or right cam (approaching)
      const rightAnm = state.animatronics.find(
        (a) =>
          (a.currentRoom === "RIGHT_DOOR" || a.currentRoom === "RIGHT_CAM") &&
          !a.isWalking &&
          a.active &&
          !a.friendly,
      );
      if (rightAnm && !rightDoorClosed) {
        // Dim if approaching (RIGHT_CAM), bright if at door (RIGHT_DOOR)
        const rightAtDoor = rightAnm.currentRoom === "RIGHT_DOOR";
        const eyeY = doorY + doorH * 0.35;
        const eyeX1 = rdX + doorW * 0.25;
        const eyeX2 = rdX + doorW * 0.65;
        const isNightmareEyeR = state.mode === "nightmare";

        // Kill timer ramp (0 → 1) — how close to killing
        const killThresholdR = isNightmareEyeR ? 2.5 : 3.0;
        const killRatioR = rightAtDoor
          ? Math.min(1, rightAnm.doorKillTimer / killThresholdR)
          : 0;

        // Eye radius ramps up as kill timer progresses
        const baseEyeRR = isNightmareEyeR
          ? rightAtDoor
            ? 10
            : 7
          : rightAtDoor
            ? 6
            : 4;
        const eyeR = baseEyeRR + killRatioR * (isNightmareEyeR ? 6 : 4);

        // Alpha ramps from 0.45 (cam) / 0.8 (door arrived) → 1.0 (about to kill)
        const baseAlphaR = rightAtDoor ? 0.8 + killRatioR * 0.2 : 0.45;
        ctx.globalAlpha = baseAlphaR;

        // Shadow blur ramps up as they get closer to killing
        const baseShadowR = isNightmareEyeR
          ? rightAtDoor
            ? 60 + killRatioR * 40
            : 30
          : rightAtDoor
            ? 20 + killRatioR * 30
            : 8;
        ctx.shadowBlur = baseShadowR;
        ctx.shadowColor = ANIMATRONIC_COLORS[rightAnm.id];
        ctx.fillStyle = ANIMATRONIC_COLORS[rightAnm.id];
        ctx.beginPath();
        ctx.arc(eyeX1, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyeX2, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();

        if (rightAtDoor && killRatioR > 0.3) {
          // Outer glow ring intensifies as kill timer progresses
          ctx.shadowBlur = baseShadowR * 1.4;
          ctx.globalAlpha = 0.2 + killRatioR * 0.3;
          ctx.beginPath();
          ctx.arc(eyeX1, eyeY, eyeR + 6 + killRatioR * 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(eyeX2, eyeY, eyeR + 6 + killRatioR * 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      // --- DESK ---
      const deskY = h * 0.55;
      const deskH = h * 0.25;
      const deskX = w * 0.2;
      const deskW = w * 0.6;

      ctx.fillStyle = "#0d1a0f";
      ctx.fillRect(deskX, deskY, deskW, deskH);
      ctx.strokeStyle = "#1a2e1c";
      ctx.lineWidth = 3;
      ctx.strokeRect(deskX, deskY, deskW, deskH);

      // 3D printed fidgets on desk
      // Fidget 1 - spinner shape
      const f1x = deskX + deskW * 0.08;
      const f1y = deskY + deskH * 0.35;
      ctx.fillStyle = "#1a3a2a";
      ctx.strokeStyle = "#2a5a3a";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const bx = f1x + Math.cos(angle) * 9;
        const by = f1y + Math.sin(angle) * 9;
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = "#2a5a4a";
      ctx.beginPath();
      ctx.arc(f1x, f1y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Fidget 2 - cube
      const f2x = deskX + deskW * 0.14;
      const f2y = deskY + deskH * 0.3;
      const cubeSize = 10;
      ctx.fillStyle = "#1a2e22";
      ctx.strokeStyle = "#2a4a30";
      ctx.lineWidth = 1.5;
      ctx.fillRect(f2x, f2y, cubeSize, cubeSize);
      ctx.strokeRect(f2x, f2y, cubeSize, cubeSize);
      // cube top face
      ctx.beginPath();
      ctx.moveTo(f2x, f2y);
      ctx.lineTo(f2x + 6, f2y - 5);
      ctx.lineTo(f2x + cubeSize + 6, f2y - 5);
      ctx.lineTo(f2x + cubeSize, f2y);
      ctx.closePath();
      ctx.fillStyle = "#2a3e28";
      ctx.fill();
      ctx.strokeStyle = "#3a5a38";
      ctx.stroke();

      // Monitor on desk (Coach Stutz's security monitor)
      const monW = deskW * 0.22;
      const monH = deskH * 0.8;
      const monX = deskX + deskW * 0.5 - monW / 2;
      const monY = deskY - monH + 8;

      // Monitor stand
      ctx.fillStyle = "#0a1a0e";
      ctx.fillRect(monX + monW * 0.4, deskY - 8, monW * 0.2, 12);
      ctx.fillRect(monX + monW * 0.25, deskY - 2, monW * 0.5, 6);

      // Monitor body
      ctx.fillStyle = "#060e08";
      ctx.strokeStyle = "#22aa55";
      ctx.lineWidth = 3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#00ff88";
      ctx.strokeRect(monX, monY, monW, monH * 0.88);
      ctx.shadowBlur = 0;
      ctx.fillRect(monX, monY, monW, monH * 0.88);

      // Monitor screen - shows camera feed
      const screenX = monX + 4;
      const screenY = monY + 4;
      const screenW = monW - 8;
      const screenH = monH * 0.88 - 8;

      // Screen background - green CRT
      const screenGrad = ctx.createLinearGradient(
        screenX,
        screenY,
        screenX,
        screenY + screenH,
      );
      screenGrad.addColorStop(0, "#0a2218");
      screenGrad.addColorStop(1, "#041008");
      ctx.fillStyle = screenGrad;
      ctx.fillRect(screenX, screenY, screenW, screenH);

      // Show a camera feed preview - small grid of cam views
      const camCols = 2;
      const camRows = 2;
      const camCellW = screenW / camCols;
      const camCellH = screenH / camRows;
      const camLabels = ["CAM1", "CAM2", "L-CAM", "R-CAM"];
      for (let ci = 0; ci < 4; ci++) {
        const cc = ci % camCols;
        const cr = Math.floor(ci / camCols);
        const cx2 = screenX + cc * camCellW;
        const cy2 = screenY + cr * camCellH;
        ctx.fillStyle = `rgba(0,${20 + Math.random() * 8},${8 + Math.random() * 4},0.6)`;
        ctx.fillRect(cx2, cy2, camCellW, camCellH);
        ctx.strokeStyle = "rgba(0,80,30,0.5)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx2, cy2, camCellW, camCellH);
        ctx.font = "bold 5px monospace";
        ctx.fillStyle = "#22ff66";
        ctx.textAlign = "left";
        ctx.fillText(camLabels[ci], cx2 + 2, cy2 + 8);

        // Draw a dot if animatronic is in this cam
        const camMap: Record<number, string[]> = {
          0: ["Cam1"],
          1: ["Cam2", "Cam3"],
          2: ["LEFT_CAM"],
          3: ["RIGHT_CAM"],
        };
        const hasAnm = state.animatronics.some(
          (a) => a.active && camMap[ci]?.includes(a.currentRoom),
        );
        if (hasAnm) {
          ctx.fillStyle = "#ff4444";
          ctx.shadowBlur = 4;
          ctx.shadowColor = "#ff0000";
          ctx.beginPath();
          ctx.arc(cx2 + camCellW - 6, cy2 + 7, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Scan lines on monitor screen
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      for (let y = screenY; y < screenY + screenH; y += 2) {
        ctx.fillRect(screenX, y, screenW, 1);
      }

      // "SECURITY" label on monitor
      ctx.font = "bold 5px monospace";
      ctx.fillStyle = "#44ff88";
      ctx.textAlign = "center";
      ctx.fillText("SECURITY", monX + monW / 2, monY + monH * 0.88 + 8);

      // Regular monitors on desk (left and right of center)
      const monitorColors = ["#0a2a18", "#0a1a24"];
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1;
        const mX = deskX + deskW * (i === 0 ? 0.22 : 0.62);
        const mY = deskY + 10;
        const mW = deskW * 0.2;
        const mH = deskH * 0.55;

        ctx.fillStyle = "#060e08";
        ctx.strokeStyle = "#1a3a1e";
        ctx.lineWidth = 3;
        ctx.strokeRect(mX, mY, mW, mH);
        ctx.fillRect(mX, mY, mW, mH);

        // Screen glow
        const screenGrad2 = ctx.createLinearGradient(mX, mY, mX, mY + mH);
        screenGrad2.addColorStop(0, monitorColors[i]);
        screenGrad2.addColorStop(1, "#030806");
        ctx.fillStyle = screenGrad2;
        ctx.fillRect(mX + 3, mY + 3, mW - 6, mH - 6);

        // Scan lines on monitor
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        for (let y = mY + 3; y < mY + mH - 3; y += 3) {
          ctx.fillRect(mX + 3, y, mW - 6, 1);
        }

        void side; // suppress unused var warning
      }

      // Vignette
      const vignette = ctx.createRadialGradient(
        w / 2,
        h / 2,
        h * 0.2,
        w / 2,
        h / 2,
        h * 0.85,
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    },
    [state],
  );

  // Helper: draw a single animatronic in a camera cell with full-body image
  const drawAnimatronicInCell = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      anm: AnimatronicState,
      cx: number,
      cy: number,
      cellW: number,
      cellH: number,
      opacity: number,
    ) => {
      const img = imgCacheRef.current[anm.id];
      const color = ANIMATRONIC_COLORS[anm.id];

      ctx.save();
      ctx.globalAlpha = opacity;

      if (img?.complete && img.naturalWidth > 0) {
        // Fit the image into the cell maintaining aspect ratio
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const cellAspect = cellW / cellH;
        let drawW: number;
        let drawH: number;
        if (imgAspect > cellAspect) {
          drawW = cellW * 0.85;
          drawH = drawW / imgAspect;
        } else {
          drawH = cellH * 0.85;
          drawW = drawH * imgAspect;
        }
        const drawX = cx + (cellW - drawW) / 2;
        const drawY = cy + (cellH - drawH) / 2;

        // Apply green tint using composite
        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // Green tint overlay on the image
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = "rgba(0, 200, 80, 0.3)";
        ctx.fillRect(drawX, drawY, drawW, drawH);
        ctx.globalCompositeOperation = "source-over";

        // Coach Wolferd gets a yellow warning flash effect
        if (anm.id === "coachWolferd") {
          ctx.globalCompositeOperation = "screen";
          ctx.fillStyle = "rgba(255, 220, 0, 0.15)";
          ctx.fillRect(drawX, drawY, drawW, drawH);
          ctx.globalCompositeOperation = "source-over";
        }
      } else {
        // Fallback: glowing dot
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx + cellW * 0.5, cy + cellH * 0.55, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Small label badge in corner
      const badgeX = cx + 4;
      const badgeY = cy + cellH - 20;
      ctx.globalAlpha = opacity;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `${color}cc`;
      ctx.fillRect(badgeX, badgeY, 22, 16);
      ctx.font = "bold 9px 'Outfit', monospace";
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.fillText(ANIMATRONIC_INITIALS[anm.id], badgeX + 11, badgeY + 11);

      // Wolferd gets a "RARE!" warning label
      if (anm.id === "coachWolferd") {
        ctx.globalAlpha = opacity;
        ctx.fillStyle = "rgba(255, 220, 0, 0.9)";
        ctx.fillRect(cx + cellW - 36, badgeY, 34, 16);
        ctx.font = "bold 8px 'Outfit', monospace";
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.fillText("RARE!", cx + cellW - 36 + 17, badgeY + 11);
      }

      ctx.restore();
    },
    [],
  );

  const drawCameraOverlay = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      // Dark overlay
      ctx.fillStyle = "rgba(0, 10, 5, 0.88)";
      ctx.fillRect(0, 0, w, h);

      const padding = 12;
      const cols = 4;
      const rows = 2;
      const cams = [
        "Cam1",
        "Cam2",
        "Cam3",
        "Cam4",
        "Cam5",
        "Cam6",
        "LEFT_CAM",
        "RIGHT_CAM",
      ];

      const gridW = w - padding * 2;
      const gridH = h * 0.76 - padding * 2;
      const cellW = (gridW - padding * (cols - 1)) / cols;
      const cellH = (gridH - padding * (rows - 1)) / rows;
      const startY = h * 0.11;

      ctx.font = "bold 16px 'Bricolage Grotesque', sans-serif";
      ctx.fillStyle = "#44ff88";
      ctx.textAlign = "center";
      ctx.fillText("▶ SECURITY CAMERAS ◀", w / 2, startY - 8);

      cams.forEach((cam, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = padding + col * (cellW + padding);
        const cy = startY + row * (cellH + padding);

        // Cell background - static noise effect
        ctx.fillStyle = "#020804";
        ctx.fillRect(cx, cy, cellW, cellH);

        // Static noise (draw random pixels)
        const imageData = ctx.getImageData(
          cx,
          cy,
          Math.floor(cellW),
          Math.floor(cellH),
        );
        for (let p = 0; p < imageData.data.length; p += 4) {
          if (Math.random() < 0.04) {
            const v = Math.random() * 30;
            imageData.data[p] = v * 0.3;
            imageData.data[p + 1] = v;
            imageData.data[p + 2] = v * 0.5;
            imageData.data[p + 3] = 255;
          }
        }
        ctx.putImageData(imageData, cx, cy);

        // Green tint overlay
        ctx.fillStyle = "rgba(0, 40, 15, 0.4)";
        ctx.fillRect(cx, cy, cellW, cellH);

        // Scan lines
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        for (let y = cy; y < cy + cellH; y += 2) {
          ctx.fillRect(cx, y, cellW, 1);
        }

        // Border
        ctx.strokeStyle = "#1a3a1e";
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, cellW, cellH);

        // Cam label
        ctx.font = "bold 9px 'Outfit', monospace";
        ctx.fillStyle = "#44ff88";
        ctx.textAlign = "left";
        ctx.fillText(cam.toUpperCase(), cx + 5, cy + 13);

        // Room name
        ctx.font = "8px 'Outfit', monospace";
        ctx.fillStyle = "#22aa55";
        ctx.fillText(ROOM_NAMES[cam] ?? cam, cx + 5, cy + 24);

        // Door cams show animatronics that are standing AT the door too
        const linkedDoorRoom =
          cam === "LEFT_CAM"
            ? "LEFT_DOOR"
            : cam === "RIGHT_CAM"
              ? "RIGHT_DOOR"
              : null;

        // Find animatronics fully in this room (only active ones)
        const anmsFullyHere = state.animatronics.filter(
          (a) =>
            a.active &&
            !a.isWalking &&
            (a.currentRoom === cam ||
              (linkedDoorRoom !== null && a.currentRoom === linkedDoorRoom)),
        );
        // Find animatronics walking OUT from this room (previousRoom)
        const anmsLeaving = state.animatronics.filter(
          (a) =>
            a.active &&
            a.isWalking &&
            (a.previousRoom === cam ||
              (linkedDoorRoom !== null && a.previousRoom === linkedDoorRoom)),
        );

        // Only show ONE animatronic per camera cell — prefer fully arrived over leaving,
        // and among ties pick the one furthest along their path (most dangerous).
        const pathIndex = (a: {
          id: string;
          path: string[];
          currentRoom: string;
          previousRoom: string;
          isWalking: boolean;
        }) =>
          a.isWalking
            ? a.path.indexOf(a.previousRoom)
            : a.path.indexOf(a.currentRoom);

        if (anmsFullyHere.length > 0) {
          // Pick the one furthest along their path
          const anm = anmsFullyHere.reduce((best, a) =>
            pathIndex(a) >= pathIndex(best) ? a : best,
          );
          drawAnimatronicInCell(ctx, anm, cx, cy, cellW, cellH, 1.0);
        } else if (anmsLeaving.length > 0) {
          // Pick the one furthest along their path
          const anm = anmsLeaving.reduce((best, a) =>
            pathIndex(a) >= pathIndex(best) ? a : best,
          );
          const opacity = 0.3 + (1 - anm.walkProgress) * 0.7;
          drawAnimatronicInCell(ctx, anm, cx, cy, cellW, cellH, opacity);
        }
      });

      // Legend
      const legendY = h * 0.89;
      ctx.font = "10px 'Outfit', monospace";
      ctx.textAlign = "left";
      const anmIds: AnimatronicId[] = [
        "missRojas",
        "mrsPineda",
        "coachStutz",
        "mrMoody",
        "coachWolferd",
      ];
      const anmNames = [
        "Miss Rojas",
        "Mrs. Pineda",
        "Coach Stutz",
        "Mr. Moody ♥",
        "Coach Wolferd ★",
      ];
      const legendSpacing = w / 5;
      anmIds.forEach((id, i) => {
        const lx = padding + i * legendSpacing;
        const isActive = state.animatronics.find((a) => a.id === id)?.active;
        const color = isActive ? ANIMATRONIC_COLORS[id] : "#444444";
        ctx.fillStyle = color;
        ctx.shadowBlur = isActive ? 8 : 0;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(lx + 6, legendY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = isActive ? "#88ccaa" : "#445544";
        ctx.fillText(anmNames[i], lx + 14, legendY + 4);
      });

      // "CLOSE" label at bottom
      ctx.font = "bold 11px 'Outfit', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#44ff88";
      ctx.fillText("[ CLICK CAMERAS TO CLOSE ]", w / 2, h * 0.97);
    },
    [state, drawAnimatronicInCell],
  );

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Update flicker
    flickerTimerRef.current += 1;
    if (flickerTimerRef.current > 60) {
      flickerTimerRef.current = 0;
      if (Math.random() < 0.05) {
        flickerRef.current = 0.7 + Math.random() * 0.3;
      } else {
        flickerRef.current = 0.95 + Math.random() * 0.05;
      }
    }

    if (state.cameraOpen) {
      drawOfficeScene(ctx, w, h);
      drawCameraOverlay(ctx, w, h);
    } else {
      drawOfficeScene(ctx, w, h);
    }

    animFrameRef.current = requestAnimationFrame(renderFrame);
  }, [state, drawOfficeScene, drawCameraOverlay]);

  useEffect(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    animFrameRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [renderFrame]);

  const getPowerBarColor = (power: number) => {
    if (power > 50) return "bg-emerald-500";
    if (power > 25) return "bg-yellow-500";
    return "bg-red-500";
  };

  const timeStr = getTimeString(state.time);
  const powerColor = getPowerColor(state.power);

  // Check if Wolferd is active for warning indicator
  const wolferdActive = state.animatronics.find(
    (a) => a.id === "coachWolferd" && a.active,
  );

  // Door proximity warnings -- only show when power > 0
  const leftDoorThreat =
    state.power > 0 &&
    state.animatronics.some(
      (a) =>
        a.active && !a.friendly && a.currentRoom === "LEFT_CAM" && !a.isWalking,
    );
  const rightDoorThreat =
    state.power > 0 &&
    state.animatronics.some(
      (a) =>
        a.active &&
        !a.friendly &&
        a.currentRoom === "RIGHT_CAM" &&
        !a.isWalking,
    );

  return (
    <div className="relative w-full h-full flex flex-col bg-black select-none">
      {/* Canvas */}
      <div
        className="relative flex-1 min-h-0"
        style={{
          filter: glitchActive
            ? "hue-rotate(180deg) brightness(1.5) saturate(2)"
            : undefined,
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          width={1200}
          height={700}
          style={{ display: "block" }}
        />
        {/* CRT overlay */}
        <div className="crt-overlay" />

        {/* Nightmare: persistent pulsing red vignette */}
        {state.mode === "nightmare" && (
          <div
            className="absolute inset-0 pointer-events-none z-10 animate-pulse"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 30%, rgba(200,0,0,0.28) 100%)",
            }}
          />
        )}

        {/* Nightmare: extra danger flash when animatronic is at door */}
        {state.mode === "nightmare" &&
          !state.cameraOpen &&
          (state.animatronics.some(
            (a) =>
              a.active &&
              !a.friendly &&
              a.currentRoom === "LEFT_DOOR" &&
              !a.isWalking,
          ) ||
            state.animatronics.some(
              (a) =>
                a.active &&
                !a.friendly &&
                a.currentRoom === "RIGHT_DOOR" &&
                !a.isWalking,
            )) && (
            <div
              className="absolute inset-0 pointer-events-none z-15 animate-ping"
              style={{
                background: "rgba(255,0,0,0.12)",
                border: "6px solid rgba(255,0,0,0.6)",
              }}
            />
          )}

        {/* LEFT DOOR DANGER WARNING — hidden in nightmare mode */}
        {leftDoorThreat && !state.cameraOpen && state.mode !== "nightmare" && (
          <div
            data-ocid="game.left_door_warning"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1 animate-pulse"
            style={{ maxWidth: "90px" }}
          >
            <div
              className="px-2 py-2 rounded font-display font-black uppercase text-xs tracking-widest text-center"
              style={{
                background: "rgba(200, 30, 0, 0.25)",
                border: "2px solid #ff3300",
                color: "#ff5500",
                textShadow: "0 0 10px #ff3300, 0 0 20px #ff0000",
                boxShadow:
                  "0 0 15px rgba(255,50,0,0.4), inset 0 0 10px rgba(255,50,0,0.1)",
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                letterSpacing: "0.1em",
              }}
            >
              ⚠ DANGER LEFT DOOR ⚠
            </div>
          </div>
        )}

        {/* RIGHT DOOR DANGER WARNING — hidden in nightmare mode */}
        {rightDoorThreat && !state.cameraOpen && state.mode !== "nightmare" && (
          <div
            data-ocid="game.right_door_warning"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1 animate-pulse"
            style={{ maxWidth: "90px" }}
          >
            <div
              className="px-2 py-2 rounded font-display font-black uppercase text-xs tracking-widest text-center"
              style={{
                background: "rgba(200, 30, 0, 0.25)",
                border: "2px solid #ff3300",
                color: "#ff5500",
                textShadow: "0 0 10px #ff3300, 0 0 20px #ff0000",
                boxShadow:
                  "0 0 15px rgba(255,50,0,0.4), inset 0 0 10px rgba(255,50,0,0.1)",
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                letterSpacing: "0.1em",
              }}
            >
              ⚠ DANGER RIGHT DOOR ⚠
            </div>
          </div>
        )}

        {/* Wolferd dramatic full-screen spawn warning */}
        {state.wolferdJustSpawned && (
          <div
            data-ocid="game.wolferd_spawn_warning"
            className="absolute inset-0 z-35 flex items-center justify-center pointer-events-none animate-pulse"
            style={{
              background: "rgba(255, 200, 0, 0.08)",
              border: "4px solid rgba(255, 220, 0, 0.7)",
              boxShadow:
                "inset 0 0 80px rgba(255,200,0,0.15), 0 0 40px rgba(255,200,0,0.3)",
            }}
          >
            <div
              className="text-center px-8 py-6 rounded-lg"
              style={{
                background: "rgba(0,0,0,0.7)",
                border: "2px solid rgba(255,220,0,0.8)",
                boxShadow: "0 0 30px rgba(255,200,0,0.4)",
              }}
            >
              <div
                className="font-display font-black uppercase tracking-widest"
                style={{
                  fontSize: "clamp(1.4rem, 3.5vw, 2.8rem)",
                  color: "#ffdd00",
                  textShadow: "0 0 20px #ffdd00, 0 0 50px #ffaa00",
                  letterSpacing: "0.12em",
                }}
              >
                ⚠ COACH WOLFERD HAS SPAWNED! ⚠
              </div>
              <div
                className="font-display font-bold uppercase tracking-widest text-sm mt-2"
                style={{ color: "rgba(255,200,0,0.7)" }}
              >
                THE WOLF IS ON THE LOOSE — BEWARE!
              </div>
            </div>
          </div>
        )}

        {/* Coach Wolferd active indicator (smaller, stays while active) */}
        {wolferdActive && !state.wolferdJustSpawned && (
          <div
            data-ocid="game.wolferd_active_indicator"
            className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded font-display font-black uppercase text-xs tracking-widest animate-pulse"
            style={{
              background: "rgba(255, 220, 0, 0.15)",
              border: "1px solid #ffdd00",
              color: "#ffdd00",
              textShadow: "0 0 10px #ffdd00",
            }}
          >
            ⚠ COACH WOLFERD SPOTTED ⚠
          </div>
        )}

        {/* Power Minigame overlay */}
        {state.powerMinigameActive && (
          <PowerMinigame
            onSuccess={() => onResolvePowerMinigame(true)}
            onFailure={() => onResolvePowerMinigame(false)}
            mode={state.mode}
          />
        )}

        {/* Jumpscare -- React img overlay instead of canvas drawing */}
        {state.jumpscareVisible && (
          <div className="absolute inset-0 z-40 flex items-center justify-center">
            {/* Red tint overlay */}
            <div className="absolute inset-0 bg-red-900/60 z-10 mix-blend-multiply" />
            <img
              src="/assets/generated/mrs-rojas-jumpscare.dim_800x600.png"
              alt="JUMPSCARE"
              className="absolute inset-0 w-full h-full object-cover z-20"
              style={{ filter: "brightness(1.1) saturate(1.3)" }}
            />
            {/* Text overlay */}
            <div
              className="absolute top-6 left-0 right-0 text-center z-30 font-display font-black uppercase tracking-widest"
              style={{
                fontSize: "clamp(1.5rem, 4vw, 3rem)",
                color: "#ff4444",
                textShadow: "0 0 20px #ff0000, 0 0 40px #ff0000",
              }}
            >
              {state.mode === "nightmare"
                ? "THERE IS NO ESCAPE"
                : state.jumpscareAnm === "coachWolferd"
                  ? "THE WOLF GOT YOU!"
                  : "SHE GOT YOU!"}
            </div>
          </div>
        )}
      </div>

      {/* HUD */}
      <div
        className="flex items-stretch gap-2 px-3 py-2 bg-black border-t border-green-900/50"
        style={{ minHeight: "72px" }}
      >
        {/* LEFT DOOR */}
        <button
          type="button"
          data-ocid="game.left_door_button"
          onClick={onLeftDoor}
          className={`
            flex-shrink-0 w-28 flex flex-col items-center justify-center gap-1
            border-2 font-display font-bold text-xs tracking-widest uppercase rounded-sm
            transition-all duration-150 cursor-pointer
            ${
              state.leftDoorClosed
                ? "bg-green-900/60 border-green-500 text-green-400 shadow-[0_0_12px_rgba(0,255,100,0.4)]"
                : "bg-red-950/40 border-red-800 text-red-400 hover:border-red-600"
            }
          `}
        >
          <span className="text-lg">{state.leftDoorClosed ? "🚪" : "⬛"}</span>
          <span>LEFT DOOR</span>
          <span className="text-[10px] opacity-70">
            {state.leftDoorClosed ? "CLOSED" : "OPEN"}
          </span>
        </button>

        {/* CENTER - Time, Power, Night */}
        <div className="flex-1 flex flex-col justify-between py-0.5">
          {/* Top row: Night + Nightmare badge + Time */}
          <div className="flex justify-between items-center gap-2">
            <div className="font-display font-bold text-green-400 tracking-widest text-sm uppercase">
              NIGHT {state.night}
            </div>
            {state.mode === "nightmare" && (
              <div
                data-ocid="game.nightmare_badge"
                className="font-display font-black uppercase text-xs tracking-widest px-2 py-0.5 rounded-sm animate-pulse"
                style={{
                  color: "#ff3300",
                  background: "rgba(200,20,0,0.18)",
                  border: "1px solid #ff3300",
                  textShadow: "0 0 8px #ff3300, 0 0 16px #ff0000",
                  boxShadow: "0 0 8px rgba(255,50,0,0.4)",
                  letterSpacing: "0.12em",
                }}
              >
                💀 NIGHTMARE
              </div>
            )}
            <div className="font-display font-bold text-green-300 tracking-widest text-base">
              {timeStr}
            </div>
          </div>

          {/* Power meter */}
          <div data-ocid="game.power_meter" className="space-y-0.5">
            <div className="flex justify-between text-[10px] font-body tracking-wider uppercase">
              <span style={{ color: powerColor }}>POWER</span>
              <span style={{ color: powerColor }}>
                {Math.ceil(state.power)}%
              </span>
            </div>
            <div
              className={`h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800 ${
                state.power < 20 ? "power-critical" : ""
              }`}
            >
              <div
                className={`h-full transition-all duration-200 rounded-full ${getPowerBarColor(state.power)}`}
                style={{ width: `${state.power}%` }}
              />
            </div>
          </div>

          {/* Animatronic status */}
          <div className="flex gap-2 text-[9px] font-body tracking-wide flex-wrap">
            {state.animatronics.map((anm) => (
              <div
                key={anm.id}
                className="flex items-center gap-1"
                style={{
                  color: anm.active
                    ? anm.atDoor
                      ? ANIMATRONIC_COLORS[anm.id]
                      : "#446644"
                    : "#333333",
                  opacity: anm.active ? 1 : 0.4,
                }}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    state.mode === "nightmare" && anm.active
                      ? "animate-ping"
                      : anm.active && anm.atDoor
                        ? "animate-pulse"
                        : anm.active && anm.isWalking
                          ? "animate-ping"
                          : ""
                  }`}
                  style={{
                    backgroundColor: anm.active
                      ? anm.atDoor
                        ? ANIMATRONIC_COLORS[anm.id]
                        : anm.isWalking
                          ? ANIMATRONIC_COLORS[anm.id]
                          : "#224422"
                      : "#222222",
                    opacity: anm.isWalking ? 0.6 : 1,
                  }}
                />
                <span className="hidden sm:inline">
                  {anm.name.split(" ")[0]}
                </span>
                <span className="sm:hidden">
                  {ANIMATRONIC_INITIALS[anm.id]}
                </span>
                {anm.active && anm.isWalking && (
                  <span className="opacity-60 text-[8px]">→</span>
                )}
                {!anm.active && anm.rareSpawn && (
                  <span className="opacity-40 text-[7px]">?</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CAMERAS */}
        <button
          type="button"
          data-ocid="game.camera_button"
          onClick={onCamera}
          className={`
            flex-shrink-0 w-24 flex flex-col items-center justify-center gap-1
            border-2 font-display font-bold text-xs tracking-widest uppercase rounded-sm
            transition-all duration-150 cursor-pointer
            ${
              state.cameraOpen
                ? "bg-green-900/60 border-green-400 text-green-300 shadow-[0_0_12px_rgba(0,255,100,0.4)]"
                : "bg-gray-950/60 border-gray-700 text-gray-400 hover:border-gray-500"
            }
          `}
        >
          <span className="text-lg">📷</span>
          <span>CAMERAS</span>
          <span className="text-[10px] opacity-70">
            {state.cameraOpen ? "LIVE" : "OFF"}
          </span>
        </button>

        {/* RIGHT DOOR */}
        <button
          type="button"
          data-ocid="game.right_door_button"
          onClick={onRightDoor}
          className={`
            flex-shrink-0 w-28 flex flex-col items-center justify-center gap-1
            border-2 font-display font-bold text-xs tracking-widest uppercase rounded-sm
            transition-all duration-150 cursor-pointer
            ${
              state.rightDoorClosed
                ? "bg-green-900/60 border-green-500 text-green-400 shadow-[0_0_12px_rgba(0,255,100,0.4)]"
                : "bg-red-950/40 border-red-800 text-red-400 hover:border-red-600"
            }
          `}
        >
          <span className="text-lg">{state.rightDoorClosed ? "🚪" : "⬛"}</span>
          <span>RIGHT DOOR</span>
          <span className="text-[10px] opacity-70">
            {state.rightDoorClosed ? "CLOSED" : "OPEN"}
          </span>
        </button>
      </div>
    </div>
  );
}

function playHeartbeat() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (
        window as unknown as {
          webkitAudioContext: typeof AudioContext;
        }
      ).webkitAudioContext;
    const ctx = new AudioCtx();
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(60, ctx.currentTime + i * 0.3);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.3);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.3 + 0.05);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + i * 0.3 + 0.25,
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.3);
      osc.stop(ctx.currentTime + i * 0.3 + 0.25);
    }
  } catch {
    // Audio not available
  }
}

function playWolferdWarningSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (
        window as unknown as {
          webkitAudioContext: typeof AudioContext;
        }
      ).webkitAudioContext;
    const ctx = new AudioCtx();

    // Wolf howl: rising oscillator with vibrato
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const vibratoOsc = ctx.createOscillator();
    const vibratoGain = ctx.createGain();

    // Vibrato LFO
    vibratoOsc.type = "sine";
    vibratoOsc.frequency.setValueAtTime(5, ctx.currentTime);
    vibratoGain.gain.setValueAtTime(15, ctx.currentTime);
    vibratoGain.gain.linearRampToValueAtTime(30, ctx.currentTime + 0.6);
    vibratoOsc.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    // Main howl tone - starts low, rises like a howl
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.5);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 1.0);
    osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 1.4);
    osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 1.8);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.15);
    gainNode.gain.setValueAtTime(0.35, ctx.currentTime + 1.4);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    vibratoOsc.start(ctx.currentTime);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 2.0);
    vibratoOsc.stop(ctx.currentTime + 2.0);

    // Second layer: growl undertone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(80, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.8);
    osc2.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 1.8);
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + 1.8);
  } catch {
    // Audio not available
  }
}
