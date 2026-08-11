/**
 * Documentos legais — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * Versão única dos termos exibidos no cadastro web (LGPD).
 */

/** Versão corrente — incrementar ao alterar qualquer texto legal. */
export const LEGAL_DOCUMENT_VERSION = "2026-06-16";

/** Tipos de consentimento exigidos no cadastro (Art. 7 LGPD). */
export const REQUIRED_CONSENT_TYPES = [
  "terms_of_use",
  "privacy_policy",
  "data_processing_lgpd",
] as const;

export type ConsentType = (typeof REQUIRED_CONSENT_TYPES)[number];

export type LegalDocument = {
  type: ConsentType;
  title: string;
  summary: string;
  content: string;
};

/** Textos legais exibidos na etapa de aceite antes do cadastro. */
export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    type: "terms_of_use",
    title: "Termos de Uso",
    summary: "Regras de utilização da plataforma Controla.AI.",
    content: `TERMOS DE USO — CONTROLA.AI

Última atualização: 16 de junho de 2026.

1. OBJETO
Estes Termos regulam o acesso e uso do Controla.AI, plataforma de controle financeiro pessoal disponibilizada via web e WhatsApp.

2. CADASTRO E CONTA
2.1. Para utilizar os serviços, você deve fornecer dados verdadeiros, completos e atualizados.
2.2. Você é responsável pela confidencialidade de sua senha e por todas as atividades realizadas em sua conta.
2.3. É proibido compartilhar credenciais ou utilizar a conta de terceiros sem autorização.

3. SERVIÇOS
3.1. O Controla.AI permite registrar despesas e receitas, definir metas, visualizar relatórios e interagir com assistente de IA.
3.2. Funcionalidades podem ser alteradas, ampliadas ou descontinuadas mediante aviso prévio razoável.
3.3. O serviço não constitui consultoria financeira, contábil ou de investimentos.

4. USO ADEQUADO
4.1. É vedado utilizar a plataforma para fins ilícitos, fraudulentos ou que violem direitos de terceiros.
4.2. É vedado tentar acessar áreas restritas, interferir na operação do sistema ou realizar engenharia reversa não autorizada.

5. PROPRIEDADE INTELECTUAL
Todo o software, marca, layout e conteúdo proprietário pertencem ao Controla.AI ou a seus licenciadores.

6. LIMITAÇÃO DE RESPONSABILIDADE
6.1. O serviço é fornecido "como está", dentro dos limites permitidos pela legislação brasileira.
6.2. Não nos responsabilizamos por decisões financeiras tomadas com base nas informações exibidas na plataforma.

7. CANCELAMENTO
Você pode encerrar sua conta a qualquer momento pelas configurações ou contato de suporte. Podemos suspender contas que violem estes Termos.

8. LEGISLAÇÃO
Estes Termos são regidos pelas leis da República Federativa do Brasil. Foro: comarca do domicílio do usuário, salvo disposição legal em contrário.`,
  },
  {
    type: "privacy_policy",
    title: "Política de Privacidade",
    summary: "Como coletamos, usamos e protegemos seus dados pessoais.",
    content: `POLÍTICA DE PRIVACIDADE — CONTROLA.AI

Última atualização: 16 de junho de 2026.

Esta Política descreve o tratamento de dados pessoais conforme a Lei nº 13.709/2018 (LGPD).

1. CONTROLADOR
Controla.AI — contato para privacidade: privacidade@controla.ai

2. DADOS COLETADOS
• Identificação: nome, e-mail, telefone (WhatsApp).
• Dados financeiros: transações, categorias, metas, orçamentos e saldo informado.
• Dados de uso: logs de acesso, interações com IA, mensagens WhatsApp processadas.
• Dados técnicos: endereço IP, user-agent e registros de consentimento.

3. FINALIDADES
• Prestação do serviço de controle financeiro.
• Autenticação, segurança e prevenção a fraudes.
• Melhoria de produto e suporte ao usuário.
• Cumprimento de obrigações legais e exercício regular de direitos.

4. COMPARTILHAMENTO
Podemos compartilhar dados com:
• Provedores de infraestrutura (hospedagem, banco de dados).
• OpenAI (processamento de linguagem natural), apenas o necessário para interpretar mensagens.
• Autoridades, quando exigido por lei.

Não vendemos seus dados pessoais.

5. RETENÇÃO
Mantemos os dados enquanto a conta estiver ativa ou conforme exigências legais. Após exclusão, dados podem ser anonimizados ou eliminados em prazo razoável.

6. SEGURANÇA
Adotamos medidas técnicas e administrativas como criptografia de senhas (bcrypt), HTTPS e controle de acesso.

7. SEUS DIREITOS (LGPD)
Você pode solicitar: confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação, informação sobre compartilhamento e revogação de consentimento, quando aplicável.

8. COOKIES E ARMAZENAMENTO LOCAL
Utilizamos token JWT e preferências locais (ex.: tema) para funcionamento da aplicação.

9. ALTERAÇÕES
Esta Política pode ser atualizada. Mudanças relevantes serão comunicadas por e-mail ou aviso na plataforma.`,
  },
  {
    type: "data_processing_lgpd",
    title: "Consentimento para Tratamento de Dados (LGPD)",
    summary: "Autorização específica para tratamento de dados pessoais e sensíveis financeiros.",
    content: `TERMO DE CONSENTIMENTO PARA TRATAMENTO DE DADOS — LGPD

Última atualização: 16 de junho de 2026.

Ao aceitar este termo, você autoriza o Controla.AI a tratar seus dados pessoais nas condições abaixo, com fundamento no art. 7º, I, da Lei nº 13.709/2018 (consentimento do titular).

1. DADOS OBJETO DO TRATAMENTO
Nome, e-mail, telefone, senha (armazenada de forma criptografada), lançamentos financeiros, metas, mensagens enviadas via WhatsApp ou chat web, áudios e imagens de comprovantes quando enviados por você.

2. FINALIDADES AUTORIZADAS
• Registrar e categorizar suas movimentações financeiras.
• Exibir dashboards, relatórios e metas personalizadas.
• Processar mensagens com inteligência artificial para interpretação de gastos e receitas.
• Enviar alertas de metas e comunicações operacionais relacionadas ao serviço.

3. ARMAZENAMENTO E TRANSMISSÃO
Os dados serão armazenados em servidores seguros (PostgreSQL) e podem ser processados por subprocessadores localizados no Brasil ou no exterior, sempre com salvaguardas contratuais adequadas.

4. DADOS SENSÍVEIS
Informações financeiras podem ser consideradas dados pessoais relevantes. O tratamento ocorre exclusivamente para as finalidades descritas e com medidas de segurança proporcionais.

5. REVOGAÇÃO
Você pode revogar este consentimento a qualquer momento, o que pode limitar ou impedir o uso de funcionalidades essenciais. A revogação não afeta tratamentos realizados anteriormente com base no consentimento válido.

6. REGISTRO DO CONSENTIMENTO
Registramos data, hora, versão deste documento, endereço IP e navegador utilizados no momento do aceite, para fins de auditoria e conformidade legal.

7. CONTATO DO ENCARREGADO (DPO)
Para exercer direitos ou esclarecer dúvidas: privacidade@controla.ai`,
  },
];

/** Payload público retornado por GET /auth/legal. */
export function getLegalDocumentsPayload() {
  return {
    version: LEGAL_DOCUMENT_VERSION,
    requiredConsents: [...REQUIRED_CONSENT_TYPES],
    documents: LEGAL_DOCUMENTS.map((d) => ({
      type: d.type,
      title: d.title,
      summary: d.summary,
      content: d.content,
    })),
  };
}
