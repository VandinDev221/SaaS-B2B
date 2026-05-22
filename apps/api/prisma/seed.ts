import {
  LeadStage,
  PaymentStatus,
  PrismaClient,
  QuoteStatus,
  UserRole
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const tenantSlug = process.env.SEED_TENANT_SLUG || "demo";
  const tenantName = process.env.SEED_TENANT_NAME || "FLOWOS Demo";
  const companyTradeName = process.env.SEED_COMPANY_TRADE_NAME || "FLOWOS Demo";
  const companyLegalName = process.env.SEED_COMPANY_LEGAL_NAME || "FLOWOS Demo LTDA";
  const companyIndustry = process.env.SEED_COMPANY_INDUSTRY || "cftv";
  const email = process.env.SEED_EMAIL || "admin@flowos.local";
  const password = process.env.SEED_PASSWORD || "admin12345";
  const fullName = process.env.SEED_FULL_NAME || "Admin FLOWOS";
  const passwordHash = await bcrypt.hash(password, 10);

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: { name: tenantName, isActive: true, whatsappInstance: "flowos", niche: "cftv" },
    create: {
      slug: tenantSlug,
      name: tenantName,
      isActive: true,
      whatsappInstance: "flowos",
      niche: "cftv"
    }
  });

  await prisma.tenantAutomationSettings.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      automationsEnabled: true,
      followupD1Enabled: true,
      followupD1ScheduleOnInbound: false,
      followupD1ScanEnabled: false,
      followupD7Enabled: false,
      billingRecoveryEnabled: false,
      postSaleEnabled: false
    },
    update: {
      followupD1ScheduleOnInbound: false,
      followupD1ScanEnabled: false
    }
  });

  await prisma.tenantAiKnowledge.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      businessDescription:
        "Empresa de solucoes comerciais B2B (CFTV, alarmes, instalacao e suporte). Atendimento consultivo pelo WhatsApp: primeiro entender o pedido do cliente, depois propor valor com clareza.",
      productsAndServices: `CFTV / Seguranca:
- Instalacao CFTV (ate 4 cameras): R$ 890
- Camera IP Full HD: R$ 320/un
- Gravador NVR 8 canais: R$ 650
- Manutencao mensal: R$ 149/mes

Servicos gerais:
- Visita tecnica: R$ 120
- Hora tecnica: R$ 95
- Contrato mensal de suporte: R$ 497/mes`,
      quoteInstructions: `REGRAS OBRIGATORIAS:
1. SEMPRE analisar toda a conversa antes de gerar orcamento.
2. So gerar e enviar PDF quando o pedido do cliente estiver claro (o que precisa, quantidade, local se aplicavel).
3. Se faltar informacao, responder no WhatsApp perguntando o que falta — NAO enviar orcamento incompleto.
4. Somente enviar o orcamento APOS atender o pedido do cliente (esclarecer duvidas e confirmar entendimento).
5. Itens do orcamento devem refletir exatamente o que foi combinado na conversa.
6. Validade padrao 7 dias. Desconto maximo 10% sem aprovacao manual.`,
      toneOfVoice: "profissional, cordial e objetivo — linguagem de WhatsApp, frases curtas",
      autoSendQuotePdf: false,
      autoCreateQuoteFromChat: false
    },
    update: {
      autoSendQuotePdf: false,
      autoCreateQuoteFromChat: false,
      businessDescription:
        "Empresa de solucoes comerciais B2B (CFTV, alarmes, instalacao e suporte). Atendimento consultivo pelo WhatsApp: primeiro entender o pedido do cliente, depois propor valor com clareza.",
      productsAndServices: `CFTV / Seguranca:
- Instalacao CFTV (ate 4 cameras): R$ 890
- Camera IP Full HD: R$ 320/un
- Gravador NVR 8 canais: R$ 650
- Manutencao mensal: R$ 149/mes

Servicos gerais:
- Visita tecnica: R$ 120
- Hora tecnica: R$ 95
- Contrato mensal de suporte: R$ 497/mes`,
      quoteInstructions: `REGRAS OBRIGATORIAS:
1. SEMPRE analisar toda a conversa antes de gerar orcamento.
2. So gerar e enviar PDF quando o pedido do cliente estiver claro (o que precisa, quantidade, local se aplicavel).
3. Se faltar informacao, responder no WhatsApp perguntando o que falta — NAO enviar orcamento incompleto.
4. Somente enviar o orcamento APOS atender o pedido do cliente (esclarecer duvidas e confirmar entendimento).
5. Itens do orcamento devem refletir exatamente o que foi combinado na conversa.
6. Validade padrao 7 dias. Desconto maximo 10% sem aprovacao manual.`,
      toneOfVoice: "profissional, cordial e objetivo — linguagem de WhatsApp, frases curtas"
    }
  });

  let company = await prisma.company.findFirst({ where: { tenantId: tenant.id } });
  if (company) {
    company = await prisma.company.update({
      where: { id: company.id },
      data: { tradeName: companyTradeName, legalName: companyLegalName, industry: companyIndustry }
    });
  } else {
    company = await prisma.company.create({
      data: {
        tenantId: tenant.id,
        tradeName: companyTradeName,
        legalName: companyLegalName,
        industry: companyIndustry,
        phone: "+5511999990000"
      }
    });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      tenantId: tenant.id,
      companyId: company.id,
      fullName,
      role: UserRole.owner,
      passwordHash,
      isActive: true
    },
    create: {
      tenantId: tenant.id,
      companyId: company.id,
      email,
      fullName,
      role: UserRole.owner,
      passwordHash,
      isActive: true
    }
  });

  const plans = [
    { code: "starter", name: "Starter", monthlyPrice: 97, maxUsers: 2, maxLeadsPerMonth: 500 },
    { code: "pro", name: "Pro", monthlyPrice: 197, maxUsers: 8, maxLeadsPerMonth: 5000 },
    { code: "scale", name: "Scale", monthlyPrice: 497, maxUsers: 25, maxLeadsPerMonth: 50000 },
    { code: "whitelabel", name: "White-label", monthlyPrice: 1497, maxUsers: 100, maxLeadsPerMonth: 999999 }
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        monthlyPrice: p.monthlyPrice,
        maxUsers: p.maxUsers,
        maxLeadsPerMonth: p.maxLeadsPerMonth,
        features: { whatsapp: true, crm: true, automations: p.code !== "starter" }
      },
      create: {
        code: p.code,
        name: p.name,
        monthlyPrice: p.monthlyPrice,
        setupFee: p.code === "whitelabel" ? 5000 : 0,
        maxUsers: p.maxUsers,
        maxLeadsPerMonth: p.maxLeadsPerMonth,
        features: { whatsapp: true, crm: true, automations: p.code !== "starter" }
      }
    });
  }

  const proPlan = await prisma.plan.findUniqueOrThrow({ where: { code: "pro" } });
  const existingSub = await prisma.subscription.findFirst({ where: { tenantId: tenant.id } });
  if (!existingSub) {
    await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        companyId: company.id,
        planId: proPlan.id,
        status: "active",
        startedAt: new Date(),
        trialEndsAt: null,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
  }

  let pipeline = await prisma.pipeline.findFirst({
    where: { tenantId: tenant.id, isDefault: true },
    include: { stages: { orderBy: { order: "asc" } } }
  });

  if (!pipeline) {
    pipeline = await prisma.pipeline.create({
      data: {
        tenantId: tenant.id,
        name: "Comercial",
        isDefault: true,
        stages: {
          create: [
            { tenantId: tenant.id, name: "Novo", order: 0, color: "#3b82f6" },
            { tenantId: tenant.id, name: "Qualificado", order: 1, color: "#8b5cf6" },
            { tenantId: tenant.id, name: "Proposta", order: 2, color: "#f59e0b" },
            { tenantId: tenant.id, name: "Negociacao", order: 3, color: "#f97316" },
            { tenantId: tenant.id, name: "Ganho", order: 4, color: "#22c55e", isWon: true },
            { tenantId: tenant.id, name: "Perdido", order: 5, color: "#ef4444", isLost: true }
          ]
        }
      },
      include: { stages: { orderBy: { order: "asc" } } }
    });
  }

  const stageMap: Record<LeadStage, string | undefined> = {
    new: pipeline.stages.find((s) => s.order === 0)?.id,
    qualified: pipeline.stages.find((s) => s.order === 1)?.id,
    proposal_sent: pipeline.stages.find((s) => s.order === 2)?.id,
    negotiation: pipeline.stages.find((s) => s.order === 3)?.id,
    won: pipeline.stages.find((s) => s.isWon)?.id,
    lost: pipeline.stages.find((s) => s.isLost)?.id
  };

  const leadCount = await prisma.lead.count({ where: { tenantId: tenant.id } });
  if (leadCount === 0) {
    const leadsData = [
      { name: "Joao - CFTV Residencial", stage: LeadStage.new, tags: ["cftv", "whatsapp"], source: "whatsapp", score: 72 },
      { name: "Maria - Oficina Mecanica", stage: LeadStage.qualified, tags: ["oficina"], source: "indicacao", score: 85 },
      { name: "Clinica Sorriso", stage: LeadStage.proposal_sent, tags: ["clinica"], source: "instagram", score: 90 },
      { name: "Tech Assist - Notebook", stage: LeadStage.negotiation, tags: ["assistencia"], source: "google", score: 78 },
      { name: "Predio Alpha - Manutencao", stage: LeadStage.won, tags: ["cftv", "b2b"], source: "whatsapp", score: 95 },
      { name: "Lead frio - sem resposta", stage: LeadStage.lost, tags: ["recuperacao"], source: "site", score: 20 }
    ];

    for (const l of leadsData) {
      const lead = await prisma.lead.create({
        data: {
          tenantId: tenant.id,
          companyId: company.id,
          ownerUserId: user.id,
          name: l.name,
          stage: l.stage,
          stageId: stageMap[l.stage],
          pipelineId: pipeline.id,
          tags: l.tags,
          source: l.source,
          score: l.score,
          phone: "+55119" + String(Math.floor(10000000 + Math.random() * 89999999)),
          lastInteractionAt: new Date()
        }
      });

      await prisma.leadHistory.create({
        data: {
          tenantId: tenant.id,
          leadId: lead.id,
          kind: "created",
          payload: { source: l.source }
        }
      });

      const conv = await prisma.conversation.create({
        data: {
          tenantId: tenant.id,
          leadId: lead.id,
          channel: "whatsapp",
          externalRef: `wa_${lead.id.slice(-8)}`,
          isAiAssisted: true,
          lastMessageAt: new Date()
        }
      });

      const msgs = [
        { direction: "inbound", body: `Ola, vi o anuncio. Preciso de orcamento para ${l.name.split(" - ")[0]}.` },
        { direction: "outbound", body: "Ola! Obrigado pelo contato. Em quanto tempo precisa do servico?" },
        { direction: "inbound", body: "O mais rapido possivel, pode mandar valores?" }
      ];

      for (const m of msgs) {
        await prisma.message.create({
          data: {
            tenantId: tenant.id,
            conversationId: conv.id,
            direction: m.direction,
            body: m.body
          }
        });
      }

      if (l.stage === LeadStage.proposal_sent || l.stage === LeadStage.negotiation || l.stage === LeadStage.won) {
        const quote = await prisma.quote.create({
          data: {
            tenantId: tenant.id,
            leadId: lead.id,
            number: `ORC-${lead.id.slice(-6).toUpperCase()}`,
            status: l.stage === LeadStage.won ? QuoteStatus.approved : QuoteStatus.sent,
            subtotal: 2500,
            discount: 0,
            total: 2500,
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            items: [{ name: "Servico principal", qty: 1, unitPrice: 2500 }],
            approvedAt: l.stage === LeadStage.won ? new Date() : null
          }
        });

        if (l.stage === LeadStage.won) {
          await prisma.payment.create({
            data: {
              tenantId: tenant.id,
              quoteId: quote.id,
              provider: "pix",
              amount: 2500,
              status: PaymentStatus.paid,
              paidAt: new Date()
            }
          });
        }
      }
    }
  }

  const automationCount = await prisma.automation.count({
    where: { tenantId: tenant.id, name: "Follow-up D+1" }
  });
  if (automationCount === 0) {
    await prisma.automation.create({
      data: {
        tenantId: tenant.id,
        name: "Follow-up D+1",
        triggerType: "schedule",
        status: "active",
        config: { playbook: "followup_d1", afterHours: 24, cron: "0 * * * *" }
      }
    });
  }

  const d7Count = await prisma.automation.count({
    where: { tenantId: tenant.id, name: "Reativacao D+7" }
  });
  if (d7Count === 0) {
    await prisma.automation.create({
      data: {
        tenantId: tenant.id,
        name: "Reativacao D+7",
        triggerType: "schedule",
        status: "active",
        config: { playbook: "followup_d7", afterDays: 7, cron: "0 9 * * *" }
      }
    });
  }

  const demoStaleLead = await prisma.lead.findFirst({
    where: {
      tenantId: tenant.id,
      stage: { notIn: [LeadStage.won, LeadStage.lost] }
    },
    orderBy: { createdAt: "asc" }
  });
  if (demoStaleLead) {
    await prisma.leadHistory.deleteMany({
      where: { leadId: demoStaleLead.id, kind: "followup_d1_sent" }
    });
    await prisma.lead.update({
      where: { id: demoStaleLead.id },
      data: {
        lastInteractionAt: new Date(Date.now() - 26 * 60 * 60 * 1000)
      }
    });
  }

  const ruleCount = await prisma.alertRule.count({ where: { tenantId: tenant.id } });
  if (ruleCount === 0) {
    const rule = await prisma.alertRule.create({
      data: {
        tenantId: tenant.id,
        name: "Lead sem resposta > 24h",
        severity: "warning",
        condition: { type: "lead_stale", hours: 24 },
        channels: ["in_app"],
        throttleMs: 300_000
      }
    });

    await prisma.alertIncident.create({
      data: {
        tenantId: tenant.id,
        ruleId: rule.id,
        fingerprint: "demo:stale-lead-1",
        severity: "warning",
        title: "3 leads sem follow-up nas ultimas 24h",
        description: "Priorize contato via WhatsApp para recuperar conversao.",
        status: "open",
        payload: { count: 3 }
      }
    });
  }

  const convCount = await prisma.conversation.count({ where: { tenantId: tenant.id } });
  if (convCount === 0) {
    const leads = await prisma.lead.findMany({ where: { tenantId: tenant.id }, take: 6 });
    for (const lead of leads) {
      const conv = await prisma.conversation.create({
        data: {
          tenantId: tenant.id,
          leadId: lead.id,
          channel: "whatsapp",
          isAiAssisted: true,
          lastMessageAt: new Date()
        }
      });
      await prisma.message.createMany({
        data: [
          { tenantId: tenant.id, conversationId: conv.id, direction: "inbound", body: `Ola, preciso de orcamento - ${lead.name}` },
          { tenantId: tenant.id, conversationId: conv.id, direction: "outbound", body: "Obrigado! Retorno em instantes." }
        ]
      });
    }
  }

  const overdueCount = await prisma.payment.count({
    where: { tenantId: tenant.id, status: PaymentStatus.overdue }
  });
  if (overdueCount === 0) {
    await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        provider: "pix",
        amount: 890,
        status: PaymentStatus.overdue,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    });
  }

  const wa = await prisma.whatsappAccount.findFirst({ where: { tenantId: tenant.id } });
  if (!wa) {
    await prisma.whatsappAccount.create({
      data: {
        tenantId: tenant.id,
        provider: "meta_cloud",
        name: "WhatsApp Demo",
        status: "active",
        config: { mode: "sandbox" }
      }
    });
  }

  await prisma.tenantBranding.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      brandName: tenantName,
      primaryColor: "#2563eb",
      isWhiteLabel: false
    },
    update: { brandName: tenantName }
  });

  const templates = [
    { slug: "cftv-pipeline-pro", name: "Pipeline CFTV Pro", niche: "cftv", kind: "pipeline", price: 0 },
    { slug: "oficina-followup", name: "Follow-up Oficina 7/14/30", niche: "oficina", kind: "automation", price: 49 },
    { slug: "clinica-pos-venda", name: "Pos-venda Clinica", niche: "clinica", kind: "postsale", price: 79 },
    { slug: "barbearia-growth", name: "Barbearia Growth", niche: "barbearia", kind: "bundle", price: 39 },
    { slug: "solar-proposta", name: "Solar Proposta", niche: "solar", kind: "pipeline", price: 0 },
    { slug: "delivery-reativacao", name: "Delivery Reativacao", niche: "delivery", kind: "postsale", price: 29 }
  ];
  for (const t of templates) {
    await prisma.marketplaceTemplate.upsert({
      where: { slug: t.slug },
      create: {
        slug: t.slug,
        name: t.name,
        niche: t.niche,
        kind: t.kind,
        price: t.price,
        definition: { version: 1, steps: [] }
      },
      update: { name: t.name }
    });
  }

  const campaignCount = await prisma.postSaleCampaign.count({ where: { tenantId: tenant.id } });
  if (campaignCount === 0) {
    await prisma.postSaleCampaign.create({
      data: {
        tenantId: tenant.id,
        name: "Reativacao 7/14/30",
        type: "reactivation",
        config: { channels: ["whatsapp"], discountPercent: 5 }
      }
    });
  }

  console.log("Seed concluido:");
  console.log({ tenantSlug, email, password, userId: user.id, tenantId: tenant.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
