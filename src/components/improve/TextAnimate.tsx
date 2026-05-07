import type { CSSProperties, ElementType } from "react";

type TextAnimateProps = {
  children: string;
  animation?: "slideLeft";
  by?: "character" | "word";
  as?: ElementType;
  className?: string;
  delay?: number;
  stagger?: number;
};

export function TextAnimate({
  children,
  animation = "slideLeft",
  by = "character",
  as,
  className,
  delay = 0,
  stagger = 0.032,
}: TextAnimateProps) {
  const Component = as ?? "span";
  const text = children.trim();
  const units = by === "word" ? text.split(/(\s+)/) : Array.from(text);

  return (
    <Component
      className={["text-animate", `text-animate--${animation}`, className]
        .filter(Boolean)
        .join(" ")}
      aria-label={text}
    >
      {units.map((unit, index) => {
        const isSpace = /^\s+$/.test(unit);

        return (
          <span
            key={`${unit}-${index}`}
            aria-hidden="true"
            className={isSpace ? "text-animate__space" : "text-animate__unit"}
            style={
              {
                "--text-animate-delay": `${delay + index * stagger}s`,
              } as CSSProperties
            }
          >
            {unit}
          </span>
        );
      })}
    </Component>
  );
}

export type { TextAnimateProps };
