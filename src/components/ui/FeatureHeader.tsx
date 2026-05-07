"use client";

import type { ReactNode } from "react";

export default function FeatureHeader({
  title,
  subtitle,
  icon,
  actions,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`page-header ${className}`.trim()}>
      <div className="page-header__inner">
        <div className="page-header__left">
          <div className="page-header__icon" aria-hidden="true">
            {icon}
          </div>
          <div className="page-header__text">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="page-header__actions">{actions}</div> : null}
      </div>
    </div>
  );
}
