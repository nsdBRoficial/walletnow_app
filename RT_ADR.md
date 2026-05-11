# Relatório Técnico e ADR - WalletNow (Estado Atual da Main)

## 1. Visão do Produto
A WalletNow é uma plataforma de onboarding simplificado para o ecossistema Web3, projetada para reduzir o atrito de entrada de usuários comuns no mercado de criptoativos, conectando finanças tradicionais (fiat) com finanças descentralizadas de forma transparente.

## 2. Objetivo da WalletNow
Prover uma infraestrutura na qual usuários possam gerar contas não-custodiais (carteiras) implicitamente, atreladas as suas identidades (ex: e-mail ou social login), e depositar valores em Reais (BRL) usando Pix para receber instantaneamente o equivalente em dólares tokenizados (USDC) ou outras stablecoins no ecossistema Stellar.

## 3. Problema Resolvido
O "Vale da Morte" do Onboarding Web3. Atualmente, comprar criptomoedas exige navegar em exchanges centralizadas (KYC complexo), criar carteiras complexas (gerenciar seed phrases de 12 a 24 palavras) e entender conceitos como taxas de rede (gas fees) e assinaturas de transações. A WalletNow abstrai tudo isso.

## 4. Público Alvo
- Usuários leigos que querem proteção patrimonial em dólar, mas não têm conhecimento técnico de Web3.
- Usuários que buscam uma alternativa mais rápida, barata e menos invasiva que exchanges tradicionais.
- Brasileiros acostumados com a agilidade do Pix que desejam a mesma velocidade ao converter Reais para Dólar.

## 5. Arquitetura Atual Validada
- **Frontend:** Single Page Application (SPA) reativa e otimizada para mobile e desktop.
- **Backend/Edge:** Serverless functions no Supabase para lidar com integração de parceiros e webhooks.
- **Banco de Dados:** Supabase PostgreSQL com Row Level Security (RLS) para isolamento de dados do usuário e segurança das transações.
- **Integração Fiat:** Woovi API responsável por gerar os QRCodes Pix e processar pagamentos BRL em tempo real.

## 6. Tecnologias Usadas
- **Core:** React, TypeScript, Vite
- **Estilização:** Tailwind CSS, Radix UI (Componentes Acessíveis), Lucide React (Ícones)
- **Autenticação & DB:** Supabase (Auth, Postgres, Edge Functions, Realtime)
- **Blockchain:** Stellar SDK
- **Integração de Pagamento:** Woovi (Gateway Pix)
- **Hospedagem:** Hostinger/Vercel (Frontend)

## 7. Fluxos Já Funcionais (Status: VALIDADO)
- ✅ Autenticação (Login/Cadastro via Supabase).
- ✅ Geração Automática de Keypair (Stellar) atrelada à identidade do usuário de forma transparente.
- ✅ Dashboard do Usuário (Saldo, Histórico de Transações).
- ✅ Geração de Depósito via Pix (Integração Woovi).
- ✅ Atualização Realtime (Supabase) via Webhooks Woovi (status transitando de pendente para processado).
- ✅ Front-end estável e publicado em `nsdbr.com/walletnow`.

## 8. Fluxos Ainda Experimentais (Status: EXPERIMENTAL)
Estes fluxos foram movidos para branches específicas (como `feature/etherfuse-integration`) ou desativados na main até que alcancem maturidade:
- 🧪 **Etherfuse On-Ramp:** A integração completa ponta-a-ponta para mint de stablecoins atreladas a títulos (BRZ, etc).
- 🧪 **Fluxo Avançado de KYC:** Coleta automatizada de documentos e verificação de identidade exigidos por provedores de on-ramp.
- 🧪 **Claimable Balances:** Lógica de resgate de fundos via rede Stellar usando assinaturas diferidas e trustlines assíncronas.
- 🧪 **Saque Fiat (Off-Ramp):** Conversão de cripto novamente para BRL diretamente para conta bancária do usuário.

## 9. Decisões Arquiteturais (ADR)
- **Abstração da Complexidade Blockchain:** Seed phrases não são o foco principal. Utiliza-se derivação atrelada a uma identidade autenticada segura, ou delegação para carteiras conectadas.
- **Separação de Preocupações:** O Gateway de pagamento (Woovi) não conhece a blockchain (Stellar). O backend atua como orquestrador via Webhooks, garantindo que o mint/transferência só ocorra se o Pix for efetivamente pago.
- **Realtime UI:** Adotar Supabase Realtime para que a transição de estado da transação atualize a tela do usuário sem necessidade de `polling`, preservando recursos do servidor.

## 10. Limitações Atuais
- Custódia simplificada não possui mecanismo robusto de recuperação avançada de chaves no modelo non-custodial completo sem exigir responsabilidade técnica do usuário.
- O mapeamento 1:1 de depósitos Pix para emissão de stablecoins em testnet/mainnet precisa de conciliação financeira automatizada rigorosa para mitigar riscos de liquidez e flutuações.

## 11. Próximos Passos
- Fortalecer testes unitários e de integração (`vitest`) nas transições de estados de ordens.
- Implementar o Off-Ramp (Saque).
- Refinar alertas de erro e tolerância a falhas nos Webhooks.

## 12. Estratégia Futura de Stablecoins
Migrar gradualmente do suporte exclusivo a USDC para suportar cestas de stablecoins lastreadas por ativos do mundo real (RWA) focando em estabilidade regional e proteção contra inflação global.

## 13. Estratégia Futura Etherfuse
- A branch `feature/etherfuse-integration` contém o desenvolvimento da integração via API deles.
- A estratégia para retomar incluirá o uso do endpoint de `onboarding-url` da Etherfuse para delegar o KYC, retornando um webhook que ativará a permissão da conta.
- Somente após o KYC aprovado, o fluxo de criação de ordens e mint será ativado para o usuário.

## 14. Lições Aprendidas
- **Múltiplos Provedores = Alta Complexidade de Estado:** Conciliar diferentes provedores de pagamento e provedores de on-ramp em uma única máquina de estados gera gargalos. O ideal é isolar as máquinas de estado por provedor.
- **Conformidade em Primeiro Lugar:** Tentar fazer a integração de liquidez sem uma base sólida de KYC delegada resulta em falhas constantes de permissão na API do provedor (caso Etherfuse).

## 15. Estado Atual do MVP
O MVP na branch `main` é estável para o fluxo Woovi-Pix local. É perfeitamente utilizável para demonstração de conceito (geração de Pix, escuta do webhook simulado ou real, e atualização visual da carteira). A estrutura está pronta para evoluir para a Mainnet e retomar integrações complexas de forma modular.
