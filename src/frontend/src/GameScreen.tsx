import { useCallback, useEffect, useRef } from "react";
import type { AnimatronicId, GameState } from "./hooks/useGameEngine";

const ROOM_NAMES: Record<string, string> = {
  Cam1: "CLASSROOM",
  Cam2: "HALLWAY",
  Cam3: "LIBRARY",
  Cam4: "EAST HALL",
  Cam5: "CAFETERIA HALL",
  Cam6: "CAFETERIA",
  LEFT_DOOR: "LEFT DOOR",
  RIGHT_DOOR: "RIGHT DOOR",
};

const ANIMATRONIC_COLORS: Record<AnimatronicId, string> = {
  missRojas: "#ff4444",
  mrBooks: "#44ffaa",
  carl: "#ffaa44",
  lunchLady: "#ff44ff",
};

const ANIMATRONIC_INITIALS: Record<AnimatronicId, string> = {
  missRojas: "MR",
  mrBooks: "MB",
  carl: "CJ",
  lunchLady: "LL",
};

interface GameScreenProps {
  state: GameState;
  onLeftDoor: () => void;
  onRightDoor: () => void;
  onCamera: () => void;
}

export default function GameScreen({
  state,
  onLeftDoor,
  onRightDoor,
  onCamera,
}: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flickerRef = useRef(1.0);
  const flickerTimerRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  const getTimeString = (seconds: number): string => {
    const hour = Math.floor((seconds / 90) * 6);
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

      // Check if animatronic at left door
      const leftAnm = state.animatronics.find(
        (a) => a.currentRoom === "LEFT_DOOR",
      );
      if (leftAnm && !leftDoorClosed) {
        // Draw eerie eyes in the darkness
        const eyeY = doorY + doorH * 0.35;
        const eyeX1 = 10 + doorW * 0.25;
        const eyeX2 = 10 + doorW * 0.65;
        const eyeR = 6;

        ctx.shadowBlur = 20;
        ctx.shadowColor = ANIMATRONIC_COLORS[leftAnm.id];
        ctx.fillStyle = ANIMATRONIC_COLORS[leftAnm.id];
        ctx.beginPath();
        ctx.arc(eyeX1, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyeX2, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();
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

      const rightAnm = state.animatronics.find(
        (a) => a.currentRoom === "RIGHT_DOOR",
      );
      if (rightAnm && !rightDoorClosed) {
        const eyeY = doorY + doorH * 0.35;
        const eyeX1 = rdX + doorW * 0.25;
        const eyeX2 = rdX + doorW * 0.65;
        const eyeR = 6;

        ctx.shadowBlur = 20;
        ctx.shadowColor = ANIMATRONIC_COLORS[rightAnm.id];
        ctx.fillStyle = ANIMATRONIC_COLORS[rightAnm.id];
        ctx.beginPath();
        ctx.arc(eyeX1, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyeX2, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();
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

      // Monitor screens on desk
      const monitorColors = ["#0a2a18", "#0a1a24"];
      for (let i = 0; i < 2; i++) {
        const mX = deskX + deskW * 0.2 + i * (deskW * 0.35);
        const mY = deskY + 10;
        const mW = deskW * 0.28;
        const mH = deskH * 0.55;

        ctx.fillStyle = "#060e08";
        ctx.strokeStyle = "#1a3a1e";
        ctx.lineWidth = 3;
        ctx.strokeRect(mX, mY, mW, mH);
        ctx.fillRect(mX, mY, mW, mH);

        // Screen glow
        const screenGrad = ctx.createLinearGradient(mX, mY, mX, mY + mH);
        screenGrad.addColorStop(0, monitorColors[i]);
        screenGrad.addColorStop(1, "#030806");
        ctx.fillStyle = screenGrad;
        ctx.fillRect(mX + 3, mY + 3, mW - 6, mH - 6);

        // Scan lines on monitor
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        for (let y = mY + 3; y < mY + mH - 3; y += 3) {
          ctx.fillRect(mX + 3, y, mW - 6, 1);
        }
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

  const drawCameraOverlay = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      // Dark overlay
      ctx.fillStyle = "rgba(0, 10, 5, 0.88)";
      ctx.fillRect(0, 0, w, h);

      const padding = 16;
      const cols = 3;
      const rows = 2;
      const cams = ["Cam1", "Cam2", "Cam3", "Cam4", "Cam5", "Cam6"];

      const gridW = w - padding * 2;
      const gridH = h * 0.78 - padding * 2;
      const cellW = (gridW - padding * (cols - 1)) / cols;
      const cellH = (gridH - padding * (rows - 1)) / rows;
      const startY = h * 0.1;

      ctx.font = "bold 18px 'Bricolage Grotesque', sans-serif";
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
        const imageData = ctx.getImageData(cx, cy, cellW, cellH);
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
        ctx.font = "bold 10px 'Outfit', monospace";
        ctx.fillStyle = "#44ff88";
        ctx.textAlign = "left";
        ctx.fillText(cam.toUpperCase(), cx + 6, cy + 16);

        // Room name
        ctx.font = "9px 'Outfit', monospace";
        ctx.fillStyle = "#22aa55";
        ctx.fillText(ROOM_NAMES[cam], cx + 6, cy + 28);

        // Animatronics in this room
        const anmsHere = state.animatronics.filter(
          (a) => a.currentRoom === cam,
        );

        anmsHere.forEach((anm, ai) => {
          const dotX = cx + cellW * 0.5 + (ai - 0.5) * 20;
          const dotY = cy + cellH * 0.55;

          // Glowing dot
          ctx.shadowBlur = 12;
          ctx.shadowColor = ANIMATRONIC_COLORS[anm.id];
          ctx.fillStyle = ANIMATRONIC_COLORS[anm.id];
          ctx.beginPath();
          ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Initial
          ctx.font = "bold 8px 'Outfit', monospace";
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText(ANIMATRONIC_INITIALS[anm.id], dotX, dotY + 14);
        });
      });

      // Legend
      const legendY = h * 0.88;
      ctx.font = "10px 'Outfit', monospace";
      ctx.textAlign = "left";
      const anmIds: AnimatronicId[] = [
        "missRojas",
        "mrBooks",
        "carl",
        "lunchLady",
      ];
      const anmNames = ["Miss Rojas", "Mr. Books", "Carl", "Lunch Lady"];
      anmIds.forEach((id, i) => {
        const lx = padding + i * (w / 4);
        ctx.fillStyle = ANIMATRONIC_COLORS[id];
        ctx.shadowBlur = 8;
        ctx.shadowColor = ANIMATRONIC_COLORS[id];
        ctx.beginPath();
        ctx.arc(lx + 6, legendY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#88ccaa";
        ctx.fillText(anmNames[i], lx + 14, legendY + 4);
      });

      // "CLOSE" label at bottom
      ctx.font = "bold 12px 'Outfit', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#44ff88";
      ctx.fillText("[ CLICK CAMERAS TO CLOSE ]", w / 2, h * 0.96);
    },
    [state],
  );

  const drawJumpscare = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      // Full red background
      ctx.fillStyle = "#330000";
      ctx.fillRect(0, 0, w, h);

      // Load and draw the jumpscare image
      const img = new Image();
      img.src = "/assets/generated/miss-rojas-jumpscare.dim_800x600.png";
      // We'll draw what we can with canvas

      // Draw a terrifying face
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.35;

      // Head
      ctx.fillStyle = "#1a0505";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Eyes (glowing red)
      const eyeOffX = r * 0.3;
      const eyeOffY = r * 0.15;

      ctx.shadowBlur = 30;
      ctx.shadowColor = "#ff0000";
      ctx.fillStyle = "#ff2200";

      // Left eye
      ctx.beginPath();
      ctx.ellipse(
        cx - eyeOffX,
        cy - eyeOffY,
        r * 0.18,
        r * 0.22,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Right eye
      ctx.beginPath();
      ctx.ellipse(
        cx + eyeOffX,
        cy - eyeOffY,
        r * 0.18,
        r * 0.22,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Pupils
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.ellipse(
        cx - eyeOffX,
        cy - eyeOffY,
        r * 0.08,
        r * 0.12,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(
        cx + eyeOffX,
        cy - eyeOffY,
        r * 0.08,
        r * 0.12,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      ctx.shadowBlur = 0;

      // Mouth (wide grin)
      const mouthY = cy + r * 0.3;
      ctx.strokeStyle = "#ff2200";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, mouthY - r * 0.1, r * 0.45, 0.1, Math.PI - 0.1);
      ctx.stroke();

      // Teeth
      ctx.fillStyle = "#ffdddd";
      const toothW = r * 0.08;
      const toothH = r * 0.15;
      const numTeeth = 7;
      for (let i = 0; i < numTeeth; i++) {
        const angle = 0.15 + (i / (numTeeth - 1)) * (Math.PI - 0.3);
        const tx = cx + Math.cos(angle) * r * 0.42;
        const ty = mouthY - r * 0.1 + Math.sin(angle) * r * 0.42;
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(angle - Math.PI / 2);
        ctx.fillRect(-toothW / 2, 0, toothW, toothH);
        ctx.restore();
      }

      // Text
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#ff0000";
      ctx.fillStyle = "#ff4444";
      ctx.font = `bold ${Math.max(28, w * 0.05)}px 'Bricolage Grotesque', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("SHE GOT YOU!", w / 2, h * 0.1);
      ctx.shadowBlur = 0;
    },
    [],
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

    if (state.jumpscareVisible) {
      drawJumpscare(ctx, w, h);
    } else if (state.cameraOpen) {
      drawOfficeScene(ctx, w, h);
      drawCameraOverlay(ctx, w, h);
    } else {
      drawOfficeScene(ctx, w, h);
    }

    animFrameRef.current = requestAnimationFrame(renderFrame);
  }, [state, drawOfficeScene, drawCameraOverlay, drawJumpscare]);

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

  return (
    <div className="relative w-full h-full flex flex-col bg-black select-none">
      {/* Canvas */}
      <div className="relative flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          width={1200}
          height={700}
          style={{ display: "block" }}
        />
        {/* CRT overlay */}
        <div className="crt-overlay" />
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
          {/* Top row: Night + Time */}
          <div className="flex justify-between items-center">
            <div className="font-display font-bold text-green-400 tracking-widest text-sm uppercase">
              NIGHT {state.night}
            </div>
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
          <div className="flex gap-2 text-[9px] font-body tracking-wide">
            {state.animatronics.map((anm) => (
              <div
                key={anm.id}
                className="flex items-center gap-1"
                style={{
                  color: anm.atDoor ? ANIMATRONIC_COLORS[anm.id] : "#446644",
                }}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${anm.atDoor ? "animate-pulse" : ""}`}
                  style={{
                    backgroundColor: anm.atDoor
                      ? ANIMATRONIC_COLORS[anm.id]
                      : "#224422",
                  }}
                />
                <span className="hidden sm:inline">
                  {anm.name.split(" ")[0]}
                </span>
                <span className="sm:hidden">
                  {ANIMATRONIC_INITIALS[anm.id]}
                </span>
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
