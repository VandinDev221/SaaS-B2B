import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, from?: Date, to?: Date) {
    return this.prisma.appointment.findMany({
      where: {
        tenantId,
        ...(from || to
          ? {
              startsAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {})
              }
            }
          : {})
      },
      orderBy: { startsAt: "asc" },
      include: { lead: { select: { id: true, name: true, phone: true } } },
      take: 100
    });
  }

  create(
    tenantId: string,
    input: {
      leadId?: string;
      title: string;
      description?: string;
      location?: string;
      startsAt: string;
      endsAt: string;
    }
  ) {
    return this.prisma.appointment.create({
      data: {
        tenantId,
        leadId: input.leadId,
        title: input.title,
        description: input.description,
        location: input.location,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        reminderAt: new Date(new Date(input.startsAt).getTime() - 60 * 60 * 1000)
      },
      include: { lead: true }
    });
  }

  async cancel(tenantId: string, id: string) {
    const appt = await this.prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!appt) throw new NotFoundException("Agendamento nao encontrado");
    return this.prisma.appointment.update({
      where: { id },
      data: { status: "canceled" }
    });
  }
}
