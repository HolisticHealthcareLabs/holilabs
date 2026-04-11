# Guia do Administrador de Clínica — HoliLabs

Como administrador, você é responsável pela configuração da unidade, gestão da equipe e conformidade com a LGPD.

## 1. Gestão de Equipe (Convidar Médicos)
- Vá em **Configurações > Usuários**.
- Clique em **"Convidar Novo Usuário"**.
- Insira o e-mail e selecione a função (**PHYSICIAN**, **NURSE**, **RECEPTIONIST**).
- O usuário receberá um convite para configurar sua senha e MFA.

## 2. Configuração de Agenda
- Em **Agenda > Configurações de Horário**, defina o horário de funcionamento da clínica.
- Para cada profissional, configure as janelas de atendimento e bloqueios (folgas/reuniões).
- Ative o **"Auto-Agendamento"** se desejar permitir que pacientes marquem via portal.

## 3. Importação de Pacientes
- Vá em **Pacientes > Importar**.
- Baixe o modelo de CSV.
- Certifique-se de que CPF e Telefone estão no formato correto.
- Faça o upload. O sistema validará a duplicidade pelo CPF.

## 4. Auditoria e Segurança
- Acesse **Relatórios > Logs de Auditoria**.
- Aqui você pode ver quem acessou qual prontuário e por qual motivo (`accessReason`).
- **Atenção:** Em conformidade com a LGPD, todos os acessos a dados sensíveis são rastreados e imutáveis.

## 5. Solicitações LGPD
- Se um paciente solicitar seus dados (Portabilidade), vá ao perfil do paciente e clique em **"Exportar Dados (LGPD)"**.
- Se um paciente solicitar exclusão (Esquecimento), utilize a função **"Anonimizar Registro"**.
- O sistema manterá os dados clínicos obrigatórios por 20 anos (norma CFM) mas removerá dados de contato e marketing.

## 6. Gestão de Faturamento
- Em **Financeiro > Guias TUSS**, acompanhe as guias geradas ao final de cada atendimento.
- Verifique se há erros de codificação antes de exportar o lote para a operadora.

---
**Suporte:** Em caso de dúvidas técnicas, entre em contato via `suporte@holilabs.xyz` ou pelo canal oficial no WhatsApp da sua unidade.
