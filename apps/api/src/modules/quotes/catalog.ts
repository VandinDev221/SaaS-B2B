export type CatalogItem = {
  sku: string;
  name: string;
  description: string;
  unitPrice: number;
  unit: string;
};

export const NICHE_CATALOGS: Record<string, CatalogItem[]> = {
  cftv: [
    { sku: "cftv-inst", name: "Instalação CFTV (até 4 câmeras)", description: "Instalação completa com cabeamento", unitPrice: 890, unit: "servico" },
    { sku: "cftv-cam", name: "Câmera IP Full HD", description: "Câmera com visão noturna", unitPrice: 320, unit: "un" },
    { sku: "cftv-dvr", name: "Gravador NVR 8 canais", description: "Gravador com app mobile", unitPrice: 650, unit: "un" },
    { sku: "cftv-manut", name: "Manutenção mensal", description: "Preventiva + suporte remoto", unitPrice: 149, unit: "mes" }
  ],
  oficina: [
    { sku: "of-rev", name: "Revisão completa", description: "Óleo, filtros e checklist 40 itens", unitPrice: 280, unit: "servico" },
    { sku: "of-alinh", name: "Alinhamento e balanceamento", description: "Equipamento digital", unitPrice: 120, unit: "servico" },
    { sku: "of-freio", name: "Troca pastilhas dianteiras", description: "Peças + mão de obra", unitPrice: 350, unit: "servico" }
  ],
  clinica: [
    { sku: "cl-cons", name: "Consulta especializada", description: "Avaliação inicial 50min", unitPrice: 220, unit: "sessao" },
    { sku: "cl-limpeza", name: "Limpeza e profilaxia", description: "Procedimento preventivo", unitPrice: 180, unit: "sessao" },
    { sku: "cl-clarear", name: "Clareamento dental", description: "Kit consultório", unitPrice: 890, unit: "tratamento" }
  ],
  assistencia: [
    { sku: "as-diag", name: "Diagnóstico técnico", description: "Análise + laudo", unitPrice: 80, unit: "servico" },
    { sku: "as-tela", name: "Troca de tela smartphone", description: "Peça premium + garantia 90d", unitPrice: 290, unit: "servico" },
    { sku: "as-bat", name: "Troca de bateria", description: "Bateria original ou compatível", unitPrice: 150, unit: "servico" }
  ],
  services: [
    { sku: "sv-visita", name: "Visita técnica", description: "Deslocamento + avaliação", unitPrice: 120, unit: "visita" },
    { sku: "sv-hora", name: "Hora técnica", description: "Serviço por hora", unitPrice: 95, unit: "hora" },
    { sku: "sv-contrato", name: "Contrato mensal suporte", description: "SLA 24h úteis", unitPrice: 497, unit: "mes" }
  ],
  barbearia: [
    { sku: "bb-corte", name: "Corte masculino", description: "Corte + finalização", unitPrice: 55, unit: "servico" },
    { sku: "bb-barba", name: "Barba completa", description: "Toalha quente + navalha", unitPrice: 40, unit: "servico" },
    { sku: "bb-combo", name: "Combo corte + barba", description: "Pacote completo", unitPrice: 85, unit: "servico" },
    { sku: "bb-plano", name: "Plano mensal 4 cortes", description: "Assinatura barbearia", unitPrice: 180, unit: "mes" }
  ],
  estetica: [
    { sku: "es-limpeza", name: "Limpeza de pele", description: "Protocolo facial 60min", unitPrice: 190, unit: "sessao" },
    { sku: "es-design", name: "Design de sobrancelha", description: "Henna ou pinça", unitPrice: 65, unit: "sessao" },
    { sku: "es-botox", name: "Botox facial", description: "Avaliação + aplicação", unitPrice: 890, unit: "procedimento" }
  ],
  petshop: [
    { sku: "pt-banho-p", name: "Banho porte pequeno", description: "Banho + secagem + perfume", unitPrice: 55, unit: "servico" },
    { sku: "pt-banho-g", name: "Banho porte grande", description: "Banho completo", unitPrice: 85, unit: "servico" },
    { sku: "pt-hotel", name: "Hotel 24h (diária)", description: "Hospedagem com monitoramento", unitPrice: 75, unit: "dia" }
  ],
  imobiliaria: [
    { sku: "im-capt", name: "Captação de imóvel", description: "Fotos + anúncio + divulgação", unitPrice: 0, unit: "comissao" },
    { sku: "im-admin", name: "Administração mensal", description: "Aluguel + repasses", unitPrice: 8, unit: "%" },
    { sku: "im-vistoria", name: "Vistoria de entrada/saída", description: "Laudo digital", unitPrice: 250, unit: "servico" }
  ],
  escola: [
    { sku: "ed-matricula", name: "Matrícula anual", description: "Taxa de matrícula", unitPrice: 450, unit: "ano" },
    { sku: "ed-mensal", name: "Mensalidade", description: "Plano regular", unitPrice: 680, unit: "mes" },
    { sku: "ed-reforco", name: "Reforço escolar", description: "2x por semana", unitPrice: 320, unit: "mes" }
  ],
  delivery: [
    { sku: "dl-combo", name: "Combo família", description: "2 pizzas + refrigerante", unitPrice: 89.9, unit: "combo" },
    { sku: "dl-taxa", name: "Taxa de entrega", description: "Raio até 5km", unitPrice: 8, unit: "entrega" },
    { sku: "dl-assin", name: "Clube de benefícios", description: "Frete grátis + descontos", unitPrice: 19.9, unit: "mes" }
  ],
  solar: [
    { sku: "so-proj", name: "Projeto fotovoltaico 4kWp", description: "Dimensionamento + homologação", unitPrice: 18500, unit: "kit" },
    { sku: "so-inst", name: "Instalação solar", description: "Mão de obra + comissionamento", unitPrice: 3200, unit: "servico" },
    { sku: "so-manut", name: "Manutenção anual", description: "Limpeza + inspeção", unitPrice: 490, unit: "ano" }
  ],
  contabilidade: [
    { sku: "ct-me", name: "Contabilidade MEI", description: "DAS + obrigações", unitPrice: 149, unit: "mes" },
    { sku: "ct-simples", name: "Contabilidade Simples", description: "Folha + fiscal", unitPrice: 397, unit: "mes" },
    { sku: "ct-abertura", name: "Abertura de empresa", description: "CNPJ + alvarás", unitPrice: 890, unit: "servico" }
  ],
  academia: [
    { sku: "ac-mensal", name: "Plano mensal", description: "Musculação + aulas coletivas", unitPrice: 129, unit: "mes" },
    { sku: "ac-trim", name: "Plano trimestral", description: "12 semanas", unitPrice: 329, unit: "trimestre" },
    { sku: "ac-avaliacao", name: "Avaliação física", description: "Bioimpedância + plano", unitPrice: 80, unit: "sessao" }
  ],
  restaurante: [
    { sku: "rs-evento", name: "Evento corporativo", description: "Coffee break 50 pessoas", unitPrice: 2800, unit: "evento" },
    { sku: "rs-reserva", name: "Reserva de salão", description: "Mesa para 10 pessoas", unitPrice: 0, unit: "reserva" },
    { sku: "rs-delivery", name: "Pedido delivery", description: "Cardápio digital integrado", unitPrice: 0, unit: "pedido" }
  ]
};

export const SUPPORTED_NICHES = Object.keys(NICHE_CATALOGS);

export function getCatalog(niche: string): CatalogItem[] {
  return NICHE_CATALOGS[niche] ?? NICHE_CATALOGS.services;
}
