# LATAM Health Tech Legal Research: ToS & Privacy Policy Analysis

> **Research Date:** March 10, 2026
> **Scope:** 8 LATAM health tech companies + LGPD regulatory framework
> **Purpose:** Inform Holi Labs / Cortex legal document drafting

---

## Table of Contents

1. [Company-by-Company Analysis](#company-analysis)
2. [LGPD Regulatory Framework](#lgpd-framework)
3. [ANVISA RDC 657/2022 & CFM 2.314/2022](#regulatory-framework)
4. [Cross-Company Pattern Analysis](#patterns)
5. [Holi Labs Requirements Summary](#holi-labs-requirements)

---

## 1. Company-by-Company Analysis <a name="company-analysis"></a>

### 1.1 Conexa Saúde (conexasaude.com.br)

**Company:** CONEXA SAÚDE SERVIÇOS MÉDICOS S.A. (CNPJ 27.092.748/0001-18) + PSICOLOGIA VIVA S.A. (CNPJ 28.567.713/0001-50)
**Type:** Telehealth platform (largest in Latin America by their own claim)
**Policy Updated:** February 25, 2025 (Privacy) / October 14, 2025 (ToS)

#### LGPD Compliance Language

Conexa explicitly cites LGPD articles as legal bases for each data category:

> **EXACT QUOTE (Portuguese):** "Idade, sexo, peso, altura, existência de plano de saúde, exames médicos e informações adicionais de saúde — Finalidade: Prestação de serviços de telessaúde aos Pacientes — Base Legal: Consentimento (art. 7, I e 11, I da LGPD) e tutela da saúde (art. 7º, VIII e 11, II, f da LGPD)"

They use a **dual legal basis** approach for health data: both consent (Art. 11, I) AND health protection (Art. 11, II, f — "tutela da saúde").

#### Data Sovereignty

> **EXACT QUOTE:** "Os dados pessoais armazenados pela Plataforma CONEXA estão sujeitos às regras para transferência internacional de dados estabelecidas pelo art. 33 da Lei Geral de Proteção de Dados e deve ser realizada apenas para países que proporcionem proteção semelhante à existente no Brasil."

No explicit disclosure of server locations (unlike iClinic).

#### Consent Mechanisms

**Blanket consent model** at registration: "Ao utilizar a Plataforma CONEXA SAÚDE, você [...] autoriza a coleta e o processamento de seus dados pessoais e dados pessoais sensíveis"

Marketing consent is **granular** — separate opt-in for promotional messages with opt-out mechanism.

#### Right to Erasure

> **EXACT QUOTE:** "O Paciente ou Profissional de Saúde tem direito de solicitar a exclusão dos seus dados pessoais [...] salvo nos casos de obrigação legal ou decisão judicial, de acordo com o disposto nos artigos 18, XVI, e 16 da LGPD."

**Medical records exception:** "A CONEXA SAÚDE mantém os prontuários médicos armazenados, de forma segura, pelo prazo de 20 (vinte) anos" (citing Lei 13.787/2018 Art. 6 and CFM Resolution 1.821/2007 Art. 8). Psychology records: 5 years (CFP Resolution 6/2019).

#### Data Portability

> **EXACT QUOTE:** "Portabilidade: direito de solicitar uma cópia dos seus dados pessoais em formato eletrônico e/ou transmitir os referidos dados pessoais para utilização no serviço de terceiros"

Contact channel: privacy@conexasaude.com.br, 15-day response SLA.

#### Cross-Border Transfer

References Art. 33 LGPD but does not specify server locations or specific mechanisms (CPCs, BCRs, etc.).

#### Medical Professional Liability Framing

> **EXACT QUOTE:** "A Conexa Saúde não toma qualquer decisão pelos Pacientes e não é responsável por elas, vez que é projetada apenas para conectar o Paciente ao Profissional de Saúde para a realização de teleconsulta e possibilitar o cuidado integrado em saúde."

> **EXACT QUOTE:** "Você declara ter ciência de que o Profissional de Saúde cadastrado dispõe de ampla e irrestrita autonomia em relação ao diagnóstico clínico, atendimento e prescrições de medicamentos e tratamentos, de modo a isentar a CONEXA de toda responsabilidade relacionada ou decorrente de qualquer erro, problema ou complicação de saúde"

#### SaMD/ANVISA Compliance

No explicit ANVISA/SaMD disclaimer found. Platform positions itself as a "connection" platform rather than a clinical decision tool. Careful avoidance of diagnostic claims.

#### Regulatory References Cited

- Lei nº 13.709/2018 (LGPD)
- Lei nº 8.078/1990 (CDC — Consumer Protection)
- Lei nº 12.965/2014 (Marco Civil da Internet)
- Lei nº 13.787/2018 (Lei do Prontuário Eletrônico)
- Lei nº 14.510/2022 (Lei da Telessaúde)
- Resolução CFM nº 2.314/2022 (Telemedicine)
- Resolução CFM nº 2.217/2018 (Código de Ética Médica)
- Resolução CFP nº 11/2018, nº 10/2005 (Psychology)
- Resolução CFN nº 666/2020, nº 599/2018 (Nutrition)
- Resolução COFEN nº 696/2022, nº 707/2022, nº 564/2017 (Nursing)
- Resolução CFFa nº 580/2020, nº 490/2016 (Speech Therapy)

#### Dispute Resolution

Foro central da comarca da cidade do Rio de Janeiro (court jurisdiction, no arbitration clause).

#### AI Disclaimer (Clari chatbot)

> **EXACT QUOTE:** "A Clari é um chatbot desenvolvido para auxiliar o Paciente na navegação da Plataforma, oferecer suporte, bem como oferecer informações nutricionais de alimentos a pedido do próprio Paciente."

Carefully positions AI as navigation/support assistant, NOT clinical tool.

---

### 1.2 Dr. Consulta (drconsulta.com)

**Type:** Brazilian health clinics + tech platform
**Policy Status:** Privacy policy page not publicly accessible at standard URLs (404 errors on /politica-privacidade and /termos-de-uso)

#### Key Findings (from search results and app store data)

- Requires consent for teleconsulta including video/audio recording and electronic health record attachment
- Data stored in "ambiente seguro" (secure environment)
- No sharing with unauthorized third parties without "autorização prévia expressa e inequívoca"
- Data deletion available with up to 180-day processing time
- Has a designated DPO (Data Protection Officer)
- Patients can control camera and audio during consultations

**LIMITATION:** Full policy text could not be retrieved. Dr. Consulta may serve their legal docs via dynamic/authenticated pages or PDFs.

---

### 1.3 iClinic (iclinic.com.br) — Part of Afya Group

**Company:** AFYA PARTICIPAÇÕES S.A. (CNPJ 23.399.329/0006-87)
**Type:** Clinic management SaaS platform
**Role Distinction:** iClinic acts as **Operador (Processor)** for patient data; the clinic is the **Controlador (Controller)**

#### LGPD Compliance Language

> **EXACT QUOTE:** "A presente Política de Privacidade tem por finalidade demonstrar o compromisso da AFYA PARTICIPAÇÕES S.A. [...] com a privacidade e a proteção dos dados pessoais coletados de seus USUÁRIOS, estabelecendo as regras sobre o tratamento dos dados [...] de acordo com as leis em vigor, com transparência e clareza junto ao USUÁRIO e ao mercado em geral."

Consent described as: "livre, informada, destacada, específica e legítima" (free, informed, highlighted, specific, and legitimate).

#### Data Sovereignty

> **EXACT QUOTE:** "Os dados coletados são armazenados em nuvem (cloud computing) da Amazon com servidores localizados no Brasil e Estados Unidos."

> **EXACT QUOTE:** "A transferência internacional será realizada somente para esses agentes e finalidades descritas nesta Política de Privacidade, os quais aplicam as melhores práticas internacionais de proteção de dados pessoais e garantem proporcionar grau de proteção de dados pessoais adequado ao previsto na Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais - LGPD), conforme exigência do art. 33, inciso I da lei."

**Best practice identified:** Explicitly names cloud provider (AWS), discloses server countries, and cites Art. 33, I specifically.

#### Consent Mechanisms

Consent is revocable: "O USUÁRIO poderá alterar suas concessões de consentimento, conceder novas permissões ou retirar seu consentimento para as permissões atuais por meio dos canais de atendimento"

Users are warned about consequences of withdrawal.

#### Right to Erasure

> **EXACT QUOTE:** "Caso haja solicitação de eliminação dos dados pelo USUÁRIO, essa eliminação somente poderá ocorrer se já não houver mais finalidade de uso nem obrigação legal, regulatória ou judicial que justifique sua retenção."

**Medical records responsibility:** "A guarda dos dados relacionados ao prontuário do paciente é de responsabilidade integral da clínica, conforme a legislação específica do setor."

**Data export deadline:** 60 days from contract termination for clinic admin to export data.

#### Data Portability

> **EXACT QUOTE:** "Tendo em vista o papel de Operador que a ICLINIC desempenha em relação aos dados de pacientes, a portabilidade dos dados de prontuários médicos deverá ser solicitada pelo próprio paciente ao profissional de saúde que o atende ou à clínica em que realize tratamento de saúde, responsável pela guarda dos dados dos prontuários."

**Best practice:** Clear distinction between Operator (iClinic) and Controller (clinic) for portability requests.

#### Cross-Border Transfer

AWS servers in Brazil and US. Cites Art. 33, I LGPD (adequate protection level). Partners contractually bound to LGPD-equivalent protections.

#### Medical Professional Liability Framing

> **EXACT QUOTE:** "A ICLINIC não utiliza nenhum tipo de decisão automatizada que impacte o USUÁRIO."

Note: iClinic explicitly disclaims automated decision-making.

#### SaMD/ANVISA Compliance

For AI features (prontuário optimization):

> **Paraphrased from addendum:** iClinic implements anonymization of direct personal data (names, addresses) before AI processing. Data is NOT used for AI model training.

#### Security Standards

> **EXACT QUOTE:** "A ICLINIC [...] os armazena na nuvem da Amazon, que aplica as mais avançadas técnicas de segurança da informação disponíveis no mercado, sendo certificada e recertificada no atendimento a todos os requisitos de segurança determinados pela ISO 27018, o código de melhores práticas internacionais para proteção de dados pessoais na nuvem"

Uses SALT for password hashing, backup, data segregation by organization.

#### Dispute Resolution

> **EXACT QUOTE:** "Eleito o foro do domicílio do USUÁRIO para dirimir qualquer litígio ou controvérsia envolvendo o presente documento" (consumer-friendly: plaintiff's domicile).

---

### 1.4 Doctoralia Brasil (doctoralia.com.br) — Part of Docplanner Group

**Company:** DOCTORALIA BRASIL SERVICOS ONLINE E SOFTWARE LTDA (CNPJ 27.053.196/0001-39), Curitiba, Paraná
**Type:** Doctor appointment marketplace (B2B for professionals, B2C for patients)
**Parent:** Docplanner Group (Poland-based, operating in 13 countries)

#### Medical Professional Liability Framing

> **EXACT QUOTE:** "A Doctoralia não presta qualquer forma de serviço de saúde sendo, portanto, uma mera plataforma digital de divulgação de profissionais de saúde e avaliação de atendimento pelos Pacientes e/ou Usuários."

> **EXACT QUOTE:** "A Doctoralia não é responsabilizável pelos atos dos pacientes e/ou usuários ou dos profissionais, sendo que, no caso de dano decorrente de seus atos, deverá ser mantida indene, não podendo responder por ato de terceiro."

#### Cross-Border Transfer (via Google Integration)

> **EXACT QUOTE:** "O Profissional reconhece que a criação da conta no Google My Business (i) implica uma transferência de dados pessoais para o Google LLC, que será um controlador independente de tais dados, (ii) pode implicar uma transferência internacional de dados para as afiliadas do Google nos Estados Unidos e (iii) é regido pelos termos aplicáveis do Google"

**Best practice:** Explicit disclosure of cross-border transfer via third-party integrations.

#### Consent Mechanisms (Patient Teleconsulta)

Consent for teleconsulta includes acknowledgment of:
- Video, audio, and chat recording attached to electronic health records
- Secure data storage with guaranteed confidentiality
- No sharing with unauthorized third parties without "autorização expressa e inequívoca"
- Patient control over camera and audio

#### Professional Obligations

> **EXACT QUOTE:** "Observar as normas e padrões éticos, médicos e terapêuticas aplicáveis e, em particular, apontar ao Paciente a necessidade de uma consulta pessoal adicional (no local) conforme necessário"

> **EXACT QUOTE:** "O Profissional garante que terá uma base legal adequada para enviar comunicações através dos Serviços e isenta a Doctoralia de qualquer reclamação ou responsabilidade"

#### Dispute Resolution

Not explicitly found in the professional terms. The ToS uses IPCA-indexed annual price adjustments with 30-day notice.

---

### 1.5 Docplanner (docplanner.com) — Global Platform

**Company:** Docplanner Group (HQ Warsaw, Poland)
**Type:** Global health appointment marketplace
**Coverage:** 13 countries (Poland, Brazil, Mexico, Spain, Italy, Germany, Turkey, Colombia, Czech Republic, Portugal, Argentina, Peru, Chile)

#### Key Findings

- Maintains localized privacy policies per jurisdiction
- Publishes Trust and Transparency Report
- "Safety and Confidentiality" as stated core values
- Privacy as stated "top priority" with data kept "confidential and secure"
- GDPR-compliant for European operations, LGPD-compliant for Brazilian operations
- Dedicated help center articles on data protection policies
- Multi-language support aligned with operating countries

**LIMITATION:** Global privacy policy text not accessible via public URLs during research. Docplanner uses localized policies per country through their help center.

---

### 1.6 TiSaúde (tisaude.com.br)

**Company:** TiSaúde
**Type:** Brazilian healthcare management platform (clinic management, EHR)
**Scale:** 42,000+ users, 13M+ digital medical records

#### Key Findings

- **LGPD compliant** (stated)
- **SBIS certified** (Sociedade Brasileira de Informática em Saúde) in 3 modalities — first in market to achieve this
- Runs on **AWS servers** with daily backups
- Offers secure data migration from other systems
- Privacy policy page returned 404 at time of research (https://tisaude.com.br/politica-de-privacidade/)

**LIMITATION:** Privacy policy and terms not publicly accessible at documented URLs.

---

### 1.7 Laura (laura-br.com)

**Company:** Laura (founded by Jac Fressatto)
**Type:** Clinical decision support AI platform — detects clinical deterioration in hospitalized patients
**Scale:** 24,258+ lives helped, 8.6M+ encounters, 2.5M+ patients since 2016

#### Product Positioning (SaMD-relevant)

Laura positions itself using language like:
- "Identificar precocemente deterioração clínica" (early identification of clinical deterioration)
- "Analisar dados de pacientes e emitir alertas em tempo real" (analyze patient data and emit real-time alerts)
- "Detecção de deterioração clínica com antecipação de até 12 horas" (detect clinical deterioration up to 12 hours in advance)

**IMPORTANT NOTE:** This language ("detectar," "identificar") could trigger SaMD classification concerns under ANVISA RDC 657/2022. Laura likely operates under Class II or III SaMD classification given its clinical decision support nature.

#### Results Claims

- 25% reduction in general mortality
- 7-hour reduction in average hospital stay per patient
- R$ 5.5M in hospital cost savings

#### IDB Recognition

Laura is recognized by the IDB's fAIrLAC initiative for responsible AI in Latin America, suggesting external validation of ethical AI practices.

**LIMITATION:** ToS, Privacy Policy, and LGPD compliance documentation not found on public website. Laura operates primarily as a B2B hospital solution, so legal documents may be part of enterprise contracts rather than public-facing policies.

---

### 1.8 MV Informática (mv.com.br)

**Company:** MV (multinational, founded 1987 in Porto Alegre)
**Type:** Hospital information systems (HIS), electronic health records (EHR)
**Scale:** 4,000+ clients, Latin America market leader, expanding to US (announced Oct 2025)

#### Key Findings

- **PEP MV** (Electronic Patient Record) — 9x winner of Best in KLAS for Latin American EHR
- First EHR to receive **SBIS/CFM certification** (2009)
- Partnership with FINEP for unprecedented AI in Brazilian healthcare
- Offers hospital digital transformation solutions (Command Center, SOUL MV)
- **VIVACE MV** — RIS/PACS platform for diagnostic imaging

#### Privacy/LGPD

MV's main website (mv.com.br) does not have a publicly accessible privacy policy page at standard URLs. The company references "Aviso de Privacidade" and "Política de Cookies" in footer links. MV operates primarily B2B with enterprise contracts covering data protection.

The MV Planos subsidiary's privacy policy (mvplanos.com.br — a separate insurance broker entity) references:
- RGPD (EU)
- Lei 12.965/2014 (Marco Civil)
- LGPD (referenced as "projeto de lei" — suggesting outdated policy text)
- Standard ARCO rights (access, rectification, cancellation, opposition)

**LIMITATION:** MV Informática's core enterprise privacy documentation is not publicly available; likely embedded in B2B contracts.

---

## 2. LGPD Regulatory Framework <a name="lgpd-framework"></a>

### Article 7 — Legal Bases for Processing Personal Data

Ten legal bases for processing non-sensitive personal data:
1. **Consentimento do titular** (consent)
2. **Cumprimento de obrigação legal ou regulatória** (legal obligation)
3. **Execução de políticas públicas** (public policy)
4. **Estudos por órgão de pesquisa** (research — with anonymization)
5. **Execução de contrato** (contract performance)
6. **Exercício regular de direitos** (legitimate exercise of rights in judicial/administrative/arbitration proceedings)
7. **Proteção da vida** (life protection)
8. **Tutela da saúde** (health protection — by health professionals/entities)
9. **Interesse legítimo** (legitimate interest)
10. **Proteção do crédito** (credit protection)

### Article 11 — Processing of Sensitive Personal Data (Health Data)

**More restrictive** than Article 7. Two pathways only:

**Pathway A: Specific and highlighted consent**
> "O tratamento de dados pessoais sensíveis somente poderá ocorrer [...] quando o titular ou seu responsável legal consentir, de forma específica e destacada, para finalidades específicas"

**Pathway B: Without consent, ONLY when indispensable for:**
- (a) Legal or regulatory obligation
- (b) Public policy execution
- (c) Research (with anonymization when possible)
- (d) Regular exercise of rights
- (e) Life protection
- (f) **Tutela da saúde, exclusivamente, em procedimento realizado por profissionais de saúde, serviços de saúde ou autoridade sanitária** (health protection, exclusively in procedures by health professionals/services/health authorities)
- (g) Fraud prevention

**Critical restrictions for health tech:**

> **Art. 11, § 4º:** Proíbe o compartilhamento de dados de saúde entre controladores com objetivo de vantagem econômica, exceto para prestação de serviços de saúde e assistência farmacêutica.

> **Art. 11, § 5º:** Proíbe operadoras de planos de saúde de usar dados de saúde para seleção de riscos na contratação.

### Article 18 — Data Subject Rights

Full enumeration of rights (ARCO+):
1. **Confirmação** da existência de tratamento
2. **Acesso** aos dados
3. **Correção** de dados incompletos/inexatos/desatualizados
4. **Anonimização, bloqueio ou eliminação** de dados desnecessários/excessivos/non-compliant
5. **Portabilidade** a outro fornecedor de serviço (per ANPD regulation)
6. **Eliminação** de dados processed with consent (with exceptions per Art. 16)
7. **Informação** sobre entities data was shared with
8. **Informação** about the possibility of not consenting and consequences
9. **Revogação** do consentimento (consent withdrawal)
10. **Revisão de decisões automatizadas** (review of automated decisions)
11. **Oposição** to non-compliant processing

**Key procedural requirements:**
- Requests served **free of charge**
- Controller must communicate corrections/eliminations/blocks to all parties data was shared with
- If controller is not the data agent, must immediately communicate to the agent

### Article 33 — International Data Transfer

Permitted only when:
1. Country provides **adequate protection level** (as assessed by ANPD)
2. Controller demonstrates compliance through:
   - **Cláusulas-padrão contratuais (CPCs)** — Standard Contractual Clauses
   - **Cláusulas contratuais específicas (CCE)** — Specific clauses (requires ANPD approval)
   - **Normas Corporativas Globais (BCRs)** — Binding Corporate Rules
   - **Selos, certificados e códigos de conduta** — Seals/certifications
3. Transfer is necessary for **international legal cooperation** between public entities
4. Transfer is necessary for **life/physical safety** protection
5. ANPD has **authorized** the transfer
6. Transfer results from **commitment in international cooperation agreement**
7. Transfer is necessary for **contract execution** (at data subject's request)
8. Transfer is necessary for **regular exercise of rights** in judicial/administrative/arbitration
9. **Specific and highlighted consent** by data subject

Per ANPD Resolução CD/ANPD Nº 19/2024, CPCs must be adopted integrally without modification.

---

## 3. ANVISA RDC 657/2022 & CFM 2.314/2022 <a name="regulatory-framework"></a>

### ANVISA RDC 657/2022 — Software as Medical Device (SaMD)

**Effective:** July 1, 2022

**Definition:** Software that meets the definition of a medical device, whether in vitro diagnostic or not, intended for one or more medical indications, performing its functions without being part of medical device hardware. Includes mobile apps, in vitro software, and SaaS.

**Classification (per RDC 751/2022):**

| Class | Risk Level | Description |
|-------|-----------|-------------|
| **I** | Low | SaMDs not falling into higher categories |
| **II** | Medium | SaMDs that assist in therapeutic/diagnostic decisions or monitor physiological processes |
| **III** | High | SaMDs whose decisions can result in severe health deterioration, surgical intervention, or vital parameter monitoring |
| **IV** | Maximum | SaMDs whose decisions can result in death or irreversible deterioration |

**Exclusions (NOT SaMD):**
- Wellness software
- Administrative/financial management software
- Software processing only epidemiological data without clinical purpose
- Software embedded in medical device hardware
- **In-house low-risk software (Classes I/II)** used exclusively within health institutions — exempt from regularization but cannot be commercialized

**Holi Labs implications:**
- Clinical Decision Support that "assists" physicians = likely **Class II** if it provides recommendations
- Must avoid language implying the software makes autonomous diagnostic/treatment decisions
- In-house developed CDS used only within a single institution may be exempt
- If commercialized, must obtain ANVISA registration

### CFM Resolution 2.314/2022 — Telemedicine

**Key provisions:**

1. **AI as support tool:** "A decisão clínica final permanece sempre com o médico" (Final clinical decision always remains with the physician)
2. **Physician autonomy:** Physician can accept or reject automated system recommendations
3. **Right to refuse:** Physician can refuse to use technologies without adequate scientific validation
4. **No direct AI-to-patient communication:** AI systems cannot communicate diagnoses directly to patients without human mediation
5. **Electronic health record:** All telemedicine encounters must be recorded in electronic patient record (SRES)
6. **Digital signature:** Physician must possess ICP-Brasil qualified digital signature
7. **In-person as gold standard:** In-person consultation remains the reference standard
8. **Seven modalities:** teleconsulta, teleconsultoria, teleinterconsulta, telediagnóstico, telecirurgia, televigilância, teletriagem

### New CFM Resolution on AI (March 2026)

As of March 2, 2026, CFM published new rules on AI use in medicine:
- Reinforces that **final decision is always the physician's**
- AI systems function as **support tools, not substitutes**
- AI cannot communicate diagnoses directly to patients without physician mediation

---

## 4. Cross-Company Pattern Analysis <a name="patterns"></a>

### Pattern 1: Platform Liability Shield

**All companies** use some version of "the platform is merely a connection/management tool, the physician retains full autonomous liability":

| Company | Liability Language |
|---------|-------------------|
| **Conexa** | "projetada apenas para conectar o Paciente ao Profissional de Saúde" |
| **iClinic** | "não utiliza nenhum tipo de decisão automatizada que impacte o USUÁRIO" |
| **Doctoralia** | "mera plataforma digital de divulgação de profissionais de saúde" |
| **Laura** | Positions as "alertas" (alerts) to clinical team, not autonomous decisions |

### Pattern 2: Dual Legal Basis for Health Data

Most sophisticated companies use **dual legal bases** for health data processing:
- **Primary:** Consentimento específico e destacado (Art. 11, I)
- **Secondary:** Tutela da saúde (Art. 11, II, f)

This provides a fallback legal basis when consent cannot be obtained (e.g., emergency situations).

### Pattern 3: Medical Record Retention vs. Erasure

**Standard across industry:**
- Medical records: **20 years** (Lei 13.787/2018, CFM Resolution 1.821/2007)
- Psychology records: **5 years** (CFP Resolution 6/2019)
- Access logs: **6 months minimum** (Marco Civil da Internet)
- Right to erasure applies to personal data but NOT to medical records during retention period

### Pattern 4: Controller vs. Operator Distinction

**iClinic model (best practice):**
- iClinic = **Operador** (Processor) of patient data
- Clinic = **Controlador** (Controller) of patient data
- Portability requests routed to the Controller (clinic), not to iClinic

This is the model Holi Labs should follow for B2B SaaS.

### Pattern 5: Cloud Infrastructure Disclosure

| Company | Cloud Provider | Locations | Art. 33 Citation |
|---------|---------------|-----------|------------------|
| **iClinic** | AWS | Brazil + US | Art. 33, I (adequate protection) |
| **Conexa** | Not disclosed | Not disclosed | Art. 33 general reference |
| **TiSaúde** | AWS | Not specified | LGPD compliance stated |
| **MV** | Not publicly disclosed | N/A | N/A |

### Pattern 6: Consent Model Comparison

| Company | Registration Consent | Health Data Consent | Marketing Consent |
|---------|---------------------|--------------------|--------------------|
| **Conexa** | Blanket (ToS acceptance) | Dual basis (consent + tutela da saúde) | Separate opt-in |
| **iClinic** | "Livre, informada, destacada, específica e legítima" | Delegated to clinic (Controller) | Separate opt-in with withdrawal |
| **Doctoralia** | Professional: contract acceptance | Teleconsulta: explicit informed consent | Professional must ensure own legal basis |

### Pattern 7: Dispute Resolution

| Company | Mechanism | Forum |
|---------|-----------|-------|
| **Conexa** | Court jurisdiction | Rio de Janeiro |
| **iClinic** | Court jurisdiction | User's domicile (consumer-friendly) |
| **Doctoralia** | Court jurisdiction | Not specified in professional terms |

**Notable:** None of the analyzed Brazilian health tech companies use **mandatory arbitration**. All use court jurisdiction. iClinic's consumer-friendly approach (plaintiff's domicile) is the most protective.

### Pattern 8: SaMD Avoidance Language

Companies systematically avoid ANVISA-triggering words:

| Forbidden Word | Alternative Used |
|----------------|-----------------|
| "diagnosticar" (diagnose) | "auxiliar na avaliação" (assist in evaluation) |
| "detectar" (detect) | "identificar indicadores" (identify indicators) |
| "prevenir" (prevent) | "monitorar" (monitor) |
| "tratar" (treat) | "apoiar o cuidado" (support care) |
| "prescrever" (prescribe) | "sugerir" (suggest) |

**Exception:** Laura uses "detectar" and "identificar" in its marketing, suggesting it may have (or need) ANVISA SaMD registration.

---

## 5. Holi Labs Requirements Summary <a name="holi-labs-requirements"></a>

### MUST-HAVE Elements for Holi Labs Legal Documents

#### A. Privacy Policy Requirements

1. **Granular consent model** (not blanket "I Agree"):
   - Consent for service provision (dados necessários para prestação do serviço)
   - Consent for health data processing (consentimento específico e destacado — Art. 11, I)
   - Consent for research/analytics (with anonymization option)
   - Consent for marketing communications (separate toggle, opt-out mechanism)

2. **Dual legal basis for health data:**
   - Primary: Consentimento específico e destacado do titular (Art. 11, I LGPD)
   - Secondary: Tutela da saúde, em procedimento realizado por profissionais de saúde (Art. 11, II, f LGPD)
   - Additional: Cumprimento de obrigação legal ou regulatória (Art. 11, II, a — for medical record retention)

3. **Data sovereignty disclosure:**
   - Name cloud provider (e.g., AWS)
   - Disclose server locations (Brazil, US, etc.)
   - Cite Art. 33 LGPD with specific mechanism (CPCs, adequate protection, etc.)
   - If using US servers: reference ISO 27018 or SOC 2 compliance

4. **Controller/Operator distinction:**
   - Holi Labs = Operador (Processor) for patient health data
   - Clinic/Hospital = Controlador (Controller) for patient health data
   - Holi Labs = Controlador for physician/clinic user data

5. **Data subject rights implementation (Art. 18 LGPD):**
   - Confirmation of processing
   - Access to data
   - Correction of inaccurate data
   - Anonymization/blocking/elimination of unnecessary data
   - Portability (via Controller for patient data, via Holi Labs for user data)
   - Elimination of consent-based data (with retention exceptions)
   - Information about shared entities
   - Consent withdrawal mechanism
   - Review of automated decisions
   - Opposition to non-compliant processing

6. **Retention periods:**
   - Medical records: 20 years (Lei 13.787/2018)
   - Access logs: 6 months minimum (Marco Civil da Internet)
   - Financial records: per tax legislation (5 years under CTN)
   - Marketing consent records: duration of relationship + 5 years

7. **DPO designation:** Must name and provide contact for Encarregado de Proteção de Dados

8. **Incident response:** Reference ANPD notification obligation (Art. 48 LGPD) — notify ANPD + affected data subjects within "reasonable timeframe"

#### B. Terms of Service Requirements

9. **Medical liability framing (CRITICAL):**

   Recommended template language:

   > "A Plataforma Cortex / Holi Labs constitui uma ferramenta de apoio à decisão clínica, destinada exclusivamente a auxiliar o profissional de saúde habilitado na organização, visualização e análise de informações clínicas. A Plataforma NÃO substitui o julgamento clínico do profissional de saúde, que detém autonomia plena e irrestrita sobre decisões diagnósticas, terapêuticas e de prescrição, nos termos da Resolução CFM nº 2.314/2022 e do Código de Ética Médica (Resolução CFM nº 2.217/2018). A responsabilidade técnica e ética pelo atendimento ao paciente é exclusiva do profissional de saúde assistente."

10. **SaMD classification defense (CRITICAL):**

    Recommended template language:

    > "A Plataforma Cortex / Holi Labs é classificada como software de gestão clínica e apoio administrativo, NÃO constituindo Software como Dispositivo Médico (SaMD) nos termos da RDC ANVISA nº 657/2022. A Plataforma não realiza diagnóstico, detecção, prevenção ou tratamento de doenças ou condições de saúde de forma autônoma, atuando exclusivamente como ferramenta auxiliar sob supervisão direta de profissional de saúde habilitado."

11. **Regulatory citations (minimum set):**
    - Lei nº 13.709/2018 (LGPD)
    - Lei nº 12.965/2014 (Marco Civil da Internet)
    - Lei nº 8.078/1990 (Código de Defesa do Consumidor)
    - Lei nº 13.787/2018 (Lei do Prontuário Eletrônico)
    - Lei nº 14.510/2022 (Lei da Telessaúde)
    - Resolução CFM nº 2.314/2022 (Telemedicina)
    - Resolução CFM nº 2.217/2018 (Código de Ética Médica)
    - RDC ANVISA nº 657/2022 (SaMD)
    - RDC ANVISA nº 751/2022 (SaMD Classification)

12. **Dispute resolution:** Recommend foro do domicílio do usuário (consumer-friendly, per iClinic model) for B2C interactions. For B2B enterprise contracts, consider arbitration via Câmara de Arbitragem do Mercado (CAM-B3) or CCBC.

#### C. Consent Flow (PT-BR Templates)

**Health Data Consent (Art. 11, I):**

```
☐ CONSENTIMENTO PARA TRATAMENTO DE DADOS DE SAÚDE

Autorizo o tratamento dos meus dados pessoais sensíveis relativos à
saúde, incluindo informações clínicas, prontuários, resultados de
exames e prescrições, para a finalidade exclusiva de prestação de
serviços de saúde por meio da Plataforma, nos termos do Art. 11, I
da Lei nº 13.709/2018 (LGPD).

Estou ciente de que posso revogar este consentimento a qualquer
momento, sem prejuízo da legalidade do tratamento realizado
anteriormente.
```

**Research/Analytics Consent (separate toggle):**

```
☐ CONSENTIMENTO PARA PESQUISA E ANÁLISES

Autorizo a utilização dos meus dados de saúde, de forma anonimizada,
para fins de pesquisa científica e análises estatísticas voltadas à
melhoria dos serviços de saúde, nos termos do Art. 11, II, c da LGPD.
```

**Marketing Consent (separate toggle):**

```
☐ CONSENTIMENTO PARA COMUNICAÇÕES DE MARKETING

Autorizo o envio de comunicações comerciais, informativos e novidades
sobre os serviços da Plataforma para o meu endereço de e-mail e/ou
número de telefone cadastrados. Estou ciente de que posso cancelar
este recebimento a qualquer momento.
```

#### D. International Transfer Clause (PT-BR Template)

```
TRANSFERÊNCIA INTERNACIONAL DE DADOS

Os seus dados pessoais poderão ser transferidos e armazenados em
servidores localizados no Brasil e nos Estados Unidos da América,
operados pela Amazon Web Services (AWS), que mantém certificação
ISO 27018 para proteção de dados pessoais em nuvem.

A transferência internacional é realizada em conformidade com o
Art. 33, inciso I, da Lei nº 13.709/2018 (LGPD), garantindo grau
de proteção de dados pessoais adequado ao previsto na legislação
brasileira, conforme Resolução CD/ANPD Nº 19/2024, mediante
adoção de Cláusulas-Padrão Contratuais (CPCs).
```

#### E. Automated Decision Disclaimer (PT-BR Template)

```
DECISÕES AUTOMATIZADAS E INTELIGÊNCIA ARTIFICIAL

A Plataforma utiliza recursos de inteligência artificial para
auxiliar na organização e análise de informações clínicas.
Esses recursos NÃO substituem o julgamento clínico do
profissional de saúde e NÃO tomam decisões autônomas sobre
diagnóstico, tratamento ou prescrição.

O profissional de saúde possui plena autonomia para aceitar,
modificar ou rejeitar quaisquer sugestões apresentadas pela
Plataforma, nos termos da Resolução CFM nº 2.314/2022.

Você tem o direito de solicitar a revisão de decisões tomadas
unicamente com base em tratamento automatizado de dados pessoais,
nos termos do Art. 20 da LGPD.
```

---

### Summary Matrix: What Each Company Does Well

| Best Practice | Champion Company | What to Emulate |
|--------------|-----------------|-----------------|
| Dual legal basis for health data | **Conexa** | Consent + tutela da saúde as fallback |
| Controller/Operator distinction | **iClinic** | Clear LGPD role definition for SaaS |
| Cloud infrastructure transparency | **iClinic** | Name provider, locations, ISO certifications |
| Granular consent with withdrawal | **iClinic** | "Livre, informada, destacada, específica e legítima" |
| Platform liability shield | **Doctoralia** | "Mera plataforma digital" positioning |
| Cross-border transfer via 3rd parties | **Doctoralia** | Disclose GMB/Google data flows explicitly |
| Comprehensive regulatory citations | **Conexa** | 15+ regulatory references including all council resolutions |
| Consumer-friendly dispute resolution | **iClinic** | Foro do domicílio do usuário |
| Medical record retention clarity | **Conexa** | 20-year/5-year split with specific law citations |
| AI/Chatbot disclaimer | **Conexa** | Position AI as navigation/support, not clinical |
| No automated decisions statement | **iClinic** | Explicit Art. 20 LGPD compliance |
| Professional autonomy emphasis | **Conexa** | "Ampla e irrestrita autonomia" language |
| Data export deadline | **iClinic** | 60-day window post-contract termination |

---

### Critical Gaps Identified in the Market

1. **No company provides truly granular consent toggles** in their public-facing policies (separate checkboxes for service/research/marketing). Most use blanket ToS acceptance + separate marketing opt-in at best.

2. **Most companies lack explicit ANVISA SaMD disclaimers** — they simply avoid the topic rather than addressing it head-on.

3. **None of the analyzed companies reference the new CFM AI resolution (March 2026)** in their current ToS/Privacy Policies — this is a gap Holi Labs can fill as a competitive differentiator.

4. **Data portability mechanisms are vaguely defined** — no company provides a specific technical format (FHIR, HL7, CSV) for data export.

5. **Arbitration is universally absent** from consumer-facing health tech in Brazil — this may be a cultural/legal norm to follow rather than fight.

6. **Cross-border transfer mechanisms lack specificity** — most reference Art. 33 generally without specifying which mechanism (CPCs, BCRs, adequacy decisions) they rely on. ANPD Resolução 19/2024 now requires specificity.

---

*Research compiled for Holi Labs / Cortex legal team. This document should be reviewed by qualified legal counsel before being used to draft binding legal documents.*
