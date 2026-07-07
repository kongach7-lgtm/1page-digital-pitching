"use client";

import { useRef, useState } from "react";

type WheelGroup = { id: string; name: string };

const COLORS = ["#FF6B35", "#FFD93D", "#4ECDC4", "#A78BFA", "#F472B6", "#34D399", "#60A5FA", "#FBBF24"];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function PresentationWheel({
  groups,
  onPick,
  disabled,
}: {
  groups: WheelGroup[];
  onPick: (group: WheelGroup) => void;
  disabled?: boolean;
}) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  // เก็บ snapshot ของรายชื่อ ณ ตอนหมุน กันกรณี poll เปลี่ยนรายชื่อระหว่างที่วงล้อกำลังหมุนอยู่
  const pickedRef = useRef<{ idx: number; list: WheelGroup[] } | null>(null);

  const size = 320;
  const center = size / 2;
  const radius = size / 2 - 4;
  const n = groups.length;
  const segAngle = n > 0 ? 360 / n : 360;

  const handleSpin = () => {
    if (spinning || disabled || n === 0) return;
    const idx = Math.floor(Math.random() * n);
    pickedRef.current = { idx, list: groups };

    const segCenter = idx * segAngle + segAngle / 2;
    const currentMod = ((rotation % 360) + 360) % 360;
    const desiredMod = (360 - segCenter) % 360;
    let delta = desiredMod - currentMod;
    if (delta < 0) delta += 360;
    const extraSpins = 6;

    setRotation(rotation + 360 * extraSpins + delta);
    setSpinning(true);
  };

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== "transform") return;
    setSpinning(false);
    const picked = pickedRef.current;
    pickedRef.current = null;
    if (picked && picked.list[picked.idx]) {
      onPick(picked.list[picked.idx]);
    }
  };

  if (n === 0) {
    return <p className="text-white/40 text-center">ไม่มีชื่อเหลือให้สุ่มแล้ว</p>;
  }

  const fontSize = Math.max(9, Math.min(15, 260 / n));

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className="absolute left-1/2 -top-1 -translate-x-1/2 z-10"
          style={{
            width: 0,
            height: 0,
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            borderTop: "20px solid #FFD93D",
          }}
        />
        <div
          onTransitionEnd={handleTransitionEnd}
          style={{
            width: size,
            height: size,
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 4.5s cubic-bezier(0.15, 0.65, 0.15, 1)" : "none",
          }}
        >
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {groups.map((g, i) => {
              const start = i * segAngle - 90;
              const end = start + segAngle;
              const startPt = polarToCartesian(center, center, radius, start);
              const endPt = polarToCartesian(center, center, radius, end);
              const largeArc = segAngle > 180 ? 1 : 0;
              const d = `M ${center} ${center} L ${startPt.x} ${startPt.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPt.x} ${endPt.y} Z`;
              const mid = start + segAngle / 2;
              const textPt = polarToCartesian(center, center, radius * 0.62, mid);
              const label = g.name.length > 14 ? `${g.name.slice(0, 13)}…` : g.name;
              // พลิกกลับ 180 องศาสำหรับป้ายชื่อครึ่งล่างของวงล้อ ไม่งั้นตัวอักษรจะกลับหัว
              const rawAngle = mid + 90;
              const normAngle = ((rawAngle % 360) + 360) % 360;
              const textAngle = normAngle > 90 && normAngle < 270 ? rawAngle + 180 : rawAngle;
              return (
                <g key={g.id}>
                  <path d={d} fill={COLORS[i % COLORS.length]} stroke="#1A1A2E" strokeWidth={1} />
                  <text
                    x={textPt.x}
                    y={textPt.y}
                    fill="#1A1A2E"
                    fontSize={fontSize}
                    fontWeight={600}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textAngle}, ${textPt.x}, ${textPt.y})`}
                  >
                    {label}
                  </text>
                </g>
              );
            })}
            <circle cx={center} cy={center} r={radius * 0.08} fill="#1A1A2E" />
          </svg>
        </div>
      </div>
      <button
        onClick={handleSpin}
        disabled={spinning || disabled}
        className="rounded-lg bg-brand-accent hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-2.5 transition"
      >
        {spinning ? "กำลังหมุน..." : "หมุนวงล้อ"}
      </button>
    </div>
  );
}
