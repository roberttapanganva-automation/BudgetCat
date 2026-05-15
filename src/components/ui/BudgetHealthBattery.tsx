import { useId } from "react";

import { cn } from "../../lib/utils";

type BudgetHealthBatteryProps = {
  percent: number;
  label?: string;
  className?: string;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getBatteryColor(percent: number) {
  if (percent >= 80) return "var(--bc-green)";
  if (percent >= 60) return "var(--bc-yellow, #b6c94c)";
  if (percent >= 40) return "var(--bc-amber)";
  if (percent >= 20) return "var(--bc-coral, #e18b6a)";
  return "var(--bc-red)";
}

export function BudgetHealthBattery({
  percent,
  label = "Budget Health",
  className,
}: BudgetHealthBatteryProps) {
  const svgId = useId().replace(/:/g, "");
  const safePercent = clampPercent(percent);
  const fillColor = getBatteryColor(safePercent);
  const batteryBodyX = 24;
  const batteryBodyY = 72;
  const batteryBodyWidth = 184;
  const batteryBodyHeight = 112;
  const batteryBodyRadius = 10;
  const fillWidth = (batteryBodyWidth * safePercent) / 100;

  const clipPathId = `${svgId}-budget-health-battery-body`;
  const gradientId = `${svgId}-budget-health-battery-fill`;

  return (
    <div
      aria-label={`${label}: ${safePercent}%`}
      className={cn(
        "flex w-fit shrink-0 flex-col items-start gap-0.5 text-[var(--bc-text)]",
        className,
      )}
      role="img"
      title={`${label}: ${safePercent}%`}
    >
      <span className="text-left text-[10px] font-black uppercase tracking-[0.2em] text-[var(--bc-text-muted)]">
        {label}
      </span>

      <div className="mt-1 flex items-center justify-end gap-1.5">
        <div className="relative -ml-1.5 h-[42px] w-[86px]">
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full text-[var(--bc-text)]"
            viewBox="0 0 256 256"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect fill="none" height="256" width="256" />
            <defs>
              <clipPath id={clipPathId}>
                <rect
                  height={batteryBodyHeight}
                  rx={batteryBodyRadius}
                  width={batteryBodyWidth}
                  x={batteryBodyX}
                  y={batteryBodyY}
                />
              </clipPath>
              <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor={fillColor} />
                <stop
                  offset="100%"
                  stopColor={`color-mix(in srgb, ${fillColor} 86%, white 14%)`}
                />
              </linearGradient>
            </defs>
            <rect
              fill="color-mix(in srgb, var(--bc-surface-soft) 70%, transparent)"
              height={batteryBodyHeight}
              rx={batteryBodyRadius}
              width={batteryBodyWidth}
              x={batteryBodyX}
              y={batteryBodyY}
            />
            <g clipPath={`url(#${clipPathId})`}>
              <rect
                fill={`url(#${gradientId})`}
                height={batteryBodyHeight}
                rx={batteryBodyRadius}
                style={{ transition: "width 500ms ease-out" }}
                width={fillWidth}
                x={batteryBodyX}
                y={batteryBodyY}
              />
            </g>
            <rect
              fill="none"
              height="128"
              rx="16"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="16"
              width="200"
              x="16"
              y="64"
            />
            <line
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="16"
              x1="248"
              x2="248"
              y1="96"
              y2="160"
            />
          </svg>
        </div>

        <span
          aria-hidden="true"
          className="text-base font-black leading-none text-[var(--bc-text)]"
        >
          {safePercent}%
        </span>
      </div>
    </div>
  );
}
