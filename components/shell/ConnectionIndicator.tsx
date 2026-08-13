import { Wifi } from "lucide-react";

export function ConnectionIndicator({ connected = true }: { connected?: boolean }) {
  return (
    <span className="connection-indicator" data-connected={connected}>
      <Wifi aria-hidden size={16} />
      <span>{connected ? "متصل" : "غير متصل"}</span>
    </span>
  );
}
