import type { Locale } from '@/i18n/shared';

export interface LandingCopy {
  nav: {
    vision: string;
    product: string;
    benefits: string;
    contact: string;
    requestDemo: string;
  };
  hero: {
    line1: string;
    line2: string;
    scrollLabel: string;
  };
  vision: {
    before: string;
    highlight: string;
    after: string;
  };
  carousel: {
    cards: { label: string; description: string }[];
  };
  productReveal: {
    pre: string;
    main: string;
  };
  benefits: {
    items: { number: string; title: string; description: string }[];
  };
  socialProof: {
    tag: string;
    heading: string;
    subheading: string;
  };
  testimonial: {
    quote: string;
    author: string;
    role: string;
  };
  trustedBy: {
    tag: string;
    heading: string;
  };
  howItWorks: {
    tag: string;
    heading: string;
    cta: string;
  };
  contact: {
    heading: string;
    subtitle: string;
    listItems: string[];
    form: {
      name: string;
      email: string;
      organization: string;
      role: string;
      roleOptions: string[];
      message: string;
      submit: string;
      success: string;
    };
  };
  footerCta: {
    heading: string;
    cta: string;
  };
  footer: {
    product: string;
    productLinks: { label: string; href: string }[];
    company: string;
    companyLinks: { label: string; href: string }[];
    legal: string;
    legalLinks: { label: string; href: string }[];
    resources: string;
    resourceLinks: { label: string; href: string }[];
    rights: string;
    tagline: string;
  };
}

