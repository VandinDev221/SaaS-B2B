import { Controller, Get, MessageEvent, Req, Sse } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Observable } from "rxjs";
import { TenantContext } from "../../common/decorators/tenant-context.decorator";

@Controller("notifications")
export class NotificationsStreamController {
  constructor(private readonly events: EventEmitter2) {}

  @Sse("stream")
  stream(
    @TenantContext() ctx: { tenantId: string },
    @Req() req: { on: (ev: string, fn: () => void) => void }
  ): Observable<MessageEvent> {
    const tenantId = ctx.tenantId;
    const channel = `notification.${tenantId}`;

    return new Observable((subscriber) => {
      const handler = (payload: unknown) => {
        subscriber.next({ data: payload } as MessageEvent);
      };
      this.events.on(channel, handler);

      const heartbeat = setInterval(() => {
        subscriber.next({ data: { type: "ping", at: new Date().toISOString() } } as MessageEvent);
      }, 25_000);

      req.on("close", () => {
        this.events.off(channel, handler);
        clearInterval(heartbeat);
        subscriber.complete();
      });
    });
  }

  @Get("pending")
  listPending(@TenantContext() ctx: { tenantId: string }) {
    return { tenantId: ctx.tenantId, note: "Use SSE em /v1/notifications/stream" };
  }
}
