import React, { type ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, meta, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header__copy">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
      </div>

      {meta || actions ? (
        <div className="page-header__aside">
          {meta ? <div className="page-header__meta">{meta}</div> : null}
          {actions ? <div className="page-header__actions">{actions}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
