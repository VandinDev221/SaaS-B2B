const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  const hours = Number(process.env.FOLLOWUP_D1_AFTER_HOURS || 24);
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const leads = await prisma.lead.findMany({
    select: { id: true, name: true, stage: true, lastInteractionAt: true, createdAt: true }
  });

  console.log(`Cutoff (${hours}h): ${cutoff.toISOString()}\n`);

  for (const lead of leads) {
    const stale =
      lead.stage !== "won" &&
      lead.stage !== "lost" &&
      (lead.lastInteractionAt ? lead.lastInteractionAt < cutoff : lead.createdAt < cutoff);

    const recentFollowup = await prisma.leadHistory.count({
      where: {
        leadId: lead.id,
        kind: "followup_d1_sent",
        createdAt: { gte: cutoff }
      }
    });

    const eligible = stale && recentFollowup === 0;
    console.log(
      `${eligible ? "[ELEGIVEL]" : "[     ]"} ${lead.name}`,
      `| ${lead.stage}`,
      `| ultima: ${(lead.lastInteractionAt || lead.createdAt).toISOString()}`,
      `| followups 24h: ${recentFollowup}`
    );
    if (eligible) console.log(`         id: ${lead.id}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
