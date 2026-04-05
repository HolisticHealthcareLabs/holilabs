# REGISTRO DE ATIVIDADES DE TRATAMENTO DE DADOS PESSOAIS (ROPA)

**MINUTA — REQUER REVISÃO JURÍDICA E DE SEGURANÇA**

Documento elaborado para atendimento ao Art. 37 da Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).

**Controlador:** [PREENCHER - Nome da Clínica/Hospital]
**Operador:** HoliLabs Tecnologia em Saúde Ltda.
**Data da última atualização:** [PREENCHER - Data]

---

## 1. DADOS DE PACIENTES (PACIENTES E PRONTUÁRIOS)

| Categoria de Dados | Finalidade do Tratamento | Base Legal (LGPD) | Prazo de Retenção | Controle de Acesso | Criptografia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cadastro Básico** (Nome, Data de Nascimento, Gênero, Contato, Endereço, RG, CPF, CNS) | Identificação do paciente, faturamento, comunicação e cumprimento de obrigação legal. | Art. 7º, II (Obrigação legal), Art. 7º, V (Execução de contrato) | 20 anos após o último atendimento (Lei nº 13.787/2018) | Restrito a médicos, enfermeiros e recepcionistas autorizados da clínica. | Sim (AES-256 em repouso e TLS em trânsito) |
| **Dados Sensíveis - Saúde** (Histórico clínico, Alergias, Sinais Vitais, Prescrições, Resultados de exames, Notas SOAP) | Prestação de assistência à saúde, diagnóstico, suporte à decisão clínica e continuidade do cuidado. | Art. 11, II, "f" (Tutela da saúde) | 20 anos após o último atendimento | Restrito a médicos e profissionais de saúde com vínculo ao paciente. | Sim |
| **Métricas de Saúde** (Peso, PA, Glicemia, etc. - `HealthMetric`) | Monitoramento do paciente, engajamento e alertas de saúde. | Art. 11, II, "f" (Tutela da saúde) | 20 anos após o último atendimento | Restrito a profissionais de saúde autorizados. | Sim |
| **Preferências e Cuidados Paliativos** (Diretivas antecipadas, status de reanimação, etc.) | Adequação do plano de cuidado às diretrizes do paciente. | Art. 11, II, "f" (Tutela da saúde) | Permanente (enquanto houver vínculo) | Profissionais de saúde autorizados. | Sim |

---

## 2. DADOS DE USUÁRIOS E PROFISSIONAIS DE SAÚDE (CLÍNICOS)

| Categoria de Dados | Finalidade do Tratamento | Base Legal (LGPD) | Prazo de Retenção | Controle de Acesso | Criptografia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Identificação Profissional** (Nome, CPF, CBO, CNES, CRM/Coren, NPI) | Autenticação no sistema, validação de permissões, assinatura eletrônica e auditoria. | Art. 7º, V (Execução de contrato), Art. 7º, II (Obrigação legal) | 5 anos após o término do vínculo (Marco civil e trabalhista) | Administradores do sistema e logs de auditoria. | Sim |
| **Dados de Autenticação** (E-mail, Senhas, PINs, Telefone para MFA) | Controle de acesso e segurança da informação. | Art. 7º, IX (Interesses legítimos - Segurança) | Até exclusão da conta / revogação | Restrito a rotinas de sistema (hashes irreversíveis). | Sim (Hashes como Bcrypt/SHA-256) |

---

## 3. LOGS, AUDITORIA E COMUNICAÇÕES

| Categoria de Dados | Finalidade do Tratamento | Base Legal (LGPD) | Prazo de Retenção | Controle de Acesso | Criptografia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Logs de Acesso e Auditoria** (IPs, User Agent, Ações realizadas, Horários) | Segurança da plataforma, rastreabilidade de acessos a dados sensíveis, prevenção de fraudes. | Art. 7º, II (Obrigação Legal - Marco Civil), Art. 7º, IX | 6 meses (Marco Civil da Internet), podendo ser estendido. | Administradores de segurança e DPO da HoliLabs. | Sim |
| **Comunicações / Mensagens** (Conteúdo de mensagens entre clínico e paciente) | Continuidade do tratamento e teleorientação. | Art. 11, II, "f" (Tutela da saúde) | 20 anos (parte integrante do prontuário) | Participantes da conversa e auditores autorizados. | Sim |
| **Notificações** (Lembretes de agendamento, consentimento) | Engajamento e cumprimento da agenda. | Art. 7º, IX (Interesses legítimos) ou Consentimento | 1 ano após envio | Sistema automatizado e administradores. | Sim |

---

## 4. COMPARTILHAMENTO DE DADOS (SUBOPERADORES)

A HoliLabs utiliza os seguintes provedores (suboperadores) para realização do tratamento:
1. **Cloud / Banco de Dados**: AWS / DigitalOcean (Hospedagem e armazenamento de dados criptografados).
2. **Inteligência Artificial (IA Scribe / Auditoria)**: OpenAI, Anthropic, Deepgram. Os dados transcritos e analisados são anonimizados ou restritos aos termos de BAA/DPA estritos que proíbem o uso para treinamento de modelos de terceiros.
3. **Comunicações**: Resend (E-mail transacional), Twilio (SMS/MFA).

Todos os suboperadores possuem contratos que estabelecem obrigações de proteção de dados (DPA) compatíveis com a LGPD.