const en: LandingCopy = {
  nav: {
    vision: 'The Problem',
    product: 'Product',
    benefits: 'For Hospitals',
    contact: 'Contact',
    requestDemo: 'Book a pilot call',
  },
  hero: {
    line1: 'The clinical AI built for Latin American hospitals.',
    line2: 'In Portuguese, Spanish, and on your infrastructure.',
    scrollLabel: 'LGPD-NATIVE · ANVISA CLASS I · HIPAA-READY · FHIR R4',
  },
  vision: {
    before: 'Clinicians across our region spend nearly ',
    highlight: '6 hours in the EHR',
    after: ' for every 8 hours of patient time. LATAM hospitals carry the same documentation load as the US — without the budgets, without the vendors, and without tools built for Portuguese or Spanish. (Source: AMA, CHIME 2025.)',
  },
  carousel: {
    cards: [
      { label: 'Ambient clinical notes', description: 'SOAP, evolution, and discharge notes generated live during the encounter in Portuguese or Spanish. Clinicians review, they never type.' },
      { label: 'Designed to give evenings back', description: 'Targeting the AMA ambient-AI benchmark of ~1 hour a day back per clinician. Measured per specialty, per site, in your own dashboard.' },
      { label: 'Billing that closes the loop', description: 'Native TUSS, CUPS, RIPS, DIAN, and CIE-10. Notes become billable claims without a second system and without a second vendor.' },
      { label: 'LGPD-native, not retrofit', description: 'Field-level encryption, hash-chained audit log, right-to-erasure built into the schema — not a ticket your team has to write every quarter.' },
      { label: 'Runs in your infrastructure', description: 'Deploy on your cloud account or on-prem. No patient data leaves your boundary without your signed approval.' },
      { label: 'Deterministic clinical decisions', description: 'ANVISA Class I path. Our CDS engine is JSON-Logic — auditable, reproducible, and never a black box to your legal or compliance team.' },
    ],
  },
  productReveal: {
    pre: 'Meet',
    main: 'the LATAM Clinical OS.',
  },
  benefits: {
    items: [
      { number: '01', title: 'For the Chief Medical Officer', description: 'Clinician burnout is a retention problem. Holi Labs is designed to give doctors meaningful time back on documentation — measurable per-site and per-specialty, in your dashboard from week one.' },
      { number: '02', title: 'For the Chief Financial Officer', description: 'Notes that never made it into TUSS, CUPS, or RIPS are revenue you already earned and never billed. We close the loop between the encounter and the claim, and we show you the recovery in your dashboard.' },
      { number: '03', title: 'For the Chief Information Officer', description: 'LGPD-native. ANVISA Class I. HIPAA-ready. FHIR R4. Deploys inside your infrastructure. One integration, one audit trail, one vendor on the contract.' },
    ],
  },
  socialProof: {
    tag: 'BUILT BY LATAM CLINICIANS',
    heading: 'Designed with practicing physicians across Brazil, Mexico, and Colombia.',
    subheading: 'Every clinical feature is validated by MDs working in the public and private systems we serve. Our clinical decision logic is reviewed by an independent safety board before it ships.',
  },
  testimonial: {
    quote: 'LATAM hospitals do not need another English product with a translation layer. They need clinical AI that thinks in Portuguese, deploys in their infrastructure, and answers to their regulators. That is what we are building.',
    author: 'Nicola Capriolo Teran',
    role: 'Founder, Holi Labs',
  },
  trustedBy: {
    tag: 'LATAM HEALTHCARE',
    heading: 'Running pilots with clinics and hospitals in Brazil, Mexico, and Colombia.',
  },
  howItWorks: {
    tag: 'HOW A PILOT WORKS',
    heading: 'Three phases. Scoped to your hospital. No multi-year rollout — this is a pilot, not an Epic replatform.',
    cta: 'Book a pilot call',
  },
  contact: {
    heading: 'Let us run the numbers for your hospital.',
    subtitle: 'Twenty minutes. We will show you a working demo in Portuguese or Spanish, walk through the compliance posture for your legal team, and build a custom hours-saved projection for your site.',
    listItems: [
      'Live demo in your language',
      'Hours-saved projection for your clinicians',
      'Revenue recovery estimate for your billing codes',
      'Security and compliance brief for your legal team',
    ],
    form: {
      name: 'Full Name',
      email: 'Work Email',
      organization: 'Hospital or Clinic',
      role: 'Your Role',
      roleOptions: [
        'Chief Medical Officer',
        'Chief Information Officer',
        'Chief Financial Officer',
        'Physician',
        'Clinic Administrator',
        'Revenue Cycle Lead',
        'Other',
      ],
      message: 'Tell us about your needs',
      submit: 'Book the call',
      success: 'Thank you. We will reply within one business day.',
    },
  },
  footerCta: {
    heading: 'Clinical AI built for Latin American hospitals. Let us run a pilot.',
    cta: 'Book a pilot call',
  },
  footer: {
    product: 'Product',
    productLinks: [
      { label: 'Ambient Documentation', href: '#product' },
      { label: 'Billing & Revenue', href: '#benefits' },
      { label: 'Compliance', href: '#benefits' },
      { label: 'Book a Pilot', href: '#contact' },
    ],
    company: 'Company',
    companyLinks: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '#contact' },
    ],
    legal: 'Legal',
    legalLinks: [
      { label: 'Terms of Service', href: '/legal/terms-of-service' },
      { label: 'Privacy Policy', href: '/legal/privacy-policy' },
      { label: 'HIPAA Notice', href: '/legal/hipaa-notice' },
      { label: 'LGPD Compliance', href: '/legal/lgpd' },
    ],
    resources: 'Resources',
    resourceLinks: [
      { label: 'Documentation', href: '/docs' },
      { label: 'API Reference', href: '/docs/api' },
      { label: 'Status', href: '/status' },
      { label: 'Security', href: '/security' },
    ],
    rights: '2026 Holi Labs. All rights reserved.',
    tagline: 'Sovereign clinical AI for Latin American hospitals.',
  },
};

