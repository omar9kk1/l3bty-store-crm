import type { ReactNode } from "react";
import { WorkspaceBackButton } from "./WorkspaceBackButton";

export function WorkspaceContent({
  children,
  fullWidth = false,
}: {
  children: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <main
      className={`workspace-content${fullWidth ? " workspace-content--full" : ""}`}
      id="workspace-content"
    >
      <WorkspaceBackButton />
      {children}
    </main>
  );
}
