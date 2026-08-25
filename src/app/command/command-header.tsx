import type { ReactNode } from "react";

export function CommandPageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="command-page-header">
      <div>
        <span className="kicker">{kicker}</span>
        <h1 className="command-title">{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="command-page-actions">{actions}</div> : null}
    </header>
  );
}
