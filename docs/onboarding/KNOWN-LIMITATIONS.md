# Limitações Conhecidas — Versão 1.0 (Hospital-Ready)

Este documento lista de forma transparente o que está operacional, o que possui restrições e o que está planejado para versões futuras.

| Funcionalidade | Status | Notas Técnicas |
| :--- | :--- | :--- |
| **Atendimento Clínico (SOAP)** | **TOTALMENTE FUNCIONAL** | Geração via IA (Deepgram) e edição manual operacionais. |
| **Alertas de Segurança (CDS)** | **TOTALMENTE FUNCIONAL** | Alertas RED/YELLOW baseados em lógica determinística (JSON-Logic). |
| **Criptografia PHI (AES-256)** | **TOTALMENTE FUNCIONAL** | Proteção em repouso e gerenciamento de chaves ativo. |
| **Prescrição Digital** | **TOTALMENTE FUNCIONAL** | Assinatura ICP-Brasil e integração SNCR pronta para uso. |
| **Portal do Paciente** | **TOTALMENTE FUNCIONAL** | Acesso a documentos, histórico e agendamento básico. |
| **Faturamento (Billing)** | **PARCIALMENTE FUNCIONAL** | Geração de guias TUSS implementada; integração direta com operadoras pendente. |
| **Sincronização FHIR R4** | **PARCIALMENTE FUNCIONAL** | Estrutura Medplum integrada; requer configuração por hospital para RNDS. |
| **Modo Offline (R0)** | **EM BREVE** | Atendimento requer conexão ativa; persistência em cache local em desenvolvimento. |
| **Migração de Dados (CSV)** | **EM BREVE** | Importação em massa via admin sendo finalizada. |
| **Telemedicina (Vídeo)** | **NÃO SUPORTADO** | O sistema gerencia o agendamento, mas utiliza ferramentas externas (Meet/Zoom) para vídeo. |
| **Integração HIS Legado** | **NÃO SUPORTADO** | Requer projeto de integração customizado (HL7 ADT/ORM) por instituição. |

## Observação sobre o Modo Offline
O requisito **R0 (Offline Mode)** foi priorizado pela equipe de Red Team. Atualmente, se a conexão cair, os dados em memória podem não ser salvos. Recomendamos salvar a nota SOAP periodicamente durante o atendimento enquanto o recurso de auto-sync não é liberado.
