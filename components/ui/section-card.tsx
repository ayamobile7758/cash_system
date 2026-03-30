import React, { type HTMLAttributes, type ReactNode } from "react";

type SectionCardTone = "default" | "accent" | "subtle";

type SectionCardProps = HTMLAttributes<HTMLElement> & {
  eyebrow?: string;
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  tone?: SectionCardTone;
  children?: ReactNode;
};

export function SectionCard({
  eyebrow,
  title,
  description,
  actions,
  tone = "default",
  children,
  className,
  ...props
}: SectionCardProps) {
  const classNames = ["section-card", `section-card--${tone}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classNames} {...props}>
      {eyebrow || title ? (
        <div className="section-card__head">
          <header className="section-card__header">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {title ? <h2>{title}</h2> : null}
            {description ? (
              <p className="section-card__description">{description}</p>
            ) : null}
          </header>

          {actions ? <div className="section-card__actions">{actions}</div> : null}
        </div>
      ) : null}

      {children ? <div className="section-card__body">{children}</div> : null}
    </article>
  );
}
