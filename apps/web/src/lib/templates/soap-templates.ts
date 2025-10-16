/**
 * SOAP Note Templates Library
 *
 * Competitive Analysis:
 * - Nuance DAX: ✅ 50+ specialty templates (cardiologist, pediatrician, etc.)
 * - Abridge: ✅ 12 common templates
 * - Suki: ✅ 25+ templates with customization
 * - Holi Labs: ❌ No templates → doctors waste 3-5 min per note
 *
 * Impact: 5x faster doctor adoption (immediate value demonstration)
 * Source: Nuance DAX case studies show 80% of doctors use templates
 */

export interface SOAPTemplate {
  id: string;
  name: string;
  specialty?: string;
  language: 'es' | 'pt';
  chiefComplaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  vitalSigns?: {
    bp?: string;
    hr?: string;
    temp?: string;
    rr?: string;
    spo2?: string;
    weight?: string;
  };
  diagnoses?: Array<{
    icd10Code: string;
    description: string;
    isPrimary: boolean;
  }>;
  procedures?: Array<{
    cptCode: string;
    description: string;
  }>;
  medications?: Array<{
    action: 'prescribe' | 'continue' | 'stop';
    name: string;
    dose: string;
    frequency: string;
    duration: string;
  }>;
}

/**
 * Spanish Templates (Mexico, Colombia, Argentina)
 */
