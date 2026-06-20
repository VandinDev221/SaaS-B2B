import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { IsString, MinLength } from "class-validator";
import { Roles } from "../../common/decorators/roles.decorator";
import { TenantContext } from "../../common/decorators/tenant-context.decorator";
import { WhatsappService } from "./whatsapp.service";

class SendTemplateDto {
  @IsString()
  to!: string;

  @IsString()
  templateName!: string;
}

class SendMessageDto {
  @IsString()
  @MinLength(1)
  body!: string;
}

@Controller("whatsapp")
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get("conversations")
  async listConversations(
    @TenantContext() ctx: { tenantId: string },
    @Query("filter") filter?: "needs_reply" | "replied" | "all",
    @Query("sync") sync?: string
  ) {
    const f = filter === "replied" || filter === "all" ? filter : "needs_reply";
    const forceSync = sync === "1" || sync === "true";
    const [items, counts] = await Promise.all([
      this.whatsappService.listConversations(ctx.tenantId, f, { forceSync }),
      this.whatsappService.countByFilter(ctx.tenantId)
    ]);
    return { filter: f, counts, items };
  }

  @Post("inbox/sync")
  syncInbox(@TenantContext() ctx: { tenantId: string }) {
    return this.whatsappService.syncInbox(ctx.tenantId);
  }

  @Post("conversations/:id/messages")
  sendMessage(
    @TenantContext() ctx: { tenantId: string },
    @Param("id") id: string,
    @Body() body: SendMessageDto
  ) {
    return this.whatsappService.sendMessage(ctx.tenantId, id, body.body);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Delete("conversations/:id")
  deleteConversation(@TenantContext() ctx: { tenantId: string }, @Param("id") id: string) {
    return this.whatsappService.deleteConversation(ctx.tenantId, id);
  }

  @Post("send-template")
  sendTemplate(@TenantContext() ctx: { tenantId: string }, @Body() body: SendTemplateDto) {
    return this.whatsappService.sendTemplate(ctx.tenantId, body.to, body.templateName);
  }
}
