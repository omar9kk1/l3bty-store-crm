import { AppShell } from "@/components/shell/AppShell";
import { LocalDatabaseBridge } from "@/components/data/LocalDatabaseBridge";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <LocalDatabaseBridge><AppShell>{children}</AppShell></LocalDatabaseBridge>;
}
