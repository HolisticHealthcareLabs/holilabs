# Questionário de Segurança do Fornecedor (SIG Lite Format)

**Empresa:** HoliLabs  
**Produto:** Clinical Intelligence Platform  
**Data:** 05 de Abril de 2026  
**Status:** Hospital-Ready (Sprint 6 Verified)

---

## 1. Organização e Governança

| Pergunta | Resposta | Evidência (Caminho do Arquivo) |
| :--- | :--- | :--- |
| A empresa possui políticas de segurança documentadas? | Sim. Mantemos regras estritas de classificação de dados e proteção de PHI. | `.claude/rules/security.md` |
| Existe um ciclo de vida de desenvolvimento de software (SDP) definido? | Sim. Seguimos o padrão IEC 62304 para software médico. | `docs/regulatory/iec62304/01-SOFTWARE-DEVELOPMENT-PLAN.md` |
| É realizada análise de riscos técnicos e clínicos? | Sim. Gerenciamos riscos conforme ISO 14971. | `docs/regulatory/iec62304/04-RISK-MANAGEMENT-FILE.md` |

## 2. Controle de Acesso

| Pergunta | Resposta | Evidência (Caminho do Arquivo) |
| :--- | :--- | :--- |
| Como é gerenciado o acesso dos usuários? | RBAC granular via Casbin, com 8 funções pré-definidas e paradigma "default-deny". | `apps/web/src/lib/auth/` |
| O sistema suporta Autenticação de Múltiplos Fatores (MFA)? | Sim. TOTP e fallback via SMS (Twilio) integrados. | `apps/web/src/lib/auth/otp.ts` |
| Como as sessões são protegidas? | Cookies HttpOnly, Secure, SameSite=Strict com expiração curta. | `apps/web/src/lib/auth/auth.config.ts` |

## 3. Proteção de Dados

| Pergunta | Resposta | Evidência (Caminho do Arquivo) |
| :--- | :--- | :--- |
| Qual o padrão de criptografia em repouso? | AES-256-GCM com gerenciamento de versões de chaves para todos os campos PHI. | `apps/web/src/lib/security/encryption.ts` |
| Como é garantida a criptografia transparente no banco de dados? | Extensão Prisma customizada para criptografia automática de campos sensíveis. | `apps/web/src/lib/db/encryption-extension.ts` |
| O sistema está em conformidade com a LGPD? | Sim. RIPD completo, registro de atividades e direitos do titular implementados. | `docs/regulatory/lgpd/` |

## 4. Segurança da Aplicação

| Pergunta | Resposta | Evidência (Caminho do Arquivo) |
| :--- | :--- | :--- |
| O sistema foi auditado contra o padrão OWASP ASVS? | Sim. Hardening Nível 2 (L2) concluído e verificado. | `docs/security/OWASP-ASVS-L2-CHECKLIST.md` |
| Existe validação de entrada em todas as APIs? | Sim. Validação estrita via Zod em todas as rotas de API. | `apps/web/src/lib/api/middleware.ts` |
| São realizados scans de segurança estáticos (SAST)? | Sim. CodeQL integrado ao pipeline de CI. | `.github/workflows/security-continuous.yml` |

## 5. Infraestrutura e Operações

| Pergunta | Resposta | Evidência (Caminho do Arquivo) |
| :--- | :--- | :--- |
| O sistema possui probes de saúde para orquestração (K8s)? | Sim. Endpoints de liveness, readiness e startup implementados. | `apps/web/src/app/api/health/` |
| Existe plano de Backup e Recuperação de Desastres? | Sim. RPO de 1 hora e RTO de 4 horas garantidos. | `docs/operations/BACKUP-DR-PLAN.md` |
| Como é feito o monitoramento de incidentes? | Sentry com higienização automática de PHI nos breadcrumbs e erros. | `apps/web/src/lib/monitoring/sentry-config.ts` |

## 6. Conformidade Regulatória

| Pergunta | Resposta | Evidência (Caminho do Arquivo) |
| :--- | :--- | :--- |
| O software atende aos requisitos da ANVISA para CDS? | Sim. Enquadrado como Classe I conforme RDC 657/2022 (Determinístico). | `docs/regulatory/anvisa/NOTIFICATION-CHECKLIST.md` |
| A documentação técnica segue padrões internacionais? | Sim. IEC 62304 Classe A e ISO 14971 integradas. | `docs/regulatory/iec62304/` |

## 7. Requisitos Específicos (Brasil)

| Pergunta | Resposta | Evidência (Caminho do Arquivo) |
| :--- | :--- | :--- |
| O sistema suporta assinaturas digitais ICP-Brasil? | Sim. Obrigatório para prescrições de substâncias controladas. | `apps/web/src/lib/prescriptions/` |
| Há integração com a RNDS? | Sim. Sincronização interoperável via FHIR R4 implementada. | `apps/web/src/lib/clinical/fhir/` |
| Como são tratados CPF, CNS e RG? | Tratados como dados sensíveis, criptografados com chave rotativa. | `.claude/rules/security.md` |
