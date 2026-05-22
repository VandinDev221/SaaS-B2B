import { Body, Controller, Get, Param, Post, Query, Res } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { Response } from "express";
import { Roles } from "../../common/decorators/roles.decorator";
import { TenantContext } from "../../common/decorators/tenant-context.decorator";
import { QuoteFromChatService } from "./quote-from-chat.service";
import { QuotesService } from "./quotes.service";

class QuoteItemDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsString()
  name!: string;

  @IsNumber()
  @Min(1)
  qty!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

class CreateQuoteDto {
  @IsString()
  leadId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items!: QuoteItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  validDays?: number;
}

@Controller("quotes")
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly quoteFromChat: QuoteFromChatService
  ) {}

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent, UserRole.viewer)
  @Get()
  list(@TenantContext() ctx: { tenantId: string }) {
    return this.quotesService.list(ctx.tenantId);
  }

  @Get("catalog")
  catalog(@Query("niche") niche?: string) {
    return this.quotesService.getCatalog(niche || "services");
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent)
  @Post()
  create(@TenantContext() ctx: { tenantId: string }, @Body() body: CreateQuoteDto) {
    return this.quotesService.create(ctx.tenantId, body);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent)
  @Post(":id/send")
  send(@TenantContext() ctx: { tenantId: string }, @Param("id") id: string) {
    return this.quotesService.send(ctx.tenantId, id);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent)
  @Post("from-conversation/:conversationId")
  fromConversation(
    @TenantContext() ctx: { tenantId: string },
    @Param("conversationId") conversationId: string
  ) {
    return this.quoteFromChat.createFromConversation(ctx.tenantId, conversationId, {
      force: true
    });
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent)
  @Post(":id/approve")
  approve(@TenantContext() ctx: { tenantId: string }, @Param("id") id: string) {
    return this.quotesService.approve(ctx.tenantId, id);
  }

  @Get(":quoteId/pdf")
  async getPdf(
    @TenantContext() ctx: { tenantId: string },
    @Param("quoteId") quoteId: string,
    @Res() res: Response
  ) {
    const buffer = await this.quotesService.generatePdf(ctx.tenantId, quoteId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=quote-${quoteId}.pdf`);
    res.send(buffer);
  }
}
