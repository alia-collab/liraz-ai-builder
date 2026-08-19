export type WorkspaceEvent = {
  type: "snapshot" | "job" | "task" | "message" | "preview" | "heartbeat";
  projectId: string;
  payload?: unknown;
  at: string;
};

type Handler = (event: WorkspaceEvent) => void;

const listeners = new Map<string, Set<Handler>>();

export function emitWorkspace(projectId: string, type: WorkspaceEvent["type"], payload?: unknown) {
  const event: WorkspaceEvent = { type, projectId, payload, at: new Date().toISOString() };
  const set = listeners.get(projectId);
  if (!set) return;
  for (const handler of set) {
    try {
      handler(event);
    } catch {
      // ignore a broken subscriber
    }
  }
}

export function subscribeWorkspace(projectId: string, handler: Handler) {
  const set = listeners.get(projectId) ?? new Set<Handler>();
  set.add(handler);
  listeners.set(projectId, set);
  return () => {
    set.delete(handler);
    if (set.size === 0) listeners.delete(projectId);
  };
}
