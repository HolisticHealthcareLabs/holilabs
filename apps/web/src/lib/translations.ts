// Multi-language translations for Holi Labs landing page

export type Language = 'en' | 'es' | 'pt';

export const translations = {
  en: {
    // Common
    skipToMain: 'Skip to main content',
    sendFeedback: 'Send us your feedback',
    cancel: 'Cancel',
    send: 'Send',
    tellUsWhatYouThink: 'Tell us what you think...',

    // Signup Messages
    signup: {
      success: 'Success! Check your email for instant access',
      successFirst100: '🎉 Congratulations! You are user #{number} and have FREE access for 1 year. Check your email.',
      successFreeYear: '🎁 FREE 1-year access activated! Check your email.',
      error: 'Error. Please try again',
      networkError: 'Connection failed. Check your network',
      placeholder: 'your.email@clinic.com',
    },
    
    // Navigation
    nav: {
      platform: 'Platform',
      cases: 'Use Cases',
      pricing: 'Pricing',
      signIn: 'Sign In',
      demo: 'Free Demo',
    },
    
    // Hero Section
    hero: {
      badge: 'Clinical Co-Pilot',
      headline: 'From Reactive Treatment\nto Proactive Health',
      subheadline: 'HoliLabs is a Generative Intelligence clinical co-pilot that shifts the focus from reactive treatment to proactive health management. Rapidly identify underlying health patterns leveraging EHR, labs, and imaging data to deliver personalized, integrative care.',
      ctaPrimary: 'Get Started',
      ctaSecondary: 'Learn More',
    },
    
    // Paradigm Shift Section
    paradigm: {
      badge: 'The Paradigm Shift',
      headline: 'From Reactive Medicine to',
      headlineHighlight: 'Health 3.0',
      subheadline: 'Goodbye to reactive medicine. Hello to anticipation. A system that processes data and detects risks in the background, so you focus on what you do best: heal.',
      legacyTitle: 'Legacy Systems',
      legacyItems: [
        '60% of your time on documentation, not on patients',
        'Forgotten or delayed preventive screenings',
        'Burnout from unsustainable administrative burden',
        'Data scattered across multiple systems',
        'Lack of tools for population management',
        'Patients losing printed prescriptions'
      ],
      health3Title: 'Health 3.0 with Holi Labs',
      health3Items: [
        'Medical AI saves you 3-4 hours daily (transcription → SOAP notes)',
        'Longitudinal prevention system that identifies gaps automatically',
        'CDS working for you: 12+ active rules detect problems before they happen',
        'Patient portal that reduces calls by 40%',
        'Clinical decisions backed by WHO/PAHO/USPSTF in real-time',
        'E-prescribing with digital signature to 8+ pharmacies'
      ],
      result: 'More time for medicine, less time on administration.',
    },
    
    // One Platform Section
    onePlatform: {
      badge: 'CLINICAL DECISION SUPPORT',
      headline: 'Intelligent Protocol Recommendations',
      subheadline: 'Real-time Clinical Decision Support enables personalized, integrative care through intelligent protocol recommendations. Designed to facilitate clinical discovery and lay the groundwork for decentralized trials that validate evidence-based integrative medicine practices.',
    },
    
    // Footer
    footer: {
      product: 'Product',
      company: 'Company',
      legal: 'Legal',
      contact: 'Contact',
      about: 'About Us',
      blog: 'Blog',
      careers: 'Careers',
      terms: 'Terms',
      privacy: 'Privacy',
      hipaa: 'HIPAA',
      security: 'Security',
      rights: 'All rights reserved.',
      vision: 'Vision: Lead Health 3.0 in Latin America',
      visionItems: [
        { year: '2025', text: '1,000 doctors in MX and BR' },
        { year: '2026', text: 'Expansion to CO, AR, CL, PE' },
        { year: '2027', text: '10,000+ active doctors' },
        { year: '2030', text: 'Health 3.0 standard in LATAM' },
      ],
      joinRevolution: 'Join the revolution.',
      dontStayBehind: "Don't stay behind.",
    },

    // AI Command Center
    aiCommandCenter: {
      navigation: {
        cdss: "Taking you to the Clinical Decision Support System (CDSS). Here you'll find 12+ active rules that detect problems before they occur, drug interactions, and WHO/PAHO protocols.",
        scribe: "Perfect! Taking you to the AI Medical Scribe. This tool transcribes your consultations in real-time and generates SOAP notes automatically, saving you 3-4 hours daily.",
        prevention: "Directing you to the Longitudinal Prevention Hub. Here you can see 30-year timelines, 7 health domains, and over 100 preventive interventions based on WHO/PAHO/USPSTF protocols.",
        patients: "Taking you to the Patient Management Portal. From here you can see all your patients, their complete history, and access the patient portal that reduces your calls by 40%.",
        pricing: "Sure! I'll show you our pricing plans. We offer from the free Starter plan to personalized Enterprise. All include medical AI, automated prevention, and support in English.",
        login: "Taking you to the login page. You can sign in with Google or with your Holi Labs account.",
        dashboard: "Taking you to the main Dashboard where you can see a summary of your active patients, scheduled appointments, pending prescriptions, and more.",
      },
      defaultResponse: "I understand you're looking for \"{query}\".\n\nI can help you with:\n• **Prevention**: 30-year longitudinal system with automatic alerts\n• **AI Scribe**: Real-time transcription and SOAP notes (saves 3-4h/day)\n• **CDSS**: 12+ clinical support rules with WHO/PAHO protocols\n• **Patients**: Complete portal that reduces calls by 40%\n• **E-Prescribing**: Digital signature to 8+ integrated pharmacies\n\nWhat would you like to know more about?",
    },
    errorPages: {
      somethingWentWrong: 'Something went wrong',
      unexpectedError: 'An unexpected error occurred',
      tryAgain: 'Try again',
      goHome: 'Go to Home',
      technicalDetails: 'Technical details',
      notFound: 'Page not found',
      notFoundCode: '404',
      goToSignIn: 'Go to Sign In',
    },
  },
  
  es: {
    // Common
    skipToMain: 'Saltar al contenido principal',
    sendFeedback: 'Envíanos tu feedback',
    cancel: 'Cancelar',
    send: 'Enviar',
    tellUsWhatYouThink: 'Cuéntanos lo que piensas...',

    // Signup Messages
    signup: {
      success: '¡Éxito! Revisa tu email para acceso instantáneo',
      successFirst100: '🎉 ¡Felicidades! Eres el usuario #{number} y tienes acceso GRATIS por 1 año. Revisa tu email.',
      successFreeYear: '🎁 ¡Acceso GRATIS por 1 año activado! Revisa tu email.',
      error: 'Error. Por favor reintenta',
      networkError: 'Falló la conexión. Verifica tu red',
      placeholder: 'tu.email@clinica.com',
    },

    // Navigation
    nav: {
      platform: 'Plataforma',
      cases: 'Casos de Uso',
      pricing: 'Precios',
      signIn: 'Entrar',
      demo: 'Demo Gratuita',
    },
    
    // Hero Section
    hero: {
      badge: 'Clinical Co-Pilot',
      headline: 'De Tratamiento Reactivo\na Salud Proactiva',
      subheadline: 'HoliLabs es un co-piloto clínico de Inteligencia Generativa que cambia el enfoque del tratamiento reactivo a la gestión proactiva de la salud. Identifica rápidamente patrones de salud subyacentes aprovechando datos de EHR, laboratorios e imágenes para ofrecer atención personalizada e integrativa.',
      ctaPrimary: 'Comenzar',
      ctaSecondary: 'Más información',
    },
    
    // Paradigm Shift Section
    paradigm: {
      badge: 'El Cambio de Paradigma',
      headline: 'De Medicina Reactiva a',
      headlineHighlight: 'Health 3.0',
      subheadline: 'Adiós a la medicina reactiva. Hola a la anticipación. Un sistema que procesa datos y detecta riesgos en segundo plano, para que tú te enfoques en lo que mejor sabes hacer: curar.',
      legacyTitle: 'Legacy Systems',
      legacyItems: [
        '60% de tu tiempo en documentación, no en pacientes',
        'Screenings preventivos olvidados o retrasados',
        'Burnout por carga administrativa insostenible',
        'Datos dispersos en múltiples sistemas',
        'Falta de herramientas para manejo poblacional',
        'Pacientes perdiendo recetas impresas'
      ],
      health3Title: 'Health 3.0 con Holi Labs',
      health3Items: [
        'IA Médica te ahorra 3-4 horas diarias (transcripción → notas SOAP)',
        'Sistema de prevención longitudinal que identifica gaps automáticamente',
        'CDS que trabaja para ti: 12+ reglas activas detectan problemas antes',
        'Portal de pacientes que reduce llamadas en 40%',
        'Decisiones clínicas respaldadas por WHO/PAHO/USPSTF en tiempo real',
        'E-prescribing con firma digital a 8+ farmacias'
      ],
      result: 'Más tiempo para medicina, menos tiempo en administración.',
    },
    
    // One Platform Section
    onePlatform: {
      badge: 'SOPORTE PARA DECISIONES CLÍNICAS',
      headline: 'Recomendaciones de Protocolos Inteligentes',
      subheadline: 'El Soporte para Decisiones Clínicas en tiempo real permite atención integrativa y personalizada a través de recomendaciones de protocolos inteligentes. Diseñado para facilitar el descubrimiento clínico y sentar las bases para ensayos descentralizados que validen prácticas de medicina integrativa basadas en evidencia.',
    },
    
    // Footer
    footer: {
      product: 'Producto',
      company: 'Empresa',
      legal: 'Legal',
      contact: 'Contacto',
      about: 'Sobre Nosotros',
      blog: 'Blog',
      careers: 'Carreras',
      terms: 'Términos',
      privacy: 'Privacidad',
      hipaa: 'HIPAA',
      security: 'Seguridad',
      rights: 'Todos los derechos reservados.',
      vision: 'Visión: Liderar Health 3.0 en Latinoamérica',
      visionItems: [
        { year: '2025', text: '1,000 médicos en MX y BR' },
        { year: '2026', text: 'Expansión a CO, AR, CL, PE' },
        { year: '2027', text: '10,000+ médicos activos' },
        { year: '2030', text: 'Estándar Health 3.0 LATAM' },
      ],
      joinRevolution: 'Únete a la revolución.',
      dontStayBehind: 'No te quedes atrás.',
    },

    // AI Command Center
    aiCommandCenter: {
      navigation: {
        cdss: "Te llevo al Sistema de Soporte a Decisiones Clínicas (CDSS). Aquí encontrarás 12+ reglas activas que detectan problemas antes que ocurran, interacciones medicamentosas, y protocolos WHO/PAHO.",
        scribe: "¡Perfecto! Te llevo al AI Medical Scribe. Esta herramienta transcribe tus consultas en tiempo real y genera notas SOAP automáticamente, ahorrándote 3-4 horas diarias.",
        prevention: "Te dirijo al Hub de Prevención Longitudinal. Aquí puedes ver timelines de 30 años, 7 dominios de salud, y más de 100 intervenciones preventivas basadas en protocolos WHO/PAHO/USPSTF.",
        patients: "Te llevo al Portal de Gestión de Pacientes. Desde aquí puedes ver todos tus pacientes, su historial completo, y acceder al portal de pacientes que reduce tus llamadas en 40%.",
        pricing: "¡Claro! Te muestro nuestros planes de precios. Ofrecemos desde el plan Starter gratuito hasta Enterprise personalizado. Todos incluyen IA médica, prevención automatizada, y soporte en español.",
        login: "Te llevo a la página de inicio de sesión. Puedes entrar con Google o con tu cuenta de Holi Labs.",
        dashboard: "Te llevo al Dashboard principal donde puedes ver un resumen de tus pacientes activos, citas programadas, prescripciones pendientes, y más.",
      },
      defaultResponse: "Entiendo que buscas \"{query}\".\n\nPuedo ayudarte con:\n• **Prevención**: Sistema longitudinal de 30 años con alertas automáticas\n• **AI Scribe**: Transcripción y notas SOAP en tiempo real (ahorra 3-4h/día)\n• **CDSS**: 12+ reglas de soporte clínico con protocolos WHO/PAHO\n• **Pacientes**: Portal completo que reduce llamadas en 40%\n• **E-Prescribing**: Firma digital a 8+ farmacias integradas\n\n¿Sobre cuál te gustaría saber más?",
    },
    errorPages: {
      somethingWentWrong: 'Algo salió mal',
      unexpectedError: 'Ocurrió un error inesperado',
      tryAgain: 'Reintentar',
      goHome: 'Volver al Inicio',
      technicalDetails: 'Detalles técnicos',
      notFound: 'Página no encontrada',
      notFoundCode: '404',
      goToSignIn: 'Ir a Iniciar Sesión',
    },
  },
  
  pt: {
    // Common
    skipToMain: 'Pular para o conteúdo principal',
    sendFeedback: 'Envie-nos seu feedback',
    cancel: 'Cancelar',
    send: 'Enviar',
    tellUsWhatYouThink: 'Conte-nos o que você pensa...',

    // Signup Messages
    signup: {
      success: 'Sucesso! Verifique seu email para acesso instantâneo',
      successFirst100: '🎉 Parabéns! Você é o usuário #{number} e tem acesso GRÁTIS por 1 ano. Verifique seu email.',
      successFreeYear: '🎁 Acesso GRÁTIS por 1 ano ativado! Verifique seu email.',
      error: 'Erro. Por favor, tente novamente',
      networkError: 'Falha na conexão. Verifique sua rede',
      placeholder: 'seu.email@clinica.com',
    },

    // Navigation
    nav: {
      platform: 'Plataforma',
      cases: 'Casos de Uso',
      pricing: 'Preços',
      signIn: 'Entrar',
      demo: 'Demo Gratuita',
    },
    
    // Hero Section
    hero: {
      badge: 'Clinical Co-Pilot',
      headline: 'De Tratamento Reativo\na Saúde Proativa',
      subheadline: 'HoliLabs é um co-piloto clínico de Inteligência Generativa que muda o foco do tratamento reativo para a gestão proativa da saúde. Identifica rapidamente padrões de saúde subjacentes aproveitando dados de EHR, laboratórios e imagens para fornecer cuidados personalizados e integrativos.',
      ctaPrimary: 'Começar',
      ctaSecondary: 'Saiba mais',
    },
    
    // Paradigm Shift Section
    paradigm: {
      badge: 'A Mudança de Paradigma',
      headline: 'Da Medicina Reativa para',
      headlineHighlight: 'Health 3.0',
      subheadline: 'Adeus à medicina reativa. Olá à antecipação. Um sistema que processa dados e detecta riscos em segundo plano, para que você se concentre no que faz de melhor: curar.',
      legacyTitle: 'Sistemas Legados',
      legacyItems: [
        '60% do seu tempo em documentação, não em pacientes',
        'Exames preventivos esquecidos ou atrasados',
        'Burnout por carga administrativa insustentável',
        'Dados dispersos em múltiplos sistemas',
        'Falta de ferramentas para gestão populacional',
        'Pacientes perdendo receitas impressas'
      ],
      health3Title: 'Health 3.0 com Holi Labs',
      health3Items: [
        'IA Médica economiza 3-4 horas diárias (transcrição → notas SOAP)',
        'Sistema de prevenção longitudinal que identifica lacunas automaticamente',
        'CDS trabalhando para você: 12+ regras ativas detectam problemas antes',
        'Portal de pacientes que reduz chamadas em 40%',
        'Decisões clínicas apoiadas pela OMS/OPAS/USPSTF em tempo real',
        'E-prescrição com assinatura digital para 8+ farmácias'
      ],
      result: 'Mais tempo para medicina, menos tempo em administração.',
    },
    
    // One Platform Section
    onePlatform: {
      badge: 'SUPORTE PARA DECISÕES CLÍNICAS',
      headline: 'Recomendações de Protocolos Inteligentes',
      subheadline: 'O Suporte para Decisões Clínicas em tempo real permite cuidados integrativos e personalizados através de recomendações de protocolos inteligentes. Projetado para facilitar a descoberta clínica e estabelecer as bases para ensaios descentralizados que validem práticas de medicina integrativa baseadas em evidências.',
    },
    
    // Footer
    footer: {
      product: 'Produto',
      company: 'Empresa',
      legal: 'Legal',
      contact: 'Contato',
      about: 'Sobre Nós',
      blog: 'Blog',
      careers: 'Carreiras',
      terms: 'Termos',
      privacy: 'Privacidade',
      hipaa: 'HIPAA',
      security: 'Segurança',
      rights: 'Todos os direitos reservados.',
      vision: 'Visão: Liderar Health 3.0 na América Latina',
      visionItems: [
        { year: '2025', text: '1.000 médicos no MX e BR' },
        { year: '2026', text: 'Expansão para CO, AR, CL, PE' },
        { year: '2027', text: '10.000+ médicos ativos' },
        { year: '2030', text: 'Padrão Health 3.0 LATAM' },
      ],
      joinRevolution: 'Junte-se à revolução.',
      dontStayBehind: 'Não fique para trás.',
    },

    // AI Command Center
    aiCommandCenter: {
      navigation: {
        cdss: "Levando você ao Sistema de Suporte à Decisão Clínica (CDSS). Aqui você encontrará mais de 12 regras ativas que detectam problemas antes que ocorram, interações medicamentosas e protocolos OMS/OPAS.",
        scribe: "Perfeito! Levando você ao AI Medical Scribe. Esta ferramenta transcreve suas consultas em tempo real e gera notas SOAP automaticamente, economizando 3-4 horas diárias.",
        prevention: "Direcionando você ao Hub de Prevenção Longitudinal. Aqui você pode ver cronogramas de 30 anos, 7 domínios de saúde e mais de 100 intervenções preventivas baseadas em protocolos OMS/OPAS/USPSTF.",
        patients: "Levando você ao Portal de Gestão de Pacientes. Aqui você pode ver todos os seus pacientes, histórico completo e acessar o portal do paciente que reduz suas chamadas em 40%.",
        pricing: "Claro! Vou mostrar nossos planos de preços. Oferecemos desde o plano Starter gratuito até Enterprise personalizado. Todos incluem IA médica, prevenção automatizada e suporte em português.",
        login: "Levando você à página de login. Você pode entrar com o Google ou com sua conta Holi Labs.",
        dashboard: "Levando você ao Dashboard principal onde você pode ver um resumo dos seus pacientes ativos, consultas agendadas, prescrições pendentes e mais.",
      },
      defaultResponse: "Entendo que você está procurando por \"{query}\".\n\nPosso ajudá-lo com:\n• **Prevenção**: Sistema longitudinal de 30 anos com alertas automáticos\n• **AI Scribe**: Transcrição e notas SOAP em tempo real (economiza 3-4h/dia)\n• **CDSS**: Mais de 12 regras de suporte clínico com protocolos OMS/OPAS\n• **Pacientes**: Portal completo que reduz chamadas em 40%\n• **E-Prescribing**: Assinatura digital para mais de 8 farmácias integradas\n\nSobre o que você gostaria de saber mais?",
    },
    errorPages: {
      somethingWentWrong: 'Algo deu errado',
      unexpectedError: 'Ocorreu um erro inesperado',
      tryAgain: 'Tentar novamente',
      goHome: 'Ir para o Início',
      technicalDetails: 'Detalhes técnicos',
      notFound: 'Página não encontrada',
      notFoundCode: '404',
      goToSignIn: 'Ir para Login',
    },
  }
} as const;

export const languageNames: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
};

export const languageCodes: Record<Language, string> = {
  en: 'ENG',
  es: 'ESP',
  pt: 'PT',
};

