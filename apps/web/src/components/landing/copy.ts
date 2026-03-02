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
  roadmap: {
    kicker: string;
    title: string;
    subtitle: string;
    phases: Array<{
      badge: string;
      title: string;
      timeline: string;
      challenge: string;
      features: string[];
    }>;
  };
  dataMoat: {
    kicker: string;
    title: string;
    subtitle: string;
    cards: Array<{
      title: string;
      body: string;
      metric: string;
    }>;
    flywheel: string;
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
  };
  governance: {
    kicker: string;
    subtitle: string;
    cardOneTitle: string;
    cardOneBody: string;
    errorsAvoided: string;
    weekDelta: string;
    complianceRate: string;
    cardTwoTitle: string;
    cardTwoBody: string;
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
      productTag: 'Cortex Platform',
      howItWorks: 'How it works',
      audit: 'Roadmap',
      login: 'Sign in',
      betaCta: 'Request Clinical Access',
      betaShort: 'Access',
    },
    hero: {
      badge: 'The Clinical Validation Layer',
      title: 'The Guardrail for Clinical AI.',
      highlight: 'Human expertise in the loop.',
      description:
        'Large language models generate possibilities. We validate clinical realities. Cortex captures real-time physician feedback to build the world\'s most powerful dataset of Clinical Ground Truth.',
      supportLine: 'We don\'t build the engine. We build the steering wheel and the brakes.',
      primaryCta: 'Request Clinical Access',
      primaryShort: 'Clinical Access',
      secondaryCta: 'See the Roadmap',
      secondaryShort: 'Roadmap',
    },
    howItWorks: {
      kicker: 'How it works',
      title: 'AI drafts. You validate. The system learns.',
      subtitle: 'Cortex routes LLM output through a deterministic safety layer. Clinicians accept, reject, or modify recommendations in a sub-second workflow. Every interaction trains the guardrail.',
      builtFor: 'Built for',
      cards: [
        {
          title: 'Clinicians',
          body: 'A minimalist validation interface that turns clinical review into a sub-second action. Traffic-light alerts, contextual explainability, and zero alert fatigue.',
        },
        {
          title: 'Quality leadership',
          body: 'Live governance console with trust scores, override intelligence, and protocol drift monitoring. Evidence-based visibility into how AI is being used across your organization.',
        },
        {
          title: 'LATAM operations',
          body: 'Works with basic EHRs and messaging-first coordination. LGPD-compliant by default, with ANVISA regulatory references and Portuguese-language clinical content.',
        },
      ],
      note:
        'Cortex is a clinical decision support and documentation layer. Clinicians remain responsible for all clinical decisions.',
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
      contextBody: 'EHR data, labs, medications, and risk factors are already extracted and normalized. Traffic-light rules have been pre-evaluated.',
      verifyBody: 'Cortex drafted the logic checks. Review the traffic-light assessment and confirm the clinical rationale.',
      verifyHint: 'Only one action remaining.',
      confirm: 'Confirm Rationale',
      documentBody: 'Audit note, governance event, and follow-up actions are queued automatically.',
      toast: 'Documentation generated - care team notified',
      toastMobile: 'Success!',
    },
    roadmap: {
      kicker: 'The vision',
      title: 'Securing the future of AI-assisted care.',
      subtitle: 'From a seamless workflow tool to the global trust standard for health AI.',
      phases: [
        {
          badge: 'LIVE',
          title: 'The Feedback Engine',
          timeline: 'In production',
          challenge: 'Doctors suffer from alert fatigue. If the validation loop adds friction, they abandon it.',
          features: [
            'EHR-native "one-click" validation interface',
            'Sub-second accept, reject, or modify workflow',
            'Contextual explainability for every recommendation',
          ],
        },
        {
          badge: 'NEXT',
          title: 'The Clinical Safety Firewall',
          timeline: '6-12 months',
          challenge: 'How do we stop LLM hallucinations before the clinician ever sees them?',
          features: [
            'Routing model trained on accept/reject data',
            'Real-time clinical consensus tracking',
            'Institutional analytics for CIOs and CMOs',
          ],
        },
        {
          badge: 'HORIZON',
          title: 'The Global Trust Standard',
          timeline: '12-24 months',
          challenge: 'To be a true category leader, we must become the standard other health tech companies rely on.',
          features: [
            'Federated learning trust network (no PHI movement)',
            '"Verified by Cortex" API for third-party apps',
            'Automated liability mitigation for insurers',
          ],
        },
      ],
    },
    dataMoat: {
      kicker: 'The data moat',
      title: 'An engine is useless without a steering wheel.',
      subtitle: 'OpenAI, Google, and Anthropic will fight over who has the smartest engine. We are building the indispensable trust layer on top.',
      cards: [
        {
          title: 'Clinical Ground Truth',
          body: 'Every accept, reject, and modification by a physician feeds a proprietary dataset that no competitor can replicate overnight. This is our compounding network effect.',
          metric: '14,200+ physician validations',
        },
        {
          title: 'Federated Learning',
          body: 'We share the learnings of AI corrections across hospital systems without moving protected health information. The guardrail gets smarter globally while data stays local.',
          metric: 'Zero PHI movement',
        },
        {
          title: '"Verified by Cortex" API',
          body: 'Third-party health apps, telemedicine platforms, and LLM creators themselves will ping our database to score the clinical safety of their outputs before publishing.',
          metric: 'The tollbooth on top of AI',
        },
      ],
      flywheel: 'Every physician validation strengthens the guardrail.',
    },
    demo: {
      title: 'Join the consensus.',
      subtitle:
        'Clinicians can explore the platform now. Hospital and insurer leadership can request a Cortex pilot for governance, safety, and validation workflows.',
      ctaClinic: 'Request Clinical Access',
      ctaEnterprise: 'Request Enterprise Pilot',
      emailPlaceholder: 'Enter work email...',
      requestCta: 'Request Access',
      sending: 'Sending...',
      inviteOnly: 'Invite-only',
      noIntegration: 'No deep integration required',
      desktop: 'macOS + Windows',
      success: "Access request received. We'll be in touch with your invitation soon.",
      requestError: 'Failed to process request.',
      networkError: 'Connection error. Please try again later.',
    },
    architecture: {
      kicker: 'Architecture',
      title: 'Deterministic safety, not probabilistic hope.',
      subtitle: 'A layered architecture that validates every AI output before it reaches a clinician.',
      cards: [
        {
          title: 'Ingestion Layer',
          body: 'Pulls structured data from EHR, labs, and medications. Normalizes to FHIR R4 for universal compatibility.',
          chipA: 'FHIR R4',
          chipB: 'HL7 ADT/ORU',
        },
        {
          title: 'Deterministic Engine',
          body: 'SNOMED-coded ontology rules execute first. Drug interactions, contraindications, and dosing checks run in constant time.',
          chipA: 'SNOMED CT',
          chipB: 'ICD-10',
        },
        {
          title: 'Probabilistic Layer',
          body: 'LLM reasoning handles nuance—context synthesis, differential support, and documentation drafts. Always gated by deterministic checks.',
          chipA: 'GPT-4 / Claude',
          chipB: 'Gated output',
        },
        {
          title: 'Governance & Audit',
          body: 'Every validation, override, and correction is immutably logged. Trust scores update in real time for institutional dashboards.',
          chipA: 'Immutable log',
          chipB: 'Trust scores',
        },
      ],
    },
    governance: {
      kicker: 'Governance',
      subtitle: 'Real-time visibility into how AI is being used across your organization.',
      cardOneTitle: 'Override Intelligence',
      cardOneBody: 'Every clinician override feeds a learning loop. The system tracks why recommendations were rejected and adjusts confidence thresholds automatically.',
      errorsAvoided: '847 errors avoided',
      weekDelta: '+12% this week',
      complianceRate: '99.2% compliance',
      cardTwoTitle: 'Protocol Drift Monitoring',
      cardTwoBody: 'Detect when clinical practice deviates from institutional protocols. Surface trends before they become incidents.',
    },
    safety: {
      kicker: 'High-stakes safety',
      title: 'Built for decisions where mistakes cost lives.',
      cards: [
        {
          title: 'Drug Interaction Firewall',
          body: 'Every prescription is checked against the patient\'s full medication list, allergies, and renal function before it reaches the clinician.',
          bulletA: 'CYP3A4/P-gp pathway analysis',
          bulletB: 'Real-time renal dose adjustment',
        },
        {
          title: 'Clinical Attestation Gates',
          body: 'High-risk actions require explicit clinician attestation. No silent pass-throughs on BLOCK-level alerts.',
          bulletA: 'Mandatory override justification',
          bulletB: 'Immutable audit trail',
        },
        {
          title: 'Stale Data Detection',
          body: 'Lab results older than 72 hours trigger automatic warnings. Clinicians must attest they\'ve reviewed recent data before proceeding.',
          bulletA: 'Configurable staleness thresholds',
          bulletB: 'Automatic re-check prompts',
        },
      ],
    },
    footer: {
      product: 'Product',
      company: 'Company',
      legal: 'Legal',
      contact: 'Contact',
      howItWorks: 'How it works',
      modules: 'Roadmap',
      audit: 'Trust layer',
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
      productTag: 'Cortex Platform',
      howItWorks: 'Cómo funciona',
      audit: 'Hoja de ruta',
      login: 'Entrar',
      betaCta: 'Solicitar Acceso Clínico',
      betaShort: 'Acceso',
    },
    hero: {
      badge: 'La Capa de Validación Clínica',
      title: 'El Guardarriel de la IA Clínica.',
      highlight: 'Expertise humano en el circuito.',
      description:
        'Los modelos de lenguaje generan posibilidades. Nosotros validamos realidades clínicas. Cortex captura retroalimentación médica en tiempo real para construir el dataset más poderoso de Verdad Clínica.',
      supportLine: 'No construimos el motor. Construimos el volante y los frenos.',
      primaryCta: 'Solicitar Acceso Clínico',
      primaryShort: 'Acceso Clínico',
      secondaryCta: 'Ver la Hoja de Ruta',
      secondaryShort: 'Hoja de Ruta',
    },
    howItWorks: {
      kicker: 'Cómo funciona',
      title: 'La IA propone. Tú validas. El sistema aprende.',
      subtitle: 'Cortex enruta la salida de LLMs a través de una capa de seguridad determinística. Los clínicos aceptan, rechazan o modifican las recomendaciones en un flujo de sub-segundo. Cada interacción entrena el guardarriel.',
      builtFor: 'Hecho para',
      cards: [
        {
          title: 'Clínicos',
          body: 'Una interfaz minimalista de validación que convierte la revisión clínica en una acción de sub-segundo. Alertas semáforo, explicabilidad contextual y cero fatiga de alertas.',
        },
        {
          title: 'Calidad y liderazgo',
          body: 'Consola de gobernanza en vivo con scores de confianza, inteligencia de overrides y monitoreo de desvío de protocolos. Visibilidad basada en evidencia de cómo se usa la IA en tu organización.',
        },
        {
          title: 'Operación LATAM',
          body: 'Funciona con EHRs básicos y coordinación por mensajería. Cumplimiento LGPD por defecto, con referencias regulatorias ANVISA y contenido clínico en portugués.',
        },
      ],
      note:
        'Cortex es una capa de soporte a decisiones clínicas y documentación. Las decisiones clínicas siguen siendo responsabilidad del profesional tratante.',
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
      contextBody: 'Datos EHR, laboratorios, medicamentos y factores de riesgo ya extraídos y normalizados. Reglas semáforo pre-evaluadas.',
      verifyBody: 'Cortex preparó los chequeos lógicos. Revisa la evaluación semáforo y confirma el criterio clínico.',
      verifyHint: 'Solo queda una acción.',
      confirm: 'Confirmar Criterio',
      documentBody: 'Nota de auditoría, evento de gobernanza y acciones de seguimiento quedan en cola automáticamente.',
      toast: 'Documentación generada - equipo notificado',
      toastMobile: '¡Listo!',
    },
    roadmap: {
      kicker: 'La visión',
      title: 'Asegurando el futuro del cuidado asistido por IA.',
      subtitle: 'De herramienta de flujo de trabajo a estándar global de confianza para IA en salud.',
      phases: [
        {
          badge: 'EN VIVO',
          title: 'El Motor de Retroalimentación',
          timeline: 'En producción',
          challenge: 'Los médicos sufren de fatiga de alertas. Si el ciclo de validación agrega fricción, lo abandonan.',
          features: [
            'Interfaz de validación "un clic" nativa del EHR',
            'Flujo de aceptar, rechazar o modificar en sub-segundo',
            'Explicabilidad contextual para cada recomendación',
          ],
        },
        {
          badge: 'PRÓXIMO',
          title: 'El Firewall de Seguridad Clínica',
          timeline: '6-12 meses',
          challenge: '¿Cómo detenemos las alucinaciones de LLMs antes de que el clínico las vea?',
          features: [
            'Modelo de enrutamiento entrenado con datos de aceptación/rechazo',
            'Rastreo de consenso clínico en tiempo real',
            'Analítica institucional para CIOs y CMOs',
          ],
        },
        {
          badge: 'HORIZONTE',
          title: 'El Estándar Global de Confianza',
          timeline: '12-24 meses',
          challenge: 'Para ser líder de categoría, debemos convertirnos en el estándar que otras empresas de salud usen.',
          features: [
            'Red de confianza con aprendizaje federado (sin movimiento de PHI)',
            'API "Verificado por Cortex" para apps de terceros',
            'Mitigación automatizada de responsabilidad para aseguradoras',
          ],
        },
      ],
    },
    dataMoat: {
      kicker: 'El foso de datos',
      title: 'Un motor es inútil sin un volante.',
      subtitle: 'OpenAI, Google y Anthropic pelearán por quién tiene el motor más inteligente. Nosotros construimos la capa de confianza indispensable encima.',
      cards: [
        {
          title: 'Verdad Clínica',
          body: 'Cada aceptación, rechazo y modificación de un médico alimenta un dataset propietario que ningún competidor puede replicar. Este es nuestro efecto de red compuesto.',
          metric: '14.200+ validaciones médicas',
        },
        {
          title: 'Aprendizaje Federado',
          body: 'Compartimos las lecciones de correcciones de IA entre sistemas hospitalarios sin mover información de salud protegida. El guardarriel se vuelve más inteligente globalmente mientras los datos se quedan locales.',
          metric: 'Cero movimiento de PHI',
        },
        {
          title: 'API "Verificado por Cortex"',
          body: 'Apps de salud, plataformas de telemedicina y los propios creadores de LLMs consultarán nuestra base para calificar la seguridad clínica de sus outputs antes de publicarlos.',
          metric: 'El peaje sobre la IA',
        },
      ],
      flywheel: 'Cada validación médica fortalece el guardarriel.',
    },
    demo: {
      title: 'Únete al consenso.',
      subtitle:
        'Los clínicos pueden explorar la plataforma ahora. Liderazgo hospitalario y asegurador puede solicitar un piloto de Cortex para gobernanza, seguridad y flujos de validación.',
      ctaClinic: 'Solicitar Acceso Clínico',
      ctaEnterprise: 'Solicitar Piloto Enterprise',
      emailPlaceholder: 'Ingresa email corporativo...',
      requestCta: 'Solicitar Acceso',
      sending: 'Enviando...',
      inviteOnly: 'Solo por invitación',
      noIntegration: 'Sin integración profunda requerida',
      desktop: 'macOS + Windows',
      success: 'Solicitud recibida. Pronto te contactaremos con la invitación.',
      requestError: 'No fue posible procesar la solicitud.',
      networkError: 'Error de conexión. Intenta de nuevo.',
    },
    architecture: {
      kicker: 'Arquitectura',
      title: 'Seguridad determinística, no esperanza probabilística.',
      subtitle: 'Una arquitectura en capas que valida cada salida de IA antes de que llegue al clínico.',
      cards: [
        {
          title: 'Capa de Ingesta',
          body: 'Extrae datos estructurados de EHR, laboratorios y medicamentos. Normaliza a FHIR R4 para compatibilidad universal.',
          chipA: 'FHIR R4',
          chipB: 'HL7 ADT/ORU',
        },
        {
          title: 'Motor Determinístico',
          body: 'Las reglas de ontología codificadas en SNOMED se ejecutan primero. Interacciones, contraindicaciones y chequeos de dosis en tiempo constante.',
          chipA: 'SNOMED CT',
          chipB: 'ICD-10',
        },
        {
          title: 'Capa Probabilística',
          body: 'El razonamiento LLM maneja matices—síntesis de contexto, soporte diferencial y borradores de documentación. Siempre controlado por chequeos determinísticos.',
          chipA: 'GPT-4 / Claude',
          chipB: 'Salida controlada',
        },
        {
          title: 'Gobernanza y Auditoría',
          body: 'Cada validación, override y corrección queda registrada de forma inmutable. Los scores de confianza se actualizan en tiempo real.',
          chipA: 'Log inmutable',
          chipB: 'Scores de confianza',
        },
      ],
    },
    governance: {
      kicker: 'Gobernanza',
      subtitle: 'Visibilidad en tiempo real de cómo se usa la IA en tu organización.',
      cardOneTitle: 'Inteligencia de Overrides',
      cardOneBody: 'Cada override clínico alimenta un ciclo de aprendizaje. El sistema rastrea por qué se rechazaron recomendaciones y ajusta umbrales de confianza automáticamente.',
      errorsAvoided: '847 errores evitados',
      weekDelta: '+12% esta semana',
      complianceRate: '99.2% cumplimiento',
      cardTwoTitle: 'Monitoreo de Desvío de Protocolos',
      cardTwoBody: 'Detecta cuando la práctica clínica se desvía de los protocolos institucionales. Superficie tendencias antes de que se conviertan en incidentes.',
    },
    safety: {
      kicker: 'Seguridad de alto riesgo',
      title: 'Diseñado para decisiones donde los errores cuestan vidas.',
      cards: [
        {
          title: 'Firewall de Interacciones',
          body: 'Cada prescripción se verifica contra la lista completa de medicamentos, alergias y función renal del paciente antes de llegar al clínico.',
          bulletA: 'Análisis de vías CYP3A4/P-gp',
          bulletB: 'Ajuste renal en tiempo real',
        },
        {
          title: 'Puertas de Atestación Clínica',
          body: 'Las acciones de alto riesgo requieren atestación explícita del clínico. Sin pasajes silenciosos en alertas nivel BLOCK.',
          bulletA: 'Justificación de override obligatoria',
          bulletB: 'Traza de auditoría inmutable',
        },
        {
          title: 'Detección de Datos Obsoletos',
          body: 'Los resultados de laboratorio con más de 72 horas disparan advertencias automáticas. Los clínicos deben atestar que revisaron datos recientes.',
          bulletA: 'Umbrales de obsolescencia configurables',
          bulletB: 'Prompts de re-chequeo automáticos',
        },
      ],
    },
    footer: {
      product: 'Producto',
      company: 'Empresa',
      legal: 'Legal',
      contact: 'Contacto',
      howItWorks: 'Cómo funciona',
      modules: 'Hoja de ruta',
      audit: 'Capa de confianza',
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
      productTag: 'Cortex Platform',
      howItWorks: 'Como funciona',
      audit: 'Roadmap',
      login: 'Entrar',
      betaCta: 'Solicitar Acesso Clínico',
      betaShort: 'Acesso',
    },
    hero: {
      badge: 'A Camada de Validação Clínica',
      title: 'O Guardrail da IA Clínica.',
      highlight: 'Expertise humano no circuito.',
      description:
        'Modelos de linguagem geram possibilidades. Nós validamos realidades clínicas. O Cortex captura feedback médico em tempo real para construir o dataset mais poderoso de Verdade Clínica do mundo.',
      supportLine: 'Não construímos o motor. Construímos o volante e os freios.',
      primaryCta: 'Solicitar Acesso Clínico',
      primaryShort: 'Acesso Clínico',
      secondaryCta: 'Ver o Roadmap',
      secondaryShort: 'Roadmap',
    },
    howItWorks: {
      kicker: 'Como funciona',
      title: 'A IA propõe. Você valida. O sistema aprende.',
      subtitle: 'O Cortex roteia a saída de LLMs por uma camada de segurança determinística. Clínicos aceitam, rejeitam ou modificam recomendações em um fluxo de sub-segundo. Cada interação treina o guardrail.',
      builtFor: 'Feito para',
      cards: [
        {
          title: 'Clínicos',
          body: 'Uma interface minimalista de validação que transforma a revisão clínica em uma ação de sub-segundo. Alertas semáforo, explicabilidade contextual e zero fadiga de alertas.',
        },
        {
          title: 'Qualidade e liderança',
          body: 'Console de governança ao vivo com scores de confiança, inteligência de overrides e monitoramento de desvio de protocolos. Visibilidade baseada em evidência de como a IA está sendo usada na sua organização.',
        },
        {
          title: 'Operação LATAM',
          body: 'Funciona com EHRs básicos e coordenação por mensageria. Conformidade LGPD por padrão, com referências regulatórias ANVISA e conteúdo clínico em português.',
        },
      ],
      note:
        'Cortex é uma camada de suporte à decisão clínica e documentação. A decisão clínica final permanece com o profissional responsável.',
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
      contextBody: 'Dados do EHR, exames, medicamentos e fatores de risco já extraídos e normalizados. Regras semáforo pré-avaliadas.',
      verifyBody: 'O Cortex rascunhou as verificações lógicas. Revise a avaliação semáforo e confirme o racional clínico.',
      verifyHint: 'Apenas uma ação restante.',
      confirm: 'Confirmar Racional',
      documentBody: 'Nota de auditoria, evento de governança e próximos passos ficam em fila automaticamente.',
      toast: 'Documentação gerada - equipe notificada',
      toastMobile: 'Sucesso!',
    },
    roadmap: {
      kicker: 'A visão',
      title: 'Garantindo o futuro do cuidado assistido por IA.',
      subtitle: 'De ferramenta de workflow ao padrão global de confiança para IA em saúde.',
      phases: [
        {
          badge: 'AO VIVO',
          title: 'O Motor de Feedback',
          timeline: 'Em produção',
          challenge: 'Médicos sofrem de fadiga de alertas. Se o ciclo de validação adicionar fricção, eles abandonam.',
          features: [
            'Interface de validação "um clique" nativa do EHR',
            'Fluxo de aceitar, rejeitar ou modificar em sub-segundo',
            'Explicabilidade contextual para cada recomendação',
          ],
        },
        {
          badge: 'PRÓXIMO',
          title: 'O Firewall de Segurança Clínica',
          timeline: '6-12 meses',
          challenge: 'Como impedimos alucinações de LLMs antes que o clínico as veja?',
          features: [
            'Modelo de roteamento treinado com dados de aceite/rejeição',
            'Rastreamento de consenso clínico em tempo real',
            'Analítica institucional para CIOs e CMOs',
          ],
        },
        {
          badge: 'HORIZONTE',
          title: 'O Padrão Global de Confiança',
          timeline: '12-24 meses',
          challenge: 'Para ser líder de categoria, precisamos nos tornar o padrão que outras empresas de saúde usam.',
          features: [
            'Rede de confiança com aprendizado federado (sem movimento de PHI)',
            'API "Verificado pelo Cortex" para apps de terceiros',
            'Mitigação automatizada de responsabilidade para operadoras',
          ],
        },
      ],
    },
    dataMoat: {
      kicker: 'O fosso de dados',
      title: 'Um motor é inútil sem um volante.',
      subtitle: 'OpenAI, Google e Anthropic vão brigar por quem tem o motor mais inteligente. Nós construímos a camada de confiança indispensável por cima.',
      cards: [
        {
          title: 'Verdade Clínica',
          body: 'Cada aceite, rejeição e modificação de um médico alimenta um dataset proprietário que nenhum concorrente pode replicar. Este é nosso efeito de rede composto.',
          metric: '14.200+ validações médicas',
        },
        {
          title: 'Aprendizado Federado',
          body: 'Compartilhamos as lições de correções de IA entre sistemas hospitalares sem mover informações de saúde protegidas. O guardrail fica mais inteligente globalmente enquanto os dados ficam locais.',
          metric: 'Zero movimento de PHI',
        },
        {
          title: 'API "Verificado pelo Cortex"',
          body: 'Apps de saúde, plataformas de telemedicina e os próprios criadores de LLMs vão consultar nossa base para pontuar a segurança clínica de seus outputs antes de publicar.',
          metric: 'O pedágio sobre a IA',
        },
      ],
      flywheel: 'Cada validação médica fortalece o guardrail.',
    },
    demo: {
      title: 'Junte-se ao consenso.',
      subtitle:
        'Clínicos podem explorar a plataforma agora. Lideranças hospitalares e de operadoras podem solicitar um piloto do Cortex para governança, segurança e workflows de validação.',
      ctaClinic: 'Solicitar Acesso Clínico',
      ctaEnterprise: 'Solicitar Piloto Enterprise',
      emailPlaceholder: 'Digite e-mail corporativo...',
      requestCta: 'Solicitar Acesso',
      sending: 'Enviando...',
      inviteOnly: 'Somente por convite',
      noIntegration: 'Sem integração profunda necessária',
      desktop: 'macOS + Windows',
      success: 'Solicitação recebida. Entraremos em contato com seu convite em breve.',
      requestError: 'Falha ao processar solicitação.',
      networkError: 'Erro de conexão. Tente novamente mais tarde.',
    },
    architecture: {
      kicker: 'Arquitetura',
      title: 'Segurança determinística, não esperança probabilística.',
      subtitle: 'Uma arquitetura em camadas que valida cada saída de IA antes de chegar ao clínico.',
      cards: [
        {
          title: 'Camada de Ingestão',
          body: 'Extrai dados estruturados do EHR, exames e medicamentos. Normaliza para FHIR R4 para compatibilidade universal.',
          chipA: 'FHIR R4',
          chipB: 'HL7 ADT/ORU',
        },
        {
          title: 'Motor Determinístico',
          body: 'Regras de ontologia codificadas em SNOMED executam primeiro. Interações, contraindicações e verificações de dose em tempo constante.',
          chipA: 'SNOMED CT',
          chipB: 'ICD-10',
        },
        {
          title: 'Camada Probabilística',
          body: 'O raciocínio LLM lida com nuances—síntese de contexto, suporte diferencial e rascunhos de documentação. Sempre controlado por verificações determinísticas.',
          chipA: 'GPT-4 / Claude',
          chipB: 'Saída controlada',
        },
        {
          title: 'Governança e Auditoria',
          body: 'Cada validação, override e correção é registrada de forma imutável. Scores de confiança atualizam em tempo real para dashboards institucionais.',
          chipA: 'Log imutável',
          chipB: 'Scores de confiança',
        },
      ],
    },
    governance: {
      kicker: 'Governança',
      subtitle: 'Visibilidade em tempo real de como a IA está sendo usada na sua organização.',
      cardOneTitle: 'Inteligência de Overrides',
      cardOneBody: 'Cada override clínico alimenta um ciclo de aprendizado. O sistema rastreia por que recomendações foram rejeitadas e ajusta limiares de confiança automaticamente.',
      errorsAvoided: '847 erros evitados',
      weekDelta: '+12% esta semana',
      complianceRate: '99.2% conformidade',
      cardTwoTitle: 'Monitoramento de Desvio de Protocolos',
      cardTwoBody: 'Detecta quando a prática clínica desvia dos protocolos institucionais. Superficie tendências antes que se tornem incidentes.',
    },
    safety: {
      kicker: 'Segurança de alto risco',
      title: 'Construído para decisões onde erros custam vidas.',
      cards: [
        {
          title: 'Firewall de Interações',
          body: 'Cada prescrição é verificada contra a lista completa de medicamentos, alergias e função renal do paciente antes de chegar ao clínico.',
          bulletA: 'Análise de vias CYP3A4/P-gp',
          bulletB: 'Ajuste renal em tempo real',
        },
        {
          title: 'Portões de Atestação Clínica',
          body: 'Ações de alto risco exigem atestação explícita do clínico. Sem passagens silenciosas em alertas nível BLOCK.',
          bulletA: 'Justificativa de override obrigatória',
          bulletB: 'Trilha de auditoria imutável',
        },
        {
          title: 'Detecção de Dados Obsoletos',
          body: 'Resultados de laboratório com mais de 72 horas disparam avisos automáticos. Clínicos devem atestar que revisaram dados recentes.',
          bulletA: 'Limiares de obsolescência configuráveis',
          bulletB: 'Prompts de re-verificação automáticos',
        },
      ],
    },
    footer: {
      product: 'Produto',
      company: 'Empresa',
      legal: 'Legal',
      contact: 'Contato',
      howItWorks: 'Como funciona',
      modules: 'Roadmap',
      audit: 'Camada de confiança',
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
