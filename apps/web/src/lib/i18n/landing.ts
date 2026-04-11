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
    vision: 'Vision',
    product: 'Product',
    benefits: 'Benefits',
    contact: 'Contact',
    requestDemo: 'Request Demo',
  },
  hero: {
    line1: 'We have reimagined the future of healthcare',
    line2: 'through human connection.',
    scrollLabel: 'SCROLL TO EXPLORE',
  },
  vision: {
    before: 'Imagine a platform as an ',
    highlight: 'intelligent bridge',
    after: ' seamlessly connecting patients to the right specialist, at the right time.',
  },
  carousel: {
    cards: [
      { label: 'Intelligent Triage', description: 'Route patients to the right specialist instantly with context-aware coordination.' },
      { label: 'Care Coordination', description: 'Unify clinical workflows across departments, locations, and specialties.' },
      { label: 'Patient Network', description: 'Build a connected care ecosystem that scales with your organization.' },
      { label: 'Clinical Workflows', description: 'Streamline every step from intake to follow-up with adaptive automation.' },
      { label: 'Outcome Tracking', description: 'Measure what matters with real-time visibility into patient outcomes.' },
      { label: 'Compliance Engine', description: 'LGPD and HIPAA compliance built into every layer of the platform.' },
    ],
  },
  productReveal: {
    pre: "That's the",
    main: 'Clinical Operating System.',
  },
  benefits: {
    items: [
      { number: '01', title: 'Unified Platform', description: 'One system that connects every clinician, specialist, and care team member for coordinated whole-person care.' },
      { number: '02', title: 'Accessible & Scalable', description: 'From single clinics to national networks, healthcare delivery that grows with demand without complexity.' },
      { number: '03', title: 'Measurable Outcomes', description: 'Track clinical impact with transparent metrics that demonstrate repeatable ROI for every stakeholder.' },
    ],
  },
  socialProof: {
    tag: 'BUILT BY CLINICIANS',
    heading: 'Designed with practitioners who understand the realities of patient care.',
    subheading: 'Every feature validated by physicians, nurses, and care coordinators across Latin America.',
  },
  testimonial: {
    quote: 'For the first time, our entire care team operates from a single source of truth. The coordination alone has transformed how we deliver care.',
    author: 'Dr. Maria Fernanda',
    role: 'Medical Director, São Paulo',
  },
  trustedBy: {
    tag: 'TRUSTED BY INNOVATORS',
    heading: 'Partnering with forward-thinking healthcare organizations across Latin America.',
  },
  howItWorks: {
    tag: 'HOW IT WORKS',
    heading: 'Three steps to transform your clinical operations into a connected care network.',
    cta: 'See It In Action',
  },
  contact: {
    heading: 'Start the conversation',
    subtitle: 'Tell us about your organization and we will show you what coordinated care looks like.',
    listItems: [
      'Personalized platform walkthrough',
      'Integration assessment for your systems',
      'Custom ROI projection for your organization',
      'No commitment required',
    ],
    form: {
      name: 'Full Name',
      email: 'Work Email',
      organization: 'Organization',
      role: 'Your Role',
      roleOptions: ['Physician', 'Clinic Administrator', 'Hospital Director', 'IT / Technology', 'Other'],
      message: 'Tell us about your needs',
      submit: 'Request Demo',
      success: 'Thank you. We will be in touch within 24 hours.',
    },
  },
  footerCta: {
    heading: 'Ready to reimagine healthcare delivery?',
    cta: 'Request Demo',
  },
  footer: {
    product: 'Product',
    productLinks: [
      { label: 'Clinical Workflows', href: '#product' },
      { label: 'Care Coordination', href: '#benefits' },
      { label: 'Compliance', href: '#benefits' },
      { label: 'Request Access', href: '#contact' },
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
    tagline: 'Clinical intelligence infrastructure for modern healthcare.',
  },
};

