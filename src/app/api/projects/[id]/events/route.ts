import { NextRequest } from "next/server";
import { requireApiAuth, jsonError } from "@/lib/api/helpers";
import { requireProjectViewer } from "@/lib/workspace/access";
import { subscribeWorkspace } from "@/lib/workspace/events";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;
  const { id } = await params;
  const project = await requireProjectViewer(session.user.id, id);
  if (!project) return jsonError("Not found", 404);

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: { type: string; payload?: unknown; at?: string }) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      send({ type: "snapshot", payload: { projectId: id }, at: new Date().toISOString() });
      cleanup = subscribeWorkspace(id, (event) => send(event));
      const ping = setInterval(() => {
        send({ type: "heartbeat", at: new Date().toISOString() });
      }, 15000);
      const original = cleanup;
      cleanup = () => {
        clearInterval(ping);
        original();
      };
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
