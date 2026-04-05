# MEMORANDO DE CLASSIFICAÇÃO REGULATÓRIA (ANVISA)

**Para:** Diretoria e Consultoria Regulatória HoliLabs
**Data:** [PREENCHER - Data]
**Assunto:** Análise de Enquadramento do Software HoliLabs (SaMD) conforme RDC 657/2022.

## 1. CONTEXTO
A HoliLabs desenvolve uma Plataforma de Inteligência Clínica (Prontuário Eletrônico, Prescrição Eletrônica e AI Scribe). Este memorando analisa a classificação de risco da plataforma como Software as a Medical Device (SaMD) junto à ANVISA, com atenção especial ao uso de Modelos de Linguagem (LLMs) para sumarização e auditoria clínica.

## 2. ANÁLISE DE FUNCIONALIDADES E RDC 657/2022

### A. Funcionalidades de Prontuário e Administrativas
Sistemas de prontuário eletrônico puro (armazenamento e exibição de dados) sem processamento diagnóstico geralmente **não são considerados produtos para saúde**, ou são enquadrados como Classe I.

### B. Suporte à Decisão Clínica (CDS)
A plataforma possui alertas de interações (ex: alergias). Conforme regras da ANVISA, se o CDS apenas apresenta informações baseadas em dados inseridos e bases farmacológicas determinísticas, para que o médico tome a decisão final, ele se mantém em **Classe I** (ou até não-regulado, dependendo da interpretação).

### C. Uso de Inteligência Artificial (Machine Learning / LLMs)
A funcionalidade "AI Scribe" capta áudio e utiliza LLMs (Deepgram, OpenAI, Anthropic) para transcrever e organizar o texto no formato SOAP. O módulo "Auditor" utiliza o OpenAI GPT-4o-mini para revisar anomalias no texto (adversarial auditing).

**Ponto de Atenção Regulatória:**
1. Se a IA apenas transcreve e formata (tarefa clerical) e exige a assinatura e revisão obrigatória do médico antes da efetivação no prontuário, a plataforma tem forte argumento para ser classificada como **Classe I** (Risco Baixo). O software atua como ferramenta de suporte administrativo, não emitindo diagnósticos.
2. Se a ANVISA interpretar que o módulo "Auditor" baseado em IA realiza triagem, sugere diagnósticos, ou altera o curso clínico sem intervenção humana direta, a classificação pode saltar para **Classe II** (Risco Médio), por utilizar Machine Learning/algoritmos não determinísticos em processos clínicos.

## 3. CONCLUSÃO E ESTRATÉGIA RECOMENDADA

**Recomendação de Submissão:** Tentar o enquadramento como **Classe I**.

**Justificativa:**
A HoliLabs atua estritamente em caráter **informativo e de apoio**. A IA nunca substitui a decisão médica. O design da interface obriga o profissional de saúde a revisar, editar e aprovar o texto gerado pela IA. Os alertas do CDS são determinísticos (regras "se/então").

**Impacto se classificado como Classe I:**
- Necessidade de AFE (Autorização de Funcionamento de Empresa).
- Procedimento simplificado de **Notificação** na ANVISA (não requer "Registro" complexo).
- Implementação de Boas Práticas de Fabricação (BPF) em formato simplificado (ISO 13485 / IEC 62304 proporcionais).

**Impacto se a ANVISA reclassificar para Classe II:**
- Necessidade de processo formal de **Registro**.
- Requisitos mais rigorosos de validação clínica e certificação do BPF.
- Ciclo de aprovação pode se estender de 30-60 dias para 6-12 meses.

**Ação Imediata:**
Apresentar o "Risk Management File" (HAZ-01 e HAZ-02) à consultoria regulatória demonstrando que as mitigações (revisão humana obrigatória) reduzem o risco clínico da IA para níveis aceitáveis, suportando a tese de Classe I.