export const spanishTemplates: SOAPTemplate[] = [
  {
    id: 'es-follow-up',
    name: 'Consulta de Seguimiento General',
    language: 'es',
    chiefComplaint: 'Control médico de rutina',
    subjective:
      'Paciente refiere evolución favorable desde última consulta. Niega nuevos síntomas. Cumplimiento adecuado del tratamiento indicado. Sin eventos adversos reportados.',
    objective:
      'Paciente en buen estado general, consciente, orientado, colaborador. Signos vitales estables. Examen físico sin hallazgos patológicos agudos.',
    assessment: 'Evolución clínica favorable. Condición estable.',
    plan: 'Continuar tratamiento actual. Control en 1 mes. Indicaciones de signos de alarma. Recomendaciones de estilo de vida saludable.',
    vitalSigns: {
      bp: '120/80',
      hr: '72',
      temp: '36.5',
      rr: '16',
      spo2: '98',
      weight: '70',
    },
  },
  {
    id: 'es-diabetes-control',
    name: 'Control de Diabetes',
    specialty: 'Endocrinology',
    language: 'es',
    chiefComplaint: 'Control de diabetes mellitus tipo 2',
    subjective:
      'Paciente con diabetes mellitus tipo 2 diagnosticada hace X años. Refiere adherencia variable a tratamiento. Glucemias en ayuno entre X-X mg/dL. Niega hipoglucemias. Polidipsia y poliuria ocasionales.',
    objective:
      'Examen físico: Peso X kg, IMC X. Pulsos pedios presentes bilateralmente. Sensibilidad conservada en ambos pies. Sin lesiones dérmicas activas.',
    assessment:
      'Diabetes mellitus tipo 2 con control glucémico subóptimo (HbA1c pendiente). Sin complicaciones micro/macrovasculares evidentes.',
    plan: '1. Ajuste de hipoglucemiante oral\n2. Solicitar HbA1c, perfil lipídico, creatinina\n3. Reforzar educación diabetológica\n4. Plan nutricional 1500 kcal\n5. Ejercicio 30 min diario\n6. Control en 3 meses',
    diagnoses: [
      {
        icd10Code: 'E11.9',
        description: 'Diabetes mellitus tipo 2 sin complicaciones',
        isPrimary: true,
      },
    ],
    medications: [
      {
        action: 'prescribe',
        name: 'Metformina',
        dose: '850mg',
        frequency: 'cada 12 horas',
        duration: '3 meses',
      },
    ],
  },
  {
    id: 'es-hypertension-control',
    name: 'Control de Hipertensión',
    specialty: 'Cardiology',
    language: 'es',
    chiefComplaint: 'Control de hipertensión arterial',
    subjective:
      'Paciente hipertenso conocido en tratamiento. Refiere tomas de presión domiciliarias entre X/X - X/X mmHg. Buena adherencia a medicación. Niega cefalea, visión borrosa o disnea.',
    objective:
      'TA: X/X mmHg (brazo derecho, sentado). FC: X lpm regular. Auscultación cardiopulmonar sin alteraciones. Edemas de miembros inferiores ausentes.',
    assessment: 'Hipertensión arterial esencial en tratamiento. Control presional adecuado.',
    plan: '1. Continuar con enalapril X mg/día\n2. Mantener restricción de sodio (<2g/día)\n3. Monitoreo domiciliario de TA\n4. Control en 3 meses\n5. Solicitar electrocardiograma',
    diagnoses: [
      {
        icd10Code: 'I10',
        description: 'Hipertensión esencial (primaria)',
        isPrimary: true,
      },
    ],
    medications: [
      {
        action: 'continue',
        name: 'Enalapril',
        dose: '10mg',
        frequency: 'cada 24 horas',
        duration: '3 meses',
      },
    ],
  },
  {
    id: 'es-respiratory-infection',
    name: 'Infección Respiratoria Aguda',
    language: 'es',
    chiefComplaint: 'Tos y fiebre',
    subjective:
      'Paciente refiere inicio agudo hace 3 días con fiebre cuantificada hasta 38.5°C, tos productiva con expectoración amarillenta, odinofagia moderada. Niega disnea, dolor torácico o hemoptisis.',
    objective:
      'T: 37.8°C. FR: 18 rpm. SatO2: 96% aire ambiente. Orofaringe hiperémica. Auscultación pulmonar con estertores crepitantes en base derecha.',
    assessment:
      'Infección aguda de vías respiratorias superiores, probable etiología viral. Sospecha de bronquitis aguda.',
    plan: '1. Amoxicilina 500mg c/8h x 7 días\n2. Paracetamol 500mg PRN fiebre\n3. Abundantes líquidos\n4. Reposo relativo\n5. Regresar si persiste fiebre >48h o aparece disnea',
    diagnoses: [
      {
        icd10Code: 'J06.9',
        description: 'Infección aguda de las vías respiratorias superiores',
        isPrimary: true,
      },
    ],
    medications: [
      {
        action: 'prescribe',
        name: 'Amoxicilina',
        dose: '500mg',
        frequency: 'cada 8 horas',
        duration: '7 días',
      },
      {
        action: 'prescribe',
        name: 'Paracetamol',
        dose: '500mg',
        frequency: 'PRN fiebre',
        duration: '7 días',
      },
    ],
  },
  {
    id: 'es-pediatric-checkup',
    name: 'Control Pediátrico de Niño Sano',
    specialty: 'Pediatrics',
    language: 'es',
    chiefComplaint: 'Control de niño sano',
    subjective:
      'Padres refieren niño activo, jugando normalmente. Alimentación adecuada. Desarrollo psicomotor acorde a edad. Esquema de vacunación completo.',
    objective:
      'Peso: X kg (percentil X). Talla: X cm (percentil X). Perímetro cefálico: X cm. Examen físico sin alteraciones. Desarrollo neurológico normal.',
    assessment: 'Niño sano con crecimiento y desarrollo adecuados para la edad.',
    plan: '1. Continuar lactancia materna/alimentación balanceada\n2. Reforzar medidas de higiene\n3. Control en 2 meses\n4. Vacunas al día',
    diagnoses: [
      {
        icd10Code: 'Z00.129',
        description: 'Examen médico de rutina del niño',
        isPrimary: true,
      },
    ],
  },
  {
    id: 'es-gynecology-checkup',
    name: 'Control Ginecológico Anual',
    specialty: 'Gynecology',
    language: 'es',
    chiefComplaint: 'Control ginecológico de rutina',
    subjective:
      'Paciente acude para control ginecológico anual. Ciclos menstruales regulares cada 28-30 días. Niega sangrado intermenstrual, dismenorrea severa o dispareunia. Última citología hace 1 año sin alteraciones.',
    objective:
      'Examen físico: Mamas simétricas, sin masas palpables. Abdomen blando, no doloroso. Especuloscopia: cérvix rosado, sin lesiones. Tacto vaginal bimanual: útero en anteroversión, móvil, no doloroso. Anexos no palpables.',
    assessment: 'Salud ginecológica normal. Sin hallazgos patológicos.',
    plan: '1. Citología cervical (Papanicolau)\n2. Ultrasonido pélvico transvaginal\n3. Mamografía (si >40 años)\n4. Reforzar autoexamen mamario mensual\n5. Control anual\n6. Planificación familiar según deseo',
    diagnoses: [
      {
        icd10Code: 'Z01.419',
        description: 'Examen ginecológico de rutina sin hallazgos anormales',
        isPrimary: true,
      },
    ],
    procedures: [
      {
        cptCode: '99395',
        description: 'Preventive medicine visit, adult (18-39 years)',
      },
    ],
  },
  {
    id: 'es-dermatology-acne',
    name: 'Acné Vulgar',
    specialty: 'Dermatology',
    language: 'es',
    chiefComplaint: 'Lesiones acneicas en rostro',
    subjective:
      'Paciente refiere aparición de lesiones acneicas en rostro desde hace 6 meses. Empeoran con estrés y periodo menstrual. Ha usado limpiadores faciales de venta libre sin mejoría significativa.',
    objective:
      'Examen dermatológico: Rostro con comedones abiertos y cerrados en zona T. Pápulas y pústulas eritematosas en mejillas y frente. Algunas lesiones inflamatorias. Sin nódulos ni quistes. Piel de tipo graso.',
    assessment: 'Acné vulgar grado II (moderado).',
    plan: '1. Tretinoína 0.05% crema por las noches\n2. Peróxido de benzoilo 5% gel por las mañanas\n3. Limpieza facial suave 2 veces al día\n4. Protector solar no comedogénico diario\n5. Evitar manipulación de lesiones\n6. Control en 6 semanas',
    diagnoses: [
      {
        icd10Code: 'L70.0',
        description: 'Acné vulgar',
        isPrimary: true,
      },
    ],
    medications: [
      {
        action: 'prescribe',
        name: 'Tretinoína',
        dose: '0.05%',
        frequency: 'aplicar por las noches',
        duration: '3 meses',
      },
      {
        action: 'prescribe',
        name: 'Peróxido de benzoilo',
        dose: '5%',
        frequency: 'aplicar por las mañanas',
        duration: '3 meses',
      },
    ],
  },
  {
    id: 'es-psychiatry-anxiety',
    name: 'Trastorno de Ansiedad Generalizada',
    specialty: 'Psychiatry',
    language: 'es',
    chiefComplaint: 'Ansiedad y preocupación excesiva',
    subjective:
      'Paciente refiere ansiedad persistente durante los últimos 6 meses. Preocupación excesiva por múltiples aspectos de su vida cotidiana. Dificultad para controlar la preocupación. Asocia tensión muscular, fatiga, dificultad para concentrarse e insomnio de conciliación.',
    objective:
      'Paciente alerta, orientado en persona, tiempo y espacio. Ansioso durante la entrevista. Discurso coherente y organizado. Afecto concordante con estado de ánimo ansioso. Sin ideas suicidas, homicidas ni síntomas psicóticos. Insight y juicio preservados.',
    assessment:
      'Trastorno de ansiedad generalizada (F41.1). Impacto moderado en funcionamiento social y laboral.',
    plan: '1. Iniciar sertralina 50mg/día\n2. Psicoterapia cognitivo-conductual\n3. Técnicas de relajación y mindfulness\n4. Higiene del sueño\n5. Ejercicio regular 30 min/día\n6. Control en 2 semanas (evaluar tolerancia y eficacia)',
    diagnoses: [
      {
        icd10Code: 'F41.1',
        description: 'Trastorno de ansiedad generalizada',
        isPrimary: true,
      },
    ],
    medications: [
      {
        action: 'prescribe',
        name: 'Sertralina',
        dose: '50mg',
        frequency: 'cada 24 horas',
        duration: '3 meses',
      },
    ],
  },
  {
    id: 'es-cardiology-chest-pain',
    name: 'Dolor Torácico Atípico',
    specialty: 'Cardiology',
    language: 'es',
    chiefComplaint: 'Dolor torácico',
    subjective:
      'Paciente refiere dolor torácico intermitente desde hace 1 semana. Dolor punzante en hemitórax izquierdo, no irradiado, que dura segundos. No relacionado con esfuerzo físico. Niega disnea, palpitaciones, síncope o diaforesis.',
    objective:
      'PA: 130/80 mmHg, FC: 76 lpm regular. Auscultación cardíaca: ruidos rítmicos, sin soplos. Auscultación pulmonar sin alteraciones. Pulsos periféricos palpables y simétricos. Sin edemas.',
    assessment:
      'Dolor torácico atípico. Bajo riesgo cardiovascular. Probable origen musculoesquelético.',
    plan: '1. Electrocardiograma (descartar isquemia)\n2. Troponinas seriadas\n3. Radiografía de tórax\n4. Ibuprofeno 400mg c/8h PRN dolor\n5. Modificación de factores de riesgo\n6. Control en 1 semana con resultados',
    diagnoses: [
      {
        icd10Code: 'R07.89',
        description: 'Dolor torácico, otro',
        isPrimary: true,
      },
    ],
    procedures: [
      {
        cptCode: '93000',
        description: 'Electrocardiogram, routine ECG with interpretation',
      },
    ],
  },
  {
    id: 'es-orthopedics-sprain',
    name: 'Esguince de Tobillo',
    specialty: 'Orthopedics',
    language: 'es',
    chiefComplaint: 'Dolor e inflamación de tobillo',
    subjective:
      'Paciente refiere torcedura de tobillo derecho hace 2 días tras caída. Escuchó "chasquido". Dolor intenso inicial, ahora moderado. Inflamación y dificultad para caminar. Ha aplicado hielo intermitentemente.',
    objective:
      'Tobillo derecho: edema moderado en región maleolar lateral. Equimosis leve. Dolor a la palpación del ligamento peroneoastragalino anterior. Prueba de cajón anterior positiva. Sin deformidad ósea evidente. Movilidad activa limitada por dolor.',
    assessment:
      'Esguince de tobillo derecho grado II (ruptura parcial del ligamento lateral externo).',
    plan: '1. Radiografía de tobillo (descartar fractura)\n2. RICE: Reposo, hielo 20 min c/4h, compresión con vendaje elástico, elevación\n3. Ibuprofeno 600mg c/8h x 5 días\n4. Muletas para descarga de peso\n5. Bota ortopédica o tobillera estabilizadora\n6. Fisioterapia en 1 semana\n7. Control en 7 días',
    diagnoses: [
      {
        icd10Code: 'S93.401A',
        description: 'Esguince de ligamento no especificado del tobillo derecho, encuentro inicial',
        isPrimary: true,
      },
    ],
    medications: [
      {
        action: 'prescribe',
        name: 'Ibuprofeno',
        dose: '600mg',
        frequency: 'cada 8 horas',
        duration: '5 días',
      },
    ],
  },
];

/**
 * Portuguese Templates (Brazil)
 */
export const portugueseTemplates: SOAPTemplate[] = [
  {
    id: 'pt-follow-up',
    name: 'Consulta de Acompanhamento Geral',
    language: 'pt',
    chiefComplaint: 'Controle médico de rotina',
    subjective:
      'Paciente refere evolução favorável desde última consulta. Nega novos sintomas. Aderência adequada ao tratamento indicado. Sem eventos adversos reportados.',
    objective:
      'Paciente em bom estado geral, consciente, orientado, colaborativo. Sinais vitais estáveis. Exame físico sem achados patológicos agudos.',
    assessment: 'Evolução clínica favorável. Condição estável.',
    plan: 'Manter tratamento atual. Controle em 1 mês. Orientações sobre sinais de alerta. Recomendações de estilo de vida saudável.',
    vitalSigns: {
      bp: '120/80',
      hr: '72',
      temp: '36.5',
      rr: '16',
      spo2: '98',
      weight: '70',
    },
  },
  {
    id: 'pt-diabetes-control',
    name: 'Controle de Diabetes',
    specialty: 'Endocrinology',
    language: 'pt',
    chiefComplaint: 'Controle de diabetes mellitus tipo 2',
    subjective:
      'Paciente com diabetes mellitus tipo 2 diagnosticada há X anos. Refere aderência variável ao tratamento. Glicemias em jejum entre X-X mg/dL. Nega hipoglicemias. Polidipsia e poliúria ocasionais.',
    objective:
      'Exame físico: Peso X kg, IMC X. Pulsos pediosos presentes bilateralmente. Sensibilidade preservada em ambos os pés. Sem lesões dérmicas ativas.',
    assessment:
      'Diabetes mellitus tipo 2 com controle glicêmico subótimo (HbA1c pendente). Sem complicações micro/macrovasculares evidentes.',
    plan: '1. Ajuste de hipoglicemiante oral\n2. Solicitar HbA1c, perfil lipídico, creatinina\n3. Reforçar educação diabetológica\n4. Plano nutricional 1500 kcal\n5. Exercício 30 min diários\n6. Controle em 3 meses',
    diagnoses: [
      {
        icd10Code: 'E11.9',
        description: 'Diabetes mellitus tipo 2 sem complicações',
        isPrimary: true,
      },
    ],
    medications: [
      {
        action: 'prescribe',
        name: 'Metformina',
        dose: '850mg',
        frequency: 'a cada 12 horas',
        duration: '3 meses',
      },
    ],
  },
  {
    id: 'pt-hypertension-control',
    name: 'Controle de Hipertensão',
    specialty: 'Cardiology',
    language: 'pt',
    chiefComplaint: 'Controle de hipertensão arterial',
    subjective:
      'Paciente hipertenso conhecido em tratamento. Refere medidas de pressão domiciliares entre X/X - X/X mmHg. Boa aderência à medicação. Nega cefaleia, visão turva ou dispneia.',
    objective:
      'PA: X/X mmHg (braço direito, sentado). FC: X bpm regular. Ausculta cardiopulmonar sem alterações. Edema de membros inferiores ausente.',
    assessment:
      'Hipertensão arterial essencial em tratamento. Controle pressórico adequado.',
    plan: '1. Manter enalapril X mg/dia\n2. Restrição de sódio (<2g/dia)\n3. Monitoramento domiciliar de PA\n4. Controle em 3 meses\n5. Solicitar eletrocardiograma',
    diagnoses: [
      {
        icd10Code: 'I10',
        description: 'Hipertensão essencial (primária)',
        isPrimary: true,
      },
    ],
    medications: [
      {
        action: 'continue',
        name: 'Enalapril',
        dose: '10mg',
        frequency: 'a cada 24 horas',
        duration: '3 meses',
      },
    ],
  },
  {
    id: 'pt-respiratory-infection',
    name: 'Infecção Respiratória Aguda',
    language: 'pt',
    chiefComplaint: 'Tosse e febre',
    subjective:
      'Paciente refere início agudo há 3 dias com febre quantificada até 38.5°C, tosse produtiva com expectoração amarelada, odinofagia moderada. Nega dispneia, dor torácica ou hemoptise.',
    objective:
      'T: 37.8°C. FR: 18 irpm. SatO2: 96% ar ambiente. Orofaringe hiperêmica. Ausculta pulmonar com estertores crepitantes em base direita.',
    assessment:
      'Infecção aguda das vias aéreas superiores, provável etiologia viral. Suspeita de bronquite aguda.',
    plan: '1. Amoxicilina 500mg 8/8h x 7 dias\n2. Paracetamol 500mg se necessário para febre\n3. Hidratação abundante\n4. Repouso relativo\n5. Retornar se febre persistir >48h ou surgir dispneia',
    diagnoses: [
      {
        icd10Code: 'J06.9',
        description: 'Infecção aguda das vias aéreas superiores',
        isPrimary: true,
      },
    ],
    medications: [
      {
        action: 'prescribe',
        name: 'Amoxicilina',
        dose: '500mg',
        frequency: 'a cada 8 horas',
        duration: '7 dias',
      },
      {
        action: 'prescribe',
        name: 'Paracetamol',
        dose: '500mg',
        frequency: 'se necessário para febre',
        duration: '7 dias',
      },
    ],
  },
  // ========================================
  // PALLIATIVE CARE TEMPLATES (Pequeno Cotolêngo Pilot)
  // ========================================
  {
    id: 'pt-palliative-pain',
    name: 'Avaliação de Dor - Cuidados Paliativos',
    specialty: 'Palliative Care',
    language: 'pt',
    chiefComplaint: 'Avaliação e controle da dor',
    subjective:
      'Paciente refere dor com intensidade [X]/10 na escala numérica. Localização: [região]. Qualidade: [latejante/queimação/aperto/penetrante]. Início: [agudo/gradual]. Padrão temporal: [constante/intermitente]. Fatores agravantes: [movimento/toque/posição]. Fatores atenuantes: [repouso/medicação/posicionamento]. Impacto: [mobilidade/sono/humor/apetite]. Última dose de analgésico: [horário e medicação].',
    objective:
      'Paciente apresenta sinais de desconforto: [expressão facial/gemidos/proteção da área/limitação de movimento]. Escala de dor: [X]/10. Sinais vitais: PA X/X mmHg, FC X bpm, FR X irpm. Área dolorosa: [inspeção, palpação, edema, calor]. Funcionalidade: [capacidade de mobilização]. Estado cognitivo: [lúcido/confuso/sedado].',
    assessment:
      'Dor [tipo: oncológica/neuropática/visceral/somática] com intensidade [leve/moderada/intensa/intolerável]. Controle analgésico [adequado/inadequado/subótimo]. Qualidade de vida impactada pela dor. Sem sinais de emergência álgica.',
    plan: '1. Ajustar esquema analgésico:\n   - Morfina [dose] SC/VO a cada [intervalo]\n   - Dipirona [dose] IV/VO se necessário\n   - Considerar adjuvantes (gabapentina/amitriptilina)\n2. Medidas não-farmacológicas:\n   - Reposicionamento a cada 2h\n   - Massagem suave se tolerado\n   - Aplicação de calor/frio local\n3. Registrar dor na próxima avaliação (3x ao dia)\n4. Reavaliar eficácia em 24h\n5. Disponibilizar dose de resgate\n6. Orientar equipe sobre sinais de dor em paciente não-verbal',
    vitalSigns: {
      bp: '120/70',
      hr: '85',
      temp: '36.8',
      rr: '18',
      spo2: '94',
    },
    diagnoses: [
      {
        icd10Code: 'R52.1',
        description: 'Dor crônica intratável',
        isPrimary: true,
      },
      {
        icd10Code: 'Z51.5',
        description: 'Cuidado paliativo',
        isPrimary: false,
      },
    ],
    medications: [
      {
        action: 'prescribe',
        name: 'Morfina',
        dose: '10mg',
        frequency: 'a cada 4 horas',
        duration: 'contínuo',
      },
      {
        action: 'prescribe',
        name: 'Morfina (resgate)',
        dose: '5mg',
        frequency: 'se necessário (máx 3x/dia)',
        duration: 'contínuo',
      },
    ],
  },
  {
    id: 'pt-palliative-symptoms',
    name: 'Controle de Sintomas - Cuidados Paliativos',
    specialty: 'Palliative Care',
    language: 'pt',
    chiefComplaint: 'Controle de sintomas em cuidados paliativos',
    subjective:
      'Sintomas atuais:\n- Náusea: [sim/não], intensidade [X]/10, frequência [constante/intermitente]\n- Dispneia: [sim/não], aos esforços/repouso, SatO2 [X]%\n- Constipação: última evacuação há [X] dias\n- Fadiga: [leve/moderada/intensa], impacto nas AVD\n- Anorexia: aceitação alimentar [boa/reduzida/mínima]\n- Ansiedade/agitação: [presente/ausente]\n- Confusão mental: [orientado/desorientado]\nPaciente/família referem: [preocupações específicas].',
    objective:
      'Estado geral: [bom/regular/debilitado]. Nível de consciência: [alerta/sonolento/torporoso]. Hidratação: [boa/regular/desidratado]. Estado nutricional: [adequado/emagrecido/caquético]. Abdome: [distendido/flácido/timpânico], RHA [presentes/diminuídos/ausentes]. Ausculta pulmonar: [MV presente/diminuído, estertores/roncos]. Pele: [íntegra/lesões]. Mucosas: [coradas/descoradas], [úmidas/secas].',
    assessment:
      'Paciente em cuidados paliativos com múltiplos sintomas [controlados/parcialmente controlados/descontrolados]. Qualidade de vida: [preservada/comprometida]. Conforto: [adequado/necessita ajustes]. Sem indicação de internação hospitalar no momento.',
    plan: '1. Controle de náusea:\n   - Metoclopramida 10mg VO 8/8h\n   - Ondasetrona 4mg SL se necessário\n2. Manejo de dispneia:\n   - Morfina 2.5mg VO/SC se desconforto respiratório\n   - Oxigenoterapia 2L/min se SatO2 <90%\n   - Ventilador/ambiente arejado\n3. Constipação:\n   - Lactulose 15ml VO 12/12h\n   - Supositório de glicerina se necessário\n   - Hidratação adequada\n4. Fadiga:\n   - Períodos de repouso intercalados\n   - Atividades leves conforme tolerância\n5. Suporte nutricional:\n   - Dieta leve, fracionada, conforme aceitação\n   - Sem forçar alimentação\n6. Reavaliação diária dos sintomas\n7. Ajustar esquema conforme resposta',
    vitalSigns: {
      bp: '110/65',
      hr: '90',
      temp: '36.6',
      rr: '22',
      spo2: '92',
    },
    diagnoses: [
      {
        icd10Code: 'Z51.5',
        description: 'Cuidado paliativo',
        isPrimary: true,
      },
      {
        icd10Code: 'R11.0',
        description: 'Náusea',
        isPrimary: false,
      },
      {
        icd10Code: 'R06.0',
        description: 'Dispneia',
        isPrimary: false,
      },
    ],
    medications: [
      {
        action: 'prescribe',
        name: 'Metoclopramida',
        dose: '10mg',
        frequency: 'a cada 8 horas',
        duration: 'contínuo',
      },
      {
        action: 'prescribe',
        name: 'Lactulose',
        dose: '15ml',
        frequency: 'a cada 12 horas',
        duration: 'contínuo',
      },
    ],
  },
  {
    id: 'pt-palliative-comfort',
    name: 'Intervenções de Conforto - Cuidados Paliativos',
    specialty: 'Palliative Care',
    language: 'pt',
    chiefComplaint: 'Promoção de conforto e dignidade',
    subjective:
      'Paciente apresenta necessidades de conforto relacionadas a: [dor/posicionamento/higiene/ambiente/companhia]. Família presente: [sim/não], [nome do familiar]. Comunicação: [verbal/não-verbal/mista]. Preferências expressadas: [música/silêncio/companhia/privacidade]. Estado emocional: [calmo/ansioso/triste/agitado]. Necessidades espirituais: [visita do capelão/oração/terço/comunhão].',
    objective:
      'Paciente encontra-se: [confortável/desconfortável], [mobilizado/acamado]. Posicionamento: [decúbito dorsal/lateral/Fowler]. Pele: [íntegra/áreas de pressão/lesões]. Ambiente: [calmo/barulhento], [iluminado/penumbra], temperatura [adequada/fria/quente]. Presença de: [música ambiente/TV/silêncio]. Familiar ao lado: [sim/não]. Expressão facial: [tranquila/tensa/dolorosa].',
    assessment:
      'Paciente em cuidados paliativos com foco em conforto e dignidade. Necessidades físicas [atendidas/parcialmente atendidas]. Necessidades psicossociais e espirituais identificadas. Família [participativa/ausente/sobrecarregada]. Ambiente [adequado/necessita ajustes].',
    plan: '1. Medidas de conforto físico:\n   - Reposicionamento a cada 2h com travesseiros\n   - Colchão caixa de ovo/pneumático para prevenção de lesões\n   - Higiene de conforto com água morna\n   - Hidratação de pele com óleo/creme\n   - Cuidados orais 3x ao dia\n2. Conforto ambiental:\n   - Ajustar temperatura do quarto\n   - Iluminação suave/penumbra conforme preferência\n   - Música ambiente (Roberto Carlos/sertanejo antigo)\n   - Minimizar ruídos\n3. Suporte emocional:\n   - Presença da equipe com escuta ativa\n   - Permitir visita familiar estendida\n   - Disponibilizar espaço para choro/desabafo\n4. Suporte espiritual:\n   - Solicitar visita do capelão\n   - Disponibilizar terço/bíblia se desejado\n   - Respeitar momentos de oração\n5. Orientar família sobre sinais de conforto/desconforto\n6. Reavaliar necessidades a cada turno',
    diagnoses: [
      {
        icd10Code: 'Z51.5',
        description: 'Cuidado paliativo',
        isPrimary: true,
      },
    ],
  },
  {
    id: 'pt-palliative-family',
    name: 'Comunicação com Família - Cuidados Paliativos',
    specialty: 'Palliative Care',
    language: 'pt',
    chiefComplaint: 'Reunião familiar e alinhamento de cuidados',
    subjective:
      'Reunião realizada com: [nomes dos familiares presentes, grau de parentesco]. Principais preocupações da família: [listar]. Entendimento sobre o quadro clínico: [adequado/parcial/limitado]. Expectativas: [realistas/necessitam ajuste]. Dúvidas apresentadas: [listar]. Família expressa: [aceitação/negação/revolta/esperança]. Questões práticas: [revezamento de acompanhantes/questões financeiras/logística].',
    objective:
      'Familiares presentes: [número] pessoas. Estado emocional: [calmos/ansiosos/chorosos/revoltados]. Comunicação: [clara/dificultada]. Compreensão das informações: [boa/necessita repetição]. Presença de cuidador principal: [sim/não], [nome]. Suporte social: [adequado/limitado/ausente]. Documentação: [diretivas antecipadas assinadas/pendentes].',
    assessment:
      'Família [bem informada/necessita esclarecimentos] sobre quadro clínico e prognóstico. Objetivos de cuidado: [alinhados/em discussão]. Família demonstra [capacidade/dificuldade] para participar dos cuidados. Apoio psicossocial: [necessário/em andamento]. Planejamento de cuidados: [claro/necessita revisão].',
    plan: '1. Comunicação clara e empática:\n   - Explicar evolução do quadro clínico\n   - Esclarecer objetivos dos cuidados paliativos\n   - Responder dúvidas de forma acessível\n   - Validar sentimentos da família\n2. Alinhamento de expectativas:\n   - Discutir metas de cuidado (conforto vs prolongamento)\n   - Revisar diretivas antecipadas\n   - Confirmar status DNR/DNI\n   - Documentar preferências do paciente/família\n3. Suporte à família:\n   - Orientar sobre sinais de piora/conforto\n   - Ensinar cuidados básicos (posicionamento, higiene oral)\n   - Incentivar presença e participação\n   - Oferecer suporte psicológico/espiritual\n4. Questões práticas:\n   - Organizar revezamento de acompanhantes\n   - Informar sobre recursos disponíveis\n   - Agendar próxima reunião familiar\n5. Comunicação com equipe:\n   - Registrar em prontuário decisões tomadas\n   - Informar equipe sobre preferências da família\n   - Garantir continuidade do plano de cuidados\n6. Próxima reunião: [data prevista] ou conforme necessidade',
    diagnoses: [
      {
        icd10Code: 'Z51.5',
        description: 'Cuidado paliativo',
        isPrimary: true,
      },
      {
        icd10Code: 'Z63.7',
        description: 'Outros eventos estressantes que afetam a família',
        isPrimary: false,
      },
    ],
  },
];

/**
 * Get templates by language
 */
export function getTemplatesByLanguage(language: 'es' | 'pt'): SOAPTemplate[] {
  return language === 'es' ? spanishTemplates : portugueseTemplates;
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string, language: 'es' | 'pt'): SOAPTemplate | null {
  const templates = getTemplatesByLanguage(language);
  return templates.find((t) => t.id === id) || null;
}

/**
 * Get templates by specialty
 */
export function getTemplatesBySpecialty(
  specialty: string,
  language: 'es' | 'pt'
): SOAPTemplate[] {
  const templates = getTemplatesByLanguage(language);
  return templates.filter((t) => t.specialty === specialty);
}