const es: LandingCopy = {
  nav: {
    vision: 'Visión',
    product: 'Producto',
    benefits: 'Beneficios',
    contact: 'Contacto',
    requestDemo: 'Solicitar Demo',
  },
  hero: {
    line1: 'Hemos reimaginado el futuro de la salud',
    line2: 'a través de la conexión humana.',
    scrollLabel: 'DESPLAZA PARA EXPLORAR',
  },
  vision: {
    before: 'Imagina una plataforma como un ',
    highlight: 'puente inteligente',
    after: ' que conecta pacientes con el especialista correcto, en el momento preciso.',
  },
  carousel: {
    cards: [
      { label: 'Triaje Inteligente', description: 'Dirige pacientes al especialista adecuado al instante con coordinación contextual.' },
      { label: 'Coordinación de Cuidado', description: 'Unifica flujos clínicos entre departamentos, ubicaciones y especialidades.' },
      { label: 'Red de Pacientes', description: 'Construye un ecosistema de cuidado conectado que escala con tu organización.' },
      { label: 'Flujos Clínicos', description: 'Optimiza cada paso desde la admisión hasta el seguimiento con automatización adaptativa.' },
      { label: 'Seguimiento de Resultados', description: 'Mide lo que importa con visibilidad en tiempo real de los resultados del paciente.' },
      { label: 'Motor de Cumplimiento', description: 'Cumplimiento LGPD y HIPAA integrado en cada capa de la plataforma.' },
    ],
  },
  productReveal: {
    pre: 'Ese es el',
    main: 'Sistema Operativo Clínico.',
  },
  benefits: {
    items: [
      { number: '01', title: 'Plataforma Unificada', description: 'Un sistema que conecta a cada médico, especialista y equipo de cuidado para una atención integral coordinada.' },
      { number: '02', title: 'Accesible y Escalable', description: 'Desde clínicas individuales hasta redes nacionales, atención que crece con la demanda sin complejidad.' },
      { number: '03', title: 'Resultados Medibles', description: 'Seguimiento del impacto clínico con métricas transparentes que demuestran ROI repetible para cada stakeholder.' },
    ],
  },
  socialProof: {
    tag: 'CREADO POR MÉDICOS',
    heading: 'Diseñado con profesionales que entienden las realidades del cuidado del paciente.',
    subheading: 'Cada función validada por médicos, enfermeras y coordinadores de cuidado en toda América Latina.',
  },
  testimonial: {
    quote: 'Por primera vez, todo nuestro equipo de cuidado opera desde una única fuente de verdad. La coordinación por sí sola ha transformado cómo brindamos atención.',
    author: 'Dra. María Fernanda',
    role: 'Directora Médica, São Paulo',
  },
  trustedBy: {
    tag: 'CONFIANZA DE INNOVADORES',
    heading: 'Aliados con organizaciones de salud visionarias en toda América Latina.',
  },
  howItWorks: {
    tag: 'CÓMO FUNCIONA',
    heading: 'Tres pasos para transformar tus operaciones clínicas en una red de cuidado conectada.',
    cta: 'Ver en Acción',
  },
  contact: {
    heading: 'Inicia la conversación',
    subtitle: 'Cuéntanos sobre tu organización y te mostraremos cómo es el cuidado coordinado.',
    listItems: [
      'Demostración personalizada de la plataforma',
      'Evaluación de integración para tus sistemas',
      'Proyección de ROI personalizada para tu organización',
      'Sin compromiso requerido',
    ],
    form: {
      name: 'Nombre Completo',
      email: 'Email de Trabajo',
      organization: 'Organización',
      role: 'Tu Rol',
      roleOptions: ['Médico', 'Administrador de Clínica', 'Director de Hospital', 'TI / Tecnología', 'Otro'],
      message: 'Cuéntanos sobre tus necesidades',
      submit: 'Solicitar Demo',
      success: 'Gracias. Nos pondremos en contacto en 24 horas.',
    },
  },
  footerCta: {
    heading: '¿Listo para reimaginar la atención en salud?',
    cta: 'Solicitar Demo',
  },
  footer: {
    product: 'Producto',
    productLinks: [
      { label: 'Flujos Clínicos', href: '#product' },
      { label: 'Coordinación de Cuidado', href: '#benefits' },
      { label: 'Cumplimiento', href: '#benefits' },
      { label: 'Solicitar Acceso', href: '#contact' },
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
    tagline: 'Infraestructura de inteligencia clínica para la salud moderna.',
  },
};

const pt: LandingCopy = {
  nav: {
    vision: 'Visão',
    product: 'Produto',
    benefits: 'Benefícios',
    contact: 'Contato',
    requestDemo: 'Solicitar Demo',
  },
  hero: {
    line1: 'Reimaginamos o futuro da saúde',
    line2: 'através da conexão humana.',
    scrollLabel: 'ROLE PARA EXPLORAR',
  },
  vision: {
    before: 'Imagine uma plataforma como uma ',
    highlight: 'ponte inteligente',
    after: ' conectando pacientes ao especialista certo, no momento certo.',
  },
  carousel: {
    cards: [
      { label: 'Triagem Inteligente', description: 'Direcione pacientes ao especialista certo instantaneamente com coordenação contextual.' },
      { label: 'Coordenação de Cuidado', description: 'Unifique fluxos clínicos entre departamentos, locais e especialidades.' },
      { label: 'Rede de Pacientes', description: 'Construa um ecossistema de cuidado conectado que escala com sua organização.' },
      { label: 'Fluxos Clínicos', description: 'Otimize cada etapa da admissão ao acompanhamento com automação adaptativa.' },
      { label: 'Acompanhamento de Resultados', description: 'Meça o que importa com visibilidade em tempo real dos resultados do paciente.' },
      { label: 'Motor de Conformidade', description: 'Conformidade LGPD e HIPAA integrada em cada camada da plataforma.' },
    ],
  },
  productReveal: {
    pre: 'Esse é o',
    main: 'Sistema Operacional Clínico.',
  },
  benefits: {
    items: [
      { number: '01', title: 'Plataforma Unificada', description: 'Um sistema que conecta cada médico, especialista e equipe de cuidado para atenção integral coordenada.' },
      { number: '02', title: 'Acessível e Escalável', description: 'De clínicas individuais a redes nacionais, saúde que cresce com a demanda sem complexidade.' },
      { number: '03', title: 'Resultados Mensuráveis', description: 'Acompanhe o impacto clínico com métricas transparentes que demonstram ROI repetível para cada stakeholder.' },
    ],
  },
  socialProof: {
    tag: 'CRIADO POR MÉDICOS',
    heading: 'Projetado com profissionais que entendem as realidades do cuidado ao paciente.',
    subheading: 'Cada funcionalidade validada por médicos, enfermeiros e coordenadores de cuidado em toda a América Latina.',
  },
  testimonial: {
    quote: 'Pela primeira vez, toda nossa equipe de cuidado opera a partir de uma única fonte de verdade. A coordenação por si só transformou como entregamos cuidado.',
    author: 'Dra. Maria Fernanda',
    role: 'Diretora Médica, São Paulo',
  },
  trustedBy: {
    tag: 'CONFIANÇA DE INOVADORES',
    heading: 'Parceiros de organizações de saúde visionárias em toda a América Latina.',
  },
  howItWorks: {
    tag: 'COMO FUNCIONA',
    heading: 'Três passos para transformar suas operações clínicas em uma rede de cuidado conectada.',
    cta: 'Ver em Ação',
  },
  contact: {
    heading: 'Inicie a conversa',
    subtitle: 'Conte-nos sobre sua organização e mostraremos como é o cuidado coordenado.',
    listItems: [
      'Demonstração personalizada da plataforma',
      'Avaliação de integração para seus sistemas',
      'Projeção de ROI personalizada para sua organização',
      'Sem compromisso necessário',
    ],
    form: {
      name: 'Nome Completo',
      email: 'Email de Trabalho',
      organization: 'Organização',
      role: 'Seu Cargo',
      roleOptions: ['Médico', 'Administrador de Clínica', 'Diretor de Hospital', 'TI / Tecnologia', 'Outro'],
      message: 'Conte-nos sobre suas necessidades',
      submit: 'Solicitar Demo',
      success: 'Obrigado. Entraremos em contato em 24 horas.',
    },
  },
  footerCta: {
    heading: 'Pronto para reimaginar a entrega de saúde?',
    cta: 'Solicitar Demo',
  },
  footer: {
    product: 'Produto',
    productLinks: [
      { label: 'Fluxos Clínicos', href: '#product' },
      { label: 'Coordenação de Cuidado', href: '#benefits' },
      { label: 'Conformidade', href: '#benefits' },
      { label: 'Solicitar Acesso', href: '#contact' },
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
    tagline: 'Infraestrutura de inteligência clínica para a saúde moderna.',
  },
};

const copies: Record<Locale, LandingCopy> = { en, es, pt };

export function getLandingCopy(locale: Locale): LandingCopy {
  return copies[locale] ?? copies.en;
}
