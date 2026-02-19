import { type Locale } from '@/i18n/shared';

type LandingCopy = {
  a11y: { skipToMain: string };
  header: {
    productTag: string;
    howItWorks: string;
    audit: string;
    login: string;
    betaCta: string;
    betaShort: string;
  };
  hero: {
    badge: string;
    title: string;
    highlight: string;
    description: string;
    supportLine: string;
    primaryCta: string;
    primaryShort: string;
    secondaryCta: string;
    secondaryShort: string;
  };
  howItWorks: {
    kicker: string;
    title: string;
    subtitle: string;
    builtFor: string;
    cards: Array<{ title: string; body: string }>;
    note: string;
  };
  workflow: {
    progressLabel: string;
    progressDetail: string;
    smartContext: string;
    verify: string;
    document: string;
    statusDone: string;
    statusActive: string;
    statusQueued: string;
    ehrReady: string;
    expiresIn: string;
    contextBody: string;
    verifyBody: string;
    verifyHint: string;
    confirm: string;
    documentBody: string;
    toast: string;
    toastMobile: string;
  };
  architecture: {
    kicker: string;
    title: string;
    subtitle: string;
    cards: Array<{
      title: string;
      body: string;
      chipA: string;
      chipB: string;
    }>;
    interactionHint: string;
  };
  governance: {
    kicker: string;
    title: string;
    subtitle: string;
    cardOneTitle: string;
    cardOneBody: string;
    cardTwoTitle: string;
    cardTwoBody: string;
    errorsAvoided: string;
    complianceRate: string;
    weekDelta: string;
  };
  safety: {
    kicker: string;
    title: string;
    cards: Array<{
      title: string;
      body: string;
      bulletA: string;
      bulletB: string;
    }>;
  };
  demo: {
    title: string;
    subtitle: string;
    ctaClinic: string;
    ctaEnterprise: string;
    emailPlaceholder: string;
    requestCta: string;
    sending: string;
    inviteOnly: string;
    noIntegration: string;
    desktop: string;
    success: string;
    requestError: string;
    networkError: string;
  };
  footer: {
    product: string;
    company: string;
    legal: string;
    contact: string;
    howItWorks: string;
    modules: string;
    audit: string;
    requestAccess: string;
    about: string;
    blog: string;
    careers: string;
    contactLink: string;
    terms: string;
    privacy: string;
    hipaa: string;
    baa: string;
    consent: string;
    joinPilot: string;
    rights: string;
    encryption: string;
    auditTrails: string;
    accessControls: string;
  };
};

