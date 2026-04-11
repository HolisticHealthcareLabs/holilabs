# Plano de Resposta a Incidentes (LGPD Art. 48)

**Confidencialidade:** CONFIDENCIAL — HoliLabs Interno
**Última Revisão:** 05 de Abril de 2026

Este plano delineia o procedimento oficial a ser tomado pela equipe da HoliLabs perante qualquer violação real, suspeita, ou falha de infraestrutura que coloque em risco a integridade, confidencialidade e disponibilidade dos dados pessoais (especialmente dados sensíveis - PHI). Está redigido em cumprimento com a LGPD e regulamentações brasileiras.

## 1. Identificação e Classificação de Incidentes
Os sistemas emitem alertas via plataforma de monitoramento (Sentry/DataDog) integrados com nossas métricas estruturadas (`metrics.ts`). Os incidentes são classificados de acordo com nosso padrão de segurança:
*   **P0 (Crítico - Incidente de Violação Grave):** Vazamento ativo de dados sensíveis (PHI), exfiltração de banco de dados, falha no sistema de autenticação permitindo a interceptação de sessões (Auth Bypass) ou Ransomware ativo.
    *   *Detecção alvo:* 15 minutos.
    *   *Contenção alvo:* 1 hora.
*   **P1 (Alto - Exposição de Chaves / CVE Crítico):** Vazamento de segredos via código, exposição de buckets S3, falha descoberta em pacotes subjacentes com exploração provável.
    *   *Detecção alvo:* 1 hora.
    *   *Contenção alvo:* 4 horas.
*   **P2 (Moderado - Falha de Log ou Perda Menor):** Falha no registro em trilhas de auditoria, indisponibilidade dos sistemas de backup sem perda de dados, falha em controles como rate-limits.

## 2. Estrutura de Resposta de Emergência (Acionamento)
Em caso de classificação P0/P1, o fluxo de acionamento ("Emergency Mode") ocorre na seguinte hierarquia:
1.  **Engenheiro SRE de Plantão (On-Call)** recebe o alarme e se designa como "Incident Commander (IC)".
2.  O IC notifica via canais criptografados o **Líder de Segurança / CTO** e inicia a sala "war-room".
3.  Paralelamente, o **Encarregado de Dados (DPO)** é acionado caso exista qualquer indício de que PHI ou dados de identificação foram envolvidos.

## 3. Fase de Contenção, Erradicação e Recuperação
*   **Acesso e Isolamento:** Desabilitação imediata das chaves API comprometidas, isolamento da VPC de produção ou acionamento de bloqueios no provedor de nuvem para cortar acesso atacante (bloqueio de IPs, rotação de `ENCRYPTION_KEY`).
*   **Bloqueio Preventivo:** Encerramento global e compulsório de todas as sessões de usuários via Redis (forçando reautenticação) se o caso envolver falha RBAC.
*   **Recuperação (Restore DR):** Em ataques lógicos de comprometimento como deleções criminosas, a equipe de infraestrutura procederá com o Point-In-Time-Recovery (PITR) a partir do backup arquivado nos buckets da AWS em conformidade com o `BACKUP-DR-PLAN.md` (RTO de 4 horas máximo).

## 4. Notificações Mandatórias (LGPD Art. 48)
A Lei determina a notificação tempestiva em eventos que acarretem **risco ou dano relevante** aos titulares:
*   **Comunicação à ANPD (Autoridade Nacional de Proteção de Dados):**
    *   O DPO tem o dever de preencher a Notificação Inicial em um prazo máximo de **2 (dois) dias úteis** após o reconhecimento do dano, informando os controles técnicos implementados (como criptografia prévia), a natureza dos dados vazados, volume, número de pessoas afetadas e potenciais riscos.
*   **Notificação aos Controladores (As Clínicas):**
    *   Em até **24 horas**, as instituições que nos delegaram os dados como operadores devem ser notificadas dos fatos apurados até o momento para gerenciarem suas condutas internamente e perante o CFM.
*   **Notificação aos Titulares (Pacientes e Usuários Médicos):**
    *   Em coordenação com a ANPD e os médicos controladores, o contato primário será feito via os e-mails registrados no sistema ou mensagens via portal. Será adotado o aviso claro recomendando providências atenuantes (como atenção a falsários e troca de senhas).

## 5. Revisão Pós-Incidente (Post-Mortem)
Para todo evento P0, P1 ou incidente reportado à ANPD:
1.  Um relatório *blameless post-mortem* (foco em "como o sistema falhou", não em "quem errou") é gerado em até 72 horas após a erradicação.
2.  Todas as lacunas exploradas são tratadas e incorporadas nos fluxos de testes de Integração Contínua (CI/CD) e checadas pelas verificações de segurança (ex: atualização da tabela do `casbin.ts` ou reforço nos testes Playwright e Jest E2E).
3.  Toda alteração de política e fluxo de trabalho passará a integrar nossa master list em `.claude/rules/security.md`.