const es: LandingCopy = {
  nav: {
    vision: 'El Problema',
    product: 'Producto',
    benefits: 'Para Hospitales',
    contact: 'Contacto',
    requestDemo: 'Agenda una llamada',
  },
  hero: {
    line1: 'La IA clínica construida para hospitales de América Latina.',
    line2: 'En portugués, en español, y sobre tu propia infraestructura.',
    scrollLabel: 'LGPD NATIVA · ANVISA CLASE I · LISTO PARA HIPAA · FHIR R4',
  },
  vision: {
    before: 'Los médicos de nuestra región pasan casi ',
    highlight: '6 horas en el EHR',
    after: ' por cada 8 horas con pacientes. Los hospitales latinoamericanos cargan con la misma deuda de documentación que los estadounidenses — sin los presupuestos, sin los proveedores y sin herramientas diseñadas para el portugués o el español. (Fuente: AMA, CHIME 2025.)',
  },
  carousel: {
    cards: [
      { label: 'Notas clínicas ambientales', description: 'Notas SOAP, evolución y egreso generadas en vivo durante la consulta, en portugués o español. El médico revisa, no escribe.' },
      { label: 'Diseñado para devolver tus tardes', description: 'Apuntamos al benchmark de la AMA de ~1 hora diaria recuperada por médico. Medido por especialidad, por sede, en tu propio tablero.' },
      { label: 'Facturación que cierra el ciclo', description: 'TUSS, CUPS, RIPS, DIAN y CIE-10 nativos. Las notas se convierten en reclamaciones facturables sin un segundo sistema y sin un segundo proveedor.' },
      { label: 'LGPD nativa, no remendada', description: 'Cifrado a nivel de campo, bitácora de auditoría encadenada por hash, derecho de borrado integrado en el esquema — no un ticket que tu equipo tenga que abrir cada trimestre.' },
      { label: 'Corre en tu infraestructura', description: 'Despliegue en tu cuenta cloud o en tus servidores. Ningún dato de paciente sale de tu perímetro sin tu aprobación firmada.' },
      { label: 'Decisiones clínicas deterministas', description: 'Camino ANVISA Clase I. Nuestro motor de decisiones clínicas es JSON-Logic — auditable, reproducible y nunca una caja negra frente a tu equipo legal o de cumplimiento.' },
    ],
  },
  productReveal: {
    pre: 'Conoce',
    main: 'el Sistema Operativo Clínico de LATAM.',
  },
  benefits: {
    items: [
      { number: '01', title: 'Para el Director Médico', description: 'El burnout clínico es un problema de retención. Holi Labs está diseñado para devolver a los médicos tiempo significativo en documentación — medible por sede y por especialidad, en tu tablero desde la primera semana.' },
      { number: '02', title: 'Para el Director Financiero', description: 'Las notas que nunca llegaron a TUSS, CUPS o RIPS son ingresos que ya ganaste y nunca cobraste. Cerramos el ciclo entre la consulta y la facturación, y te mostramos la recuperación en tu tablero.' },
      { number: '03', title: 'Para el Director de TI', description: 'LGPD nativa. ANVISA Clase I. Listo para HIPAA. FHIR R4. Se despliega dentro de tu infraestructura. Una integración, una bitácora de auditoría, un proveedor en el contrato.' },
    ],
  },
  socialProof: {
    tag: 'CONSTRUIDO POR MÉDICOS DE LATAM',
    heading: 'Diseñado con médicos en activo de Brasil, México y Colombia.',
    subheading: 'Cada función clínica está validada por médicos que trabajan en los sistemas públicos y privados a los que servimos. Nuestra lógica de decisión clínica es revisada por un comité independiente de seguridad antes de salir a producción.',
  },
  testimonial: {
    quote: 'Los hospitales de América Latina no necesitan otro producto en inglés con una capa de traducción. Necesitan una IA clínica que piense en portugués, que se despliegue en su propia infraestructura y que responda ante sus reguladores. Eso es lo que estamos construyendo.',
    author: 'Nicola Capriolo Teran',
    role: 'Fundador, Holi Labs',
  },
  trustedBy: {
    tag: 'SALUD LATINOAMERICANA',
    heading: 'Ejecutando pilotos con clínicas y hospitales en Brasil, México y Colombia.',
  },
  howItWorks: {
    tag: 'CÓMO FUNCIONA UN PILOTO',
    heading: 'Tres fases. Ajustado a tu hospital. Sin despliegues de varios años — esto es un piloto, no un reemplazo de Epic.',
    cta: 'Agenda una llamada',
  },
  contact: {
    heading: 'Hagamos los números para tu hospital.',
    subtitle: 'Veinte minutos. Te mostramos una demo en vivo en portugués o en español, repasamos la postura de cumplimiento para tu equipo legal y construimos una proyección personalizada de horas recuperadas para tu sede.',
    listItems: [
      'Demo en vivo en tu idioma',
      'Proyección de horas recuperadas para tus médicos',
      'Estimación de recuperación de ingresos para tus códigos de facturación',
      'Informe de seguridad y cumplimiento para tu equipo legal',
    ],
    form: {
      name: 'Nombre Completo',
      email: 'Correo de Trabajo',
      organization: 'Hospital o Clínica',
      role: 'Tu Rol',
      roleOptions: [
        'Director Médico',
        'Director de TI',
        'Director Financiero',
        'Médico',
        'Administrador de Clínica',
        'Líder de Ciclo de Ingresos',
        'Otro',
      ],
      message: 'Cuéntanos sobre tus necesidades',
      submit: 'Agendar la llamada',
      success: 'Gracias. Te responderemos en un día hábil.',
    },
  },
  footerCta: {
    heading: 'IA clínica construida para hospitales de América Latina. Hagamos un piloto.',
    cta: 'Agenda una llamada',
  },
  footer: {
    product: 'Producto',
    productLinks: [
      { label: 'Documentación Ambiental', href: '#product' },
      { label: 'Facturación e Ingresos', href: '#benefits' },
      { label: 'Cumplimiento', href: '#benefits' },
      { label: 'Agendar un Piloto', href: '#contact' },
    ],
    company: 'Empresa',
    companyLinks: [
      { label: 'Acerca de', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Carreras', href: '/careers' },
      { label: 'Contacto', href: '#contact' },
    ],
    legal: 'Legal',
    legalLinks: [
      { label: 'Términos de Servicio', href: '/legal/terms-of-service' },
      { label: 'Política de Privacidad', href: '/legal/privacy-policy' },
      { label: 'Aviso HIPAA', href: '/legal/hipaa-notice' },
      { label: 'Cumplimiento LGPD', href: '/legal/lgpd' },
    ],
    resources: 'Recursos',
    resourceLinks: [
      { label: 'Documentación', href: '/docs' },
      { label: 'Referencia API', href: '/docs/api' },
      { label: 'Estado', href: '/status' },
      { label: 'Seguridad', href: '/security' },
    ],
    rights: '2026 Holi Labs. Todos los derechos reservados.',
    tagline: 'IA clínica soberana para hospitales de América Latina.',
  },
};

const pt: LandingCopy = {
  nav: {
    vision: 'O Problema',
    product: 'Produto',
    benefits: 'Para Hospitais',
    contact: 'Contato',
    requestDemo: 'Agende um piloto',
  },
  hero: {
    line1: 'A IA clínica construída para hospitais da América Latina.',
    line2: 'Em português, em espanhol, e na sua própria infraestrutura.',
    scrollLabel: 'LGPD NATIVO · ANVISA CLASSE I · PRONTO PARA HIPAA · FHIR R4',
  },
  vision: {
    before: 'Os médicos da nossa região passam quase ',
    highlight: '6 horas no prontuário eletrônico',
    after: ' para cada 8 horas com pacientes. Os hospitais latino-americanos carregam a mesma dívida de documentação que os americanos — sem os mesmos orçamentos, sem os mesmos fornecedores e sem ferramentas feitas em português ou espanhol. (Fonte: AMA, CHIME 2025.)',
  },
  carousel: {
    cards: [
      { label: 'Notas clínicas ambientais', description: 'Notas SOAP, de evolução e de alta geradas ao vivo durante o atendimento, em português ou espanhol. O médico revisa, nunca digita.' },
      { label: 'Projetado para devolver suas noites', description: 'Miramos o benchmark da AMA de cerca de 1 hora por dia recuperada por médico. Medido por especialidade, por unidade, no seu próprio painel.' },
      { label: 'Faturamento que fecha o ciclo', description: 'TUSS, CUPS, RIPS, DIAN e CIE-10 nativos. Notas viram cobranças faturáveis sem um segundo sistema e sem um segundo fornecedor.' },
      { label: 'LGPD nativo, não remendado', description: 'Criptografia por campo, log de auditoria encadeado por hash, direito ao apagamento embutido no schema — não um chamado que sua equipe precise abrir todo trimestre.' },
      { label: 'Roda na sua infraestrutura', description: 'Implantação na sua conta cloud ou on-prem. Nenhum dado de paciente sai do seu perímetro sem sua aprovação assinada.' },
      { label: 'Decisões clínicas determinísticas', description: 'Rota ANVISA Classe I. Nosso motor de decisão clínica é JSON-Logic — auditável, reprodutível e nunca uma caixa-preta para sua equipe jurídica ou de compliance.' },
    ],
  },
  productReveal: {
    pre: 'Conheça',
    main: 'o Sistema Operacional Clínico da América Latina.',
  },
  benefits: {
    items: [
      { number: '01', title: 'Para o Diretor Médico', description: 'O burnout clínico é um problema de retenção. O Holi Labs foi projetado para devolver aos médicos um tempo significativo em documentação — medido por unidade e por especialidade, no seu painel a partir da primeira semana.' },
      { number: '02', title: 'Para o Diretor Financeiro', description: 'Notas que nunca chegaram ao TUSS, CUPS ou RIPS são receita que você já ganhou e nunca faturou. Fechamos o ciclo entre o atendimento e a cobrança, e mostramos a recuperação no seu painel.' },
      { number: '03', title: 'Para o Diretor de TI', description: 'LGPD nativo. ANVISA Classe I. Pronto para HIPAA. FHIR R4. Implantado dentro da sua infraestrutura. Uma integração, um log de auditoria, um fornecedor no contrato.' },
    ],
  },
  socialProof: {
    tag: 'CONSTRUÍDO POR MÉDICOS DA AMÉRICA LATINA',
    heading: 'Projetado com médicos em atividade no Brasil, México e Colômbia.',
    subheading: 'Cada funcionalidade clínica é validada por médicos atuantes nos sistemas públicos e privados que atendemos. Nossa lógica de decisão clínica é revisada por um comitê independente de segurança antes de entrar em produção.',
  },
  testimonial: {
    quote: 'Hospitais da América Latina não precisam de mais um produto em inglês com uma camada de tradução. Precisam de uma IA clínica que pense em português, que rode na sua própria infraestrutura e que responda aos seus reguladores. É isso que estamos construindo.',
    author: 'Nicola Capriolo Teran',
    role: 'Fundador, Holi Labs',
  },
  trustedBy: {
    tag: 'SAÚDE LATINO-AMERICANA',
    heading: 'Rodando pilotos com clínicas e hospitais no Brasil, México e Colômbia.',
  },
  howItWorks: {
    tag: 'COMO FUNCIONA UM PILOTO',
    heading: 'Três fases. Sob medida para o seu hospital. Sem implantações de anos — isso é um piloto, não uma troca de Epic.',
    cta: 'Agende um piloto',
  },
  contact: {
    heading: 'Vamos rodar os números para o seu hospital.',
    subtitle: 'Vinte minutos. Mostramos uma demo ao vivo em português ou espanhol, passamos pela postura de conformidade para a sua equipe jurídica e construímos uma projeção personalizada de horas recuperadas para a sua unidade.',
    listItems: [
      'Demo ao vivo no seu idioma',
      'Projeção de horas recuperadas para os seus médicos',
      'Estimativa de recuperação de receita para os seus códigos de faturamento',
      'Relatório de segurança e conformidade para a sua equipe jurídica',
    ],
    form: {
      name: 'Nome Completo',
      email: 'E-mail Profissional',
      organization: 'Hospital ou Clínica',
      role: 'Seu Cargo',
      roleOptions: [
        'Diretor Médico',
        'Diretor de TI',
        'Diretor Financeiro',
        'Médico',
        'Administrador de Clínica',
        'Líder de Ciclo de Receita',
        'Outro',
      ],
      message: 'Conte-nos sobre suas necessidades',
      submit: 'Agendar a chamada',
      success: 'Obrigado. Responderemos em um dia útil.',
    },
  },
  footerCta: {
    heading: 'IA clínica construída para hospitais da América Latina. Vamos fazer um piloto.',
    cta: 'Agende um piloto',
  },
  footer: {
    product: 'Produto',
    productLinks: [
      { label: 'Documentação Ambiental', href: '#product' },
      { label: 'Faturamento e Receita', href: '#benefits' },
      { label: 'Conformidade', href: '#benefits' },
      { label: 'Agendar um Piloto', href: '#contact' },
    ],
    company: 'Empresa',
    companyLinks: [
      { label: 'Sobre', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Carreiras', href: '/careers' },
      { label: 'Contato', href: '#contact' },
    ],
    legal: 'Legal',
    legalLinks: [
      { label: 'Termos de Serviço', href: '/legal/terms-of-service' },
      { label: 'Política de Privacidade', href: '/legal/privacy-policy' },
      { label: 'Aviso HIPAA', href: '/legal/hipaa-notice' },
      { label: 'Conformidade LGPD', href: '/legal/lgpd' },
    ],
    resources: 'Recursos',
    resourceLinks: [
      { label: 'Documentação', href: '/docs' },
      { label: 'Referência API', href: '/docs/api' },
      { label: 'Status', href: '/status' },
      { label: 'Segurança', href: '/security' },
    ],
    rights: '2026 Holi Labs. Todos os direitos reservados.',
    tagline: 'IA clínica soberana para hospitais da América Latina.',
  },
};

const copies: Record<Locale, LandingCopy> = { en, es, pt };

export function getLandingCopy(locale: Locale): LandingCopy {
  return copies[locale] ?? copies.en;
}
