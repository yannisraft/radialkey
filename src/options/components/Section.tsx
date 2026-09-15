import type { ReactNode } from "react";

interface Props {
  title: string;
  description: string;
  children: ReactNode;
}

export function Section({ title, description, children }: Props) {
  return (
    <section className="section">
      <h2>{title}</h2>
      <p className="lead">{description}</p>
      {children}
    </section>
  );
}