const landingCopy: Record<Locale, LandingCopy> = {
  en: {
    a11y: { skipToMain: 'Skip to main content' },
    header: {
      productTag: 'Cortex Pilot',
      howItWorks: 'How it works',
      audit: 'Audit',
      login: 'Sign in',
      betaCta: 'Start Free Beta',
      betaShort: 'Beta',
    },
    hero: {
      badge: 'Inpatient Cardiology Pilot',
      title: 'Cortex by Holi Labs.',
      highlight: 'Safeguard every decision.',
      description:
        'A premium clinical safety layer for teams that move fast. AI drafts context and documentation, while deterministic logic keeps high-risk moments transparent and auditable.',
      supportLine: 'Web-first for LATAM workflows, with an optional lightweight desktop companion.',
      primaryCta: 'For Private Practice: Start Free Beta',
      primaryShort: 'Start Free Beta',
      secondaryCta: 'For Enterprise: Request Cortex Pilot',
      secondaryShort: 'Request Pilot',
    },
    howItWorks: {
      kicker: 'How it works',
      title: 'AI pre-fills the safety check. You validate with one tap.',
      subtitle: 'Cortex analyzes the chart, drafts the logic path, and leaves the final sign-off to the clinician.',
      builtFor: 'Built for',
      cards: [
        {
          title: 'Clinicians',
          body: 'A fast, predictable workflow that reduces risk without creating alert fatigue.',
        },
        {
          title: 'Quality and leadership',
          body: 'Structured evidence of what was validated, what was overridden, and where protocol drift appears.',
        },
        {
          title: 'LATAM operations',
          body: 'Works with basic EHRs and messaging-first coordination without waiting for perfect integrations.',
        },
      ],
      note:
        'Cortex is a verification and documentation layer. Clinicians remain responsible for clinical decisions. Patient messaging is opt-in and should minimize sensitive content.',
    },
    workflow: {
      progressLabel: 'Verification flow progress',
      progressDetail: '{progress}% complete - 1 click left',
      smartContext: 'Smart Context',
      verify: 'Verify Considerations',
      document: 'Document and Coordinate',
      statusDone: 'Data ingested',
      statusActive: 'Awaiting verification',
      statusQueued: 'Ready when verified',
      ehrReady: 'EHR data ready',
      expiresIn: 'Expires in {seconds}s',
      contextBody: 'EHR data, labs, and medications are already extracted and normalized by AI.',
      verifyBody: 'Cortex drafted the logic checks. You confirm the rationale and complete sign-off.',
      verifyHint: 'Only one action remaining.',
      confirm: 'Confirm Rationale',
      documentBody: 'Audit note, documentation, and follow-up actions are queued automatically.',
      toast: 'Documentation generated - care team notified',
      toastMobile: 'Success!',
    },
    architecture: {
      kicker: 'Core architecture',
      title: 'Three modules. One coherent safety system.',
      subtitle: 'Select a tile to inspect how each module supports safer high-stakes workflows.',
      cards: [
        {
          title: 'The Checklist',
          body: 'A 30-second verification flow for DOAC safety and discharge. If key data is missing, Cortex requests attestation or manual input.',
          chipA: '30-second flow',
          chipB: 'No blind defaults',
        },
        {
          title: 'The Audit Console',
          body: 'Leadership gets a live governance view of validations, overrides, and protocol drift without retrospective chart review cycles.',
          chipA: 'Real-time governance',
          chipB: 'Override intelligence',
        },
        {
          title: 'The Follow-up',
          body: 'Close the post-discharge loop with structured reminders and adherence workflows, including WhatsApp where appropriate.',
          chipA: 'Structured reminders',
          chipB: 'Care-team escalation',
        },
      ],
      interactionHint: 'Tap or hover tiles to explore',
    },
    governance: {
      kicker: 'Governance',
      title: 'Protect high-risk decisions with transparent verification.',
      subtitle:
        'The Cortex audit console shows what was validated, what was overridden, and where protocols are drifting in real operations.',
      cardOneTitle: 'Outcome Dashboard',
      cardOneBody:
        'Track the operational and clinical outcomes that matter: checks completed, compliance trend, and avoided risk events.',
      cardTwoTitle: 'Deterministic Clinical Logic',
      cardTwoBody:
        'Configure safety guardrails per unit. When a clinician overrides, Cortex captures rationale for training and protocol improvement.',
      errorsAvoided: 'Risk events avoided',
      complianceRate: 'Compliance rate',
      weekDelta: '+27 this week',
    },
    safety: {
      kicker: 'Clinical safety infrastructure',
      title: 'Built for high-stakes moments across the care continuum.',
      cards: [
        {
          title: 'Revenue integrity at the source',
          body: 'Catch missing modifiers, documentation gaps, and protocol misses before chart close to reduce downstream denials.',
          bulletA: 'Deterministic checks with rationale',
          bulletB: 'Pre-close documentation safeguards',
        },
        {
          title: 'Audit and governance',
          body: 'Capture override reasons and protocol drift so quality teams improve workflows with evidence, not anecdotes.',
          bulletA: 'Structured override reasons',
          bulletB: 'Exportable audit summaries',
        },
        {
          title: 'Follow-up and adherence',
          body: 'Maintain continuity after discharge with reminders and structured follow-up where patients already engage.',
          bulletA: 'WhatsApp-compatible reminders',
          bulletB: 'Escalation to staff when needed',
        },
      ],
    },
    demo: {
      title: 'Choose your path: clinic or enterprise.',
      subtitle:
        'Private practice teams can start the beta now. Hospital leadership can request a Cortex pilot for governance, safety checks, and follow-up workflows.',
      ctaClinic: 'For Private Practice: Start Free Beta',
      ctaEnterprise: 'For Enterprise: Request Cortex Pilot',
      emailPlaceholder: 'Enter work email...',
      requestCta: 'Request Cortex Pilot',
      sending: 'Sending...',
      inviteOnly: 'Invite-only pilot',
      noIntegration: 'No deep integration to start',
      desktop: 'macOS + Windows',
      success: "Access request received. We'll be in touch with your invitation soon.",
      requestError: 'Failed to process request.',
      networkError: 'Connection error. Please try again later.',
    },
    footer: {
      product: 'Product',
      company: 'Company',
      legal: 'Legal',
      contact: 'Contact',
      howItWorks: 'How it works',
      modules: 'Modules',
      audit: 'Audit',
      requestAccess: 'Request access',
      about: 'About',
      blog: 'Blog',
      careers: 'Careers',
      contactLink: 'Contact',
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      hipaa: 'HIPAA Notice',
      baa: 'Business Associate Agreement',
      consent: 'Consent Forms',
      joinPilot: 'Join pilot',
      rights: '© 2026 Holi Labs. All rights reserved.',
      encryption: 'Encryption',
      auditTrails: 'Audit trails',
      accessControls: 'Access controls',
    },
  },
  es: {
    a11y: { skipToMain: 'Saltar al contenido principal' },
    header: {
      productTag: 'Cortex Pilot',
      howItWorks: 'Cómo funciona',
      audit: 'Auditoría',
      login: 'Entrar',
      betaCta: 'Iniciar Beta Gratis',
      betaShort: 'Beta',
    },
    hero: {
      badge: 'Piloto de Cardiología Hospitalaria',
      title: 'Cortex por Holi Labs.',
      highlight: 'Protege cada decisión.',
      description:
        'Una capa premium de seguridad clínica para equipos que operan con velocidad. La IA prepara contexto y documentación, mientras la lógica determinística mantiene momentos críticos auditables.',
      supportLine: 'Web-first para flujos LATAM, con opción de companion de escritorio liviano.',
      primaryCta: 'Para Consultorios: Iniciar Beta Gratis',
      primaryShort: 'Iniciar Beta',
      secondaryCta: 'Para Enterprise: Solicitar Cortex Pilot',
      secondaryShort: 'Solicitar Pilot',
    },
    howItWorks: {
      kicker: 'Cómo funciona',
      title: 'La IA precompleta la verificación. Tú validas con un toque.',
      subtitle: 'Cortex analiza la historia, propone la lógica y deja la aprobación final al clínico.',
      builtFor: 'Hecho para',
      cards: [
        {
          title: 'Clínicos',
          body: 'Un flujo rápido y predecible que reduce riesgo sin fatiga de alertas.',
        },
        {
          title: 'Calidad y liderazgo',
          body: 'Evidencia estructurada de validaciones, sobrescrituras y desvíos de protocolo.',
        },
        {
          title: 'Operación LATAM',
          body: 'Funciona con EHRs básicos y coordinación por mensajería sin esperar integraciones perfectas.',
        },
      ],
      note:
        'Cortex es una capa de verificación y documentación. Las decisiones clínicas siguen siendo responsabilidad del profesional tratante.',
    },
    workflow: {
      progressLabel: 'Progreso de verificación',
      progressDetail: '{progress}% completo - 1 clic restante',
      smartContext: 'Contexto Inteligente',
      verify: 'Verificar Consideraciones',
      document: 'Documentar y Coordinar',
      statusDone: 'Datos ingeridos',
      statusActive: 'Esperando verificación',
      statusQueued: 'Listo al verificar',
      ehrReady: 'Datos EHR listos',
      expiresIn: 'Expira en {seconds}s',
      contextBody: 'Datos EHR, laboratorios y medicación ya extraídos y normalizados por IA.',
      verifyBody: 'Cortex preparó los chequeos lógicos. Tú confirmas el criterio y finalizas.',
      verifyHint: 'Solo queda una acción.',
      confirm: 'Confirmar Criterio',
      documentBody: 'Nota de auditoría, documentación y siguientes acciones quedan en cola automáticamente.',
      toast: 'Documentación generada - equipo notificado',
      toastMobile: '¡Listo!',
    },
    architecture: {
      kicker: 'Arquitectura central',
      title: 'Tres módulos. Un sistema de seguridad coherente.',
      subtitle: 'Selecciona un tile para ver cómo cada módulo protege flujos críticos.',
      cards: [
        {
          title: 'El Checklist',
          body: 'Flujo de 30 segundos para seguridad DOAC y alta. Si falta un dato clave, Cortex solicita atestación o carga manual.',
          chipA: 'Flujo en 30 segundos',
          chipB: 'Sin supuestos ciegos',
        },
        {
          title: 'La Consola de Auditoría',
          body: 'Liderazgo visualiza validaciones, sobrescrituras y desvíos de protocolo en tiempo real.',
          chipA: 'Gobernanza en vivo',
          chipB: 'Inteligencia de override',
        },
        {
          title: 'El Seguimiento',
          body: 'Cierra el ciclo post-alta con recordatorios estructurados y adherencia, incluyendo WhatsApp cuando aplica.',
          chipA: 'Recordatorios estructurados',
          chipB: 'Escalamiento al equipo',
        },
      ],
      interactionHint: 'Haz clic o pasa el cursor para explorar',
    },
    governance: {
      kicker: 'Gobernanza',
      title: 'Protege decisiones críticas con verificación transparente.',
      subtitle:
        'La consola de auditoría de Cortex muestra qué se validó, qué se sobrescribió y dónde deriva el protocolo en operación real.',
      cardOneTitle: 'Dashboard de Resultados',
      cardOneBody:
        'Monitorea resultados clínicos y operativos: chequeos completos, tendencia de cumplimiento y eventos de riesgo evitados.',
      cardTwoTitle: 'Lógica Clínica Determinística',
      cardTwoBody:
        'Configura guardrails por unidad. Cuando hay override clínico, Cortex guarda el motivo para mejorar protocolos.',
      errorsAvoided: 'Eventos de riesgo evitados',
      complianceRate: 'Tasa de cumplimiento',
      weekDelta: '+27 esta semana',
    },
    safety: {
      kicker: 'Infraestructura de seguridad clínica',
      title: 'Diseñado para momentos críticos en todo el continuum de cuidado.',
      cards: [
        {
          title: 'Integridad de ingresos en origen',
          body: 'Detecta faltantes de modificadores, vacíos de documentación y desvíos antes del cierre de historia clínica.',
          bulletA: 'Chequeos determinísticos con criterio',
          bulletB: 'Resguardos pre-cierre',
        },
        {
          title: 'Auditoría y gobernanza',
          body: 'Registra motivos de override y deriva de protocolos para mejorar con evidencia.',
          bulletA: 'Motivos estructurados',
          bulletB: 'Resumen exportable',
        },
        {
          title: 'Seguimiento y adherencia',
          body: 'Mantiene continuidad tras el alta con recordatorios y flujos estructurados donde el paciente ya interactúa.',
          bulletA: 'Recordatorios compatibles con WhatsApp',
          bulletB: 'Escalamiento al staff',
        },
      ],
    },
    demo: {
      title: 'Elige tu ruta: clínica o enterprise.',
      subtitle:
        'Equipos de consultorio pueden iniciar beta hoy. Liderazgo hospitalario puede solicitar Cortex Pilot para gobernanza y seguridad.',
      ctaClinic: 'Para Consultorios: Iniciar Beta Gratis',
      ctaEnterprise: 'Para Enterprise: Solicitar Cortex Pilot',
      emailPlaceholder: 'Ingresa email corporativo...',
      requestCta: 'Solicitar Cortex Pilot',
      sending: 'Enviando...',
      inviteOnly: 'Piloto por invitación',
      noIntegration: 'Sin integración profunda al inicio',
      desktop: 'macOS + Windows',
      success: 'Solicitud recibida. Pronto te contactaremos con la invitación.',
      requestError: 'No fue posible procesar la solicitud.',
      networkError: 'Error de conexión. Intenta de nuevo.',
    },
    footer: {
      product: 'Producto',
      company: 'Empresa',
      legal: 'Legal',
      contact: 'Contacto',
      howItWorks: 'Cómo funciona',
      modules: 'Módulos',
      audit: 'Auditoría',
      requestAccess: 'Solicitar acceso',
      about: 'Acerca de',
      blog: 'Blog',
      careers: 'Carreras',
      contactLink: 'Contacto',
      terms: 'Términos de Servicio',
      privacy: 'Política de Privacidad',
      hipaa: 'Aviso HIPAA',
      baa: 'Business Associate Agreement',
      consent: 'Formularios de Consentimiento',
      joinPilot: 'Unirse al piloto',
      rights: '© 2026 Holi Labs. Todos los derechos reservados.',
      encryption: 'Encriptación',
      auditTrails: 'Trazas de auditoría',
      accessControls: 'Controles de acceso',
    },
  },
  pt: {
    a11y: { skipToMain: 'Pular para o conteúdo principal' },
    header: {
      productTag: 'Cortex Pilot',
      howItWorks: 'Como funciona',
      audit: 'Auditoria',
      login: 'Entrar',
      betaCta: 'Começar Beta Gratuita',
      betaShort: 'Beta',
    },
    hero: {
      badge: 'Piloto de Cardiologia Intra-hospitalar',
      title: 'Cortex by Holi Labs.',
      highlight: 'Proteja cada decisão.',
      description:
        'Uma camada premium de segurança clínica para times que operam em alta velocidade. A IA prepara contexto e documentação, enquanto a lógica determinística mantém momentos críticos transparentes e auditáveis.',
      supportLine: 'Web-first para fluxos LATAM, com opção de companion desktop leve.',
      primaryCta: 'Para Clínicas: Começar Beta Gratuita',
      primaryShort: 'Começar Beta',
      secondaryCta: 'Para Enterprise: Solicitar Cortex Pilot',
      secondaryShort: 'Solicitar Pilot',
    },
    howItWorks: {
      kicker: 'Como funciona',
      title: 'A IA pré-preenche a verificação. Você valida com um toque.',
      subtitle: 'O Cortex analisa o prontuário, propõe a trilha lógica e mantém o sign-off final com o clínico.',
      builtFor: 'Feito para',
      cards: [
        {
          title: 'Clínicos',
          body: 'Um fluxo rápido e previsível que reduz risco sem gerar fadiga de alertas.',
        },
        {
          title: 'Qualidade e liderança',
          body: 'Evidência estruturada do que foi validado, do que foi sobrescrito e de onde o protocolo desvia.',
        },
        {
          title: 'Operação LATAM',
          body: 'Funciona com EHRs básicos e coordenação por mensageria sem esperar integração perfeita.',
        },
      ],
      note:
        'Cortex é uma camada de verificação e documentação. A decisão clínica final permanece com o profissional responsável. Mensageria com pacientes é opt-in e deve minimizar conteúdo sensível.',
    },
    workflow: {
      progressLabel: 'Progresso do fluxo de verificação',
      progressDetail: '{progress}% concluído - 1 clique restante',
      smartContext: 'Contexto Inteligente',
      verify: 'Verificar Considerações',
      document: 'Documentar e Coordenar',
      statusDone: 'Dados ingeridos',
      statusActive: 'Aguardando verificação',
      statusQueued: 'Pronto após validação',
      ehrReady: 'Dados do EHR prontos',
      expiresIn: 'Expira em {seconds}s',
      contextBody: 'Dados do EHR, exames e medicamentos já foram extraídos e normalizados pela IA.',
      verifyBody: 'O Cortex rascunhou as verificações lógicas. Você confirma o racional e conclui.',
      verifyHint: 'Apenas uma ação restante.',
      confirm: 'Confirmar Racional',
      documentBody: 'Nota de auditoria, documentação e próximos passos ficam em fila automaticamente.',
      toast: 'Documentação gerada - equipe notificada',
      toastMobile: 'Sucesso!',
    },
    architecture: {
      kicker: 'Arquitetura central',
      title: 'Três módulos. Um sistema de segurança coeso.',
      subtitle: 'Selecione um tile para ver como cada módulo protege fluxos de alto risco.',
      cards: [
        {
          title: 'O Checklist',
          body: 'Fluxo de 30 segundos para segurança de DOAC e alta. Se faltar dado-chave, o Cortex solicita atestação ou entrada manual.',
          chipA: 'Fluxo em 30 segundos',
          chipB: 'Sem suposições cegas',
        },
        {
          title: 'O Console de Auditoria',
          body: 'A liderança acompanha validações, sobrescritas e desvios de protocolo em tempo real, sem esperar auditorias retrospectivas.',
          chipA: 'Governança em tempo real',
          chipB: 'Inteligência de override',
        },
        {
          title: 'O Follow-up',
          body: 'Feche o ciclo pós-alta com lembretes estruturados e fluxos de adesão, incluindo WhatsApp quando apropriado.',
          chipA: 'Lembretes estruturados',
          chipB: 'Escalonamento para equipe',
        },
      ],
      interactionHint: 'Clique ou passe o mouse para explorar',
    },
    governance: {
      kicker: 'Governança',
      title: 'Proteja decisões de alto risco com verificação transparente.',
      subtitle:
        'O console de auditoria do Cortex mostra o que foi validado, o que foi sobrescrito e onde os protocolos estão desviando na operação real.',
      cardOneTitle: 'Dashboard de Outcomes',
      cardOneBody:
        'Acompanhe outcomes operacionais e clínicos que importam: checagens concluídas, tendência de compliance e eventos de risco evitados.',
      cardTwoTitle: 'Lógica Clínica Determinística',
      cardTwoBody:
        'Configure guardrails por unidade. Quando há sobrescrita clínica, o Cortex registra o racional para aprimorar treinamento e protocolo.',
      errorsAvoided: 'Eventos de risco evitados',
      complianceRate: 'Taxa de compliance',
      weekDelta: '+27 nesta semana',
    },
    safety: {
      kicker: 'Infraestrutura de segurança clínica',
      title: 'Construído para momentos de alto risco em toda a jornada de cuidado.',
      cards: [
        {
          title: 'Integridade de receita na origem',
          body: 'Identifique modificadores ausentes, lacunas de documentação e falhas de protocolo antes do fechamento do prontuário.',
          bulletA: 'Checagens determinísticas com racional',
          bulletB: 'Salvaguardas pré-fechamento',
        },
        {
          title: 'Auditoria e governança',
          body: 'Capture motivos de sobrescrita e deriva de protocolo para que qualidade evolua com evidência, não opinião.',
          bulletA: 'Motivos estruturados de override',
          bulletB: 'Resumo de auditoria exportável',
        },
        {
          title: 'Follow-up e adesão',
          body: 'Mantenha continuidade após a alta com lembretes e fluxos estruturados nos canais em que pacientes já estão.',
          bulletA: 'Lembretes compatíveis com WhatsApp',
          bulletB: 'Escalonamento para equipe quando necessário',
        },
      ],
    },
    demo: {
      title: 'Escolha seu caminho: clínica ou enterprise.',
      subtitle:
        'Times de clínica podem iniciar a beta agora. Lideranças hospitalares podem solicitar um Cortex Pilot para governança, segurança e follow-up.',
      ctaClinic: 'Para Clínicas: Começar Beta Gratuita',
      ctaEnterprise: 'Para Enterprise: Solicitar Cortex Pilot',
      emailPlaceholder: 'Digite e-mail corporativo...',
      requestCta: 'Solicitar Cortex Pilot',
      sending: 'Enviando...',
      inviteOnly: 'Piloto por convite',
      noIntegration: 'Sem integração profunda para começar',
      desktop: 'macOS + Windows',
      success: 'Solicitação recebida. Entraremos em contato com seu convite em breve.',
      requestError: 'Falha ao processar solicitação.',
      networkError: 'Erro de conexão. Tente novamente mais tarde.',
    },
    footer: {
      product: 'Produto',
      company: 'Empresa',
      legal: 'Legal',
      contact: 'Contato',
      howItWorks: 'Como funciona',
      modules: 'Módulos',
      audit: 'Auditoria',
      requestAccess: 'Solicitar acesso',
      about: 'Sobre',
      blog: 'Blog',
      careers: 'Carreiras',
      contactLink: 'Contato',
      terms: 'Termos de Serviço',
      privacy: 'Política de Privacidade',
      hipaa: 'Aviso HIPAA',
      baa: 'Business Associate Agreement',
      consent: 'Formulários de Consentimento',
      joinPilot: 'Entrar no piloto',
      rights: '© 2026 Holi Labs. Todos os direitos reservados.',
      encryption: 'Criptografia',
      auditTrails: 'Trilhas de auditoria',
      accessControls: 'Controles de acesso',
    },
  },
};

export function getLandingCopy(locale: Locale): LandingCopy {
  return landingCopy[locale] ?? landingCopy.en;
}
