# Registro de Operações de Tratamento de Dados Pessoais (LGPD Art. 37)

**Responsável:** HoliLabs (Operador da Tecnologia) e Clínicas Clientes (Controladores)
**Data da Elaboração:** 05 de Abril de 2026

| Atividade | Dados Tratados | Base Legal | Finalidade | Compartilhamento | Retenção | Responsável |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Cadastro de Paciente** | Nome, Data Nascimento, Endereço, Contatos, CPF, RG, CNS, Gênero. | Art. 7, V (Execução de Contrato) / Art. 11, II, "f" (Tutela da Saúde). | Identificar o paciente unicamente no sistema do hospital/clínica. | Acesso apenas interno pela clínica. | 20 anos após último registro. | Recepção / Médico |
| **2. Atendimento Clínico (Consulta)** | Notas Clínicas, Sinais Vitais, História Médica, Queixa Principal (PHI). | Art. 11, II, "f" (Tutela da Saúde). | Apoiar a decisão clínica, gerar SOAP note com IA (Deepgram Scribe), registrar ato médico. | Interno à Clínica e Nuvem de Processamento Seguro. | 20 anos após último registro. | Médico / Enfermeiro |
| **3. Prescrição Eletrônica** | Medicamentos, Posologia, Assinatura ICP-Brasil, Nome, CPF. | Art. 11, II, "f" (Tutela da Saúde) e Art. 7, II (Obrigação Legal). | Emitir receituário com validade legal e gerar alertas de interação (CDS). | Farmácias (dispensação), SNCR (ANVISA). | 20 anos. | Médico Prescritor |
| **4. Exames Laboratoriais** | Pedido Médico, Diagnóstico (CID), Nome, CPF. | Art. 11, II, "f" (Tutela da Saúde). | Investigação clínica. | Laboratórios Parceiros / RNDS. | 20 anos. | Médico / Recepção |
| **5. Faturamento (Billing)** | Dados demográficos, Códigos TUSS, Procedimentos, Diagnósticos Básicos. | Art. 7, V (Execução de Contrato). | Emissão de faturas, repasse e contato com operadoras de plano de saúde. | Operadoras de Plano de Saúde. | 5 anos. | Setor Financeiro |
| **6. Agendamento de Consultas** | Nome, Telefone, E-mail, Data, Horário, Motivo. | Art. 7, V (Execução de Contrato). | Gerenciar a agenda dos profissionais e otimizar tempo. | Interno. | 5 anos. | Recepção / Sistema |
| **7. Notificações (WhatsApp/SMS)** | Telefone, E-mail, Data de Consulta. | Art. 7, I (Consentimento do Titular). | Lembretes de consultas e alertas de segurança clínica. | Operadora Telefonia (Twilio). | 12 meses após desativação. | Sistema Automatizado |
| **8. Telemedicina** | Imagem, Voz, IP, Dados do atendimento. | Art. 11, II, "f" (Tutela da Saúde) e Art. 7, I (Consentimento). | Prover consultas à distância. | Sem gravação externa, retenção das notas locais. | 20 anos (notas associadas). | Médico |
| **9. Registro de Auditoria (Logs)** | IP, `userId`, IDs de Recursos, Ações e `accessReason` das leituras de PHI. | Art. 7, II (Cumprimento de Obrigação Legal). | Monitoramento de segurança, validações OWASP/HIPAA e conformidade LGPD. | Restrito Infraestrutura HoliLabs. | Mín. 5 anos. | Segurança / SRE |
| **10. Analytics (Melhoria de IA)** | Dados médicos estruturados totalmente anonimizados (remoção de CPF, nome, contato, com base de `tokenId`). | Art. 7, IX e Art. 12 (Anonimização em Pesquisa). | Melhorar o algoritmo de triagem e inteligência hospitalar em painéis de qualidade. | Uso restrito da Inteligência HoliLabs. | Indeterminado. | Engenharia de Dados |
| **11. Comunicados de Plataforma** | E-mail, Nome. | Art. 7, V (Execução de Contrato). | Avisos operacionais ou notificações relativas ao uso do Portal do Paciente. | Provedores de E-mail Certificados. | Até exclusão do portal. | Atendimento/Suporte |
| **12. Backup e Disaster Recovery** | Cópia integral do banco de dados criptografado. | Art. 7, II (Obrigação Legal de Proteção e Resiliência Técnica) - Art. 46 LGPD. | Garantir a disponibilidade e continuidade do serviço (RTO 4h, RPO 1h). | S3 Buckets Criptografados (AWS). | 30 dias na lixeira temporária. | DevOps / Infraestrutura |

Este registro preenche a exigência técnica e administrativa do Artigo 37 da LGPD, fornecendo evidências para autoridades ou controladores sobre a natureza estrita e o propósito do processamento na plataforma.
