import type { CSSProperties } from "react";

type NewtonsCradleLoaderProps = {
  size?: number;
  speed?: string;
  color?: string;
  className?: string;
  label?: string;
};

export default function NewtonsCradleLoader({
  size = 50,
  speed = "1.2s",
  color = "#474554",
  className,
  label = "Memuat...",
}: NewtonsCradleLoaderProps) {
  return (
    <div
      className={["uiverse-newtons-cradle", className]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          ["--uib-size"]: `${size}px`,
          ["--uib-speed"]: speed,
          ["--uib-color"]: color,
        } as CSSProperties
      }
      role="status"
      aria-label={label}
    >
      <div className="uiverse-newtons-cradle__dot" />
      <div className="uiverse-newtons-cradle__dot" />
      <div className="uiverse-newtons-cradle__dot" />
      <div className="uiverse-newtons-cradle__dot" />
    </div>
  );
}
