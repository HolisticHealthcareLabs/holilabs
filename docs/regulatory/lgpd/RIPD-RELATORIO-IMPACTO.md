# Relatório de Impacto à Proteção de Dados Pessoais (RIPD)

**Data da elaboração:** 05 de Abril de 2026
**Responsável:** Holi Labs Data Protection Officer (DPO)
**Status:** Versão 1.0 (Hospital-Ready)

## 1. Descrição dos processos de tratamento
O sistema HoliLabs atua como uma plataforma de inteligência clínica para prestadores de cuidados de saúde (clínicas e hospitais) no Brasil. O tratamento de dados envolve a coleta, armazenamento, uso e compartilhamento de informações dos pacientes para fins de agendamento, atendimento clínico (incluindo notas SOAP geradas por IA), prescrição eletrônica, faturamento e cumprimento de obrigações legais (ex. RNDS, SNCR).

## 2. Dados pessoais coletados
De acordo com nosso inventário de campos protegidos (`.claude/rules/security.md`), a HoliLabs trata os seguintes dados pessoais:
- **Identificadores Básicos:** Nome (`firstName`, `lastName`), Data de nascimento (`dateOfBirth`), E-mail (`email`), Telefone (`phone`), Endereço (`address`), Gênero (`gender`).
- **Identificadores Nacionais (Brasil):** CPF (`cpf`), Cartão Nacional de Saúde (`cns`), RG (`rg`).
- **Dados do Profissional (Confidenciais):** Número do conselho (ex. CRM), NPI, e-mail, telefone MFA.

## 3. Dados pessoais sensíveis
Com base na LGPD, Art. 5(II), os seguintes dados de saúde e registros de atendimento são classificados como dados pessoais sensíveis:
- **Prontuário Médico:** Número do Prontuário Médico (`mrn`), Notas Clínicas e SOAP (`subjective`, `objective`, `assessment`, `plan`, `chiefComplaint`, `vitalSigns`).
- **Medicações e Prescrições:** Lista de medicamentos, dosagens, frequências, diagnóstico associado e hash de integridade da prescrição.
- **Interações de IA (Scribe):** Gravações de áudio das consultas (`audioFileUrl`, `audioFileName`).
- **Biometria:** Assinaturas digitais de médicos (ICP-Brasil).

## 4. Base legal por atividade
O tratamento não é realizado de forma genérica. As bases legais aplicáveis para cada atividade são:

*   **Atendimento Clínico e Prontuário:** LGPD Art. 7º, VIII e Art. 11, II, "f" (Tutela da saúde, exclusivamente em procedimento realizado por profissionais de saúde, serviços de saúde ou autoridade sanitária).
*   **Faturamento (Billing):** LGPD Art. 7º, V (Execução de contrato).
*   **Notificações (SMS/WhatsApp):** LGPD Art. 7º, I (Consentimento explícito do paciente).
*   **Analytics e Melhoria de Qualidade (Dados desidentificados):** LGPD Art. 7º, IX e Art. 12 (Pesquisa, garantida a anonimização; legítimo interesse não se aplica diretamente a dados sensíveis, portanto usamos a desidentificação estruturada).
*   **Registro de Auditoria (Audit Logging):** LGPD Art. 7º, II (Cumprimento de obrigação legal ou regulatória pelo controlador).

## 5. Finalidade do tratamento
A finalidade central do tratamento é fornecer a plataforma "HoliLabs Clinical Intelligence Platform" para melhorar a prestação de serviços médicos, garantindo a segurança clínica (ex. emissão de alertas de interação medicamentosa RED/YELLOW/GREEN), conformidade com ANVISA e facilitar a eficiência administrativa, conforme descrito na Política de Privacidade e consentimentos específicos.

## 6. Compartilhamento
O compartilhamento de dados é estritamente controlado e ocorre nas seguintes hipóteses:
- **SNCR (Sistema Nacional de Controle de Receituário):** Envio de prescrições de substâncias controladas.
- **RNDS (Rede Nacional de Dados em Saúde):** Sincronização interoperável via FHIR R4.
- **Laboratórios e Farmácias Parceiras:** Mediante consentimento do paciente ou solicitação do médico prescritor (API/FHIR).

## 7. Medidas de segurança
Nossa infraestrutura reflete a adequação aos controles OWASP ASVS L2 e LGPD Art. 46:
- **Criptografia em Repouso:** Todos os campos de PHI são criptografados utilizando AES-256-GCM com rotatividade de chaves.
- **Criptografia em Trânsito:** TLS 1.2+ obrigatório.
- **Controle de Acesso:** Baseado na política Casbin RBAC com paradigma "default-deny", suportando 8 funções (roles) clínicas e administrativas.
- **Autenticação:** Bcrypt para hashes, MFA via Twilio, limites de tamanho de corpo (1MB), validação de content-type.
- **Trilha de Auditoria Inviolável:** Implementada de acordo com cadeia de hashes criptográficos para evitar e detectar adulterações de logs de acesso e leitura em PHI.

## 8. Riscos (Mapeamento cruzado com IEC 62304)
Os riscos à privacidade se alinham diretamente com a avaliação de riscos técnicos do produto (Risk Management File ISO 14971):
- **HAZ-005 (Exposição de Dados de PHI):** Risco de exposição não autorizada de PHI no banco de dados ou logs. Mitigado pelo uso de AES-256-GCM e `tokenId` nos logs em substituição a identificadores diretos. Risco residual aceitável.
- **HAZ-006 (Acesso Não Autorizado a Prontuários):** Risco de acesso de dados por pessoal administrativo (bypass de permissões). Mitigado pelo controle RBAC estrito (default-deny) da plataforma e o campo `accessReason` em todas as operações de leitura obrigatórias para PHI. Risco residual aceitável.
- **HAZ-004 (Falha na Trilha de Auditoria):** Perda da cadeia de logs e responsabilização de acesso a informações. Mitigado pela persistência primária em tabela estruturada com hashes de validação para detectar falsificações (`audit-chain.ts`). Risco residual aceitável.

## 9. Tempo de retenção
- **Registros Clínicos (Prontuário e Prescrições):** 20 anos a partir do último registro, conforme determinação legal do CFM (Conselho Federal de Medicina) e Código de Ética Médica.
- **Dados de Faturamento e Auditoria:** 5 anos (fins tributários e de defesa em litígio / Código de Defesa do Consumidor).
- **Gravações de Voz Brutas (Scribe):** Excluídas do provedor Deepgram imediatamente após transcrição ou armazenadas temporariamente com vida útil curta até desidentificação.
- **Backups:** Recuperação de 30 dias.

## 10. Direitos dos titulares (Art. 18)
O sistema suporta nativamente a execução dos direitos previstos no Artigo 18 da LGPD através do Portal do Paciente ou de interfaces administrativas:
- **Portabilidade de dados:** Implementada no endpoint `**/patients/export/**/route.ts` (exportação de todos os registros em JSON formatado).
- **Exclusão de dados / Direito ao esquecimento:** Implementada no endpoint `**/patients/[id]/erasure/**/route.ts` (anonimização estruturada preservando as restrições médicas de retenção ou efetuando anonimização hard delete para cadastros simples).
- **Controles de privacidade / Revogação de Consentimento:** Painel autônomo acessível ao titular na rota `**/portal/dashboard/privacy/**/page.tsx`.
