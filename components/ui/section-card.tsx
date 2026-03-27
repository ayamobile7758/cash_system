import React, { type HTMLAttributes, type ReactNode } from "react";

type SectionCardTone = "default" | "accent" | "subtle";

type SectionCardProps = HTMLAttributes<HTMLElement> & {
  eyebrow?: string;
  title?: string;
  description?: string;
  tone?: SectionCardTone;
  children?: ReactNode;
};

export function SectionCard({
  eyebrow,
  title,
  description,
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
        <header className="section-card__header">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          {title ? <h2>{title}</h2> : null}
        </header>
      ) : null}

      {children ? <div className="section-card__body">{children}</div> : null}
    </article>
  );
}
