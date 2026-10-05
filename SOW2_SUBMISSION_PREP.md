# Preparação para Submissão: Instawards SOW2 (WalletNow)

## 1. Resumo Executivo
Os documentos preparados (versões PT-BR e EN) definem o **Statement of Work (SOW2)** para a bolsa Instawards da Stellar. Atendendo à diretriz estrita da diretoria financeira (CFO), o escopo migra 100% para o **desenvolvimento on-chain e infraestrutura de backend**.

O foco central é a construção de **Contratos Inteligentes Soroban (Gasless)** e um **Backend Stellar RPC Relayer**, implementando roteamento atômico nativo. Isso evolui a WalletNow de uma ferramenta de integração no lado do cliente (SOW1) para uma robusta infraestrutura de abstração (B2B SaaS), capaz de escalar o processamento de transações sem expor os usuários finais à latência da rede ou à necessidade de deter saldos nativos em XLM.

## 2. Fases de Execução (Sprint de 30 Dias)
O cronograma foi desenhado para maximizar a entrega técnica dentro da janela restrita de 30 dias exigida pelo programa:

*   **Semana 1: Fundações Soroban.** Configuração do ambiente Rust e desenvolvimento dos contratos inteligentes para meta-transações (validação secp256r1 / Passkeys on-chain).
*   **Semana 2: Infraestrutura Relayer.** Arquitetura e desenvolvimento da API do Backend Stellar RPC Relayer para ingestão de payloads, patrocínio (assinatura) e submissão de transações.
*   **Semana 3: Roteamento Atômico.** Integração da lógica de agrupamento (batching) on-chain — executando a criação de trustlines e operações de swap (Soroswap) de forma atômica em uma única invocação.
*   **Semana 4: Deploy e Hardening.** Testes de carga do Relayer e deploy dos contratos Wasm compilados diretamente na Stellar Mainnet.

## 3. Análise de Adequação aos Critérios do Grant
Esta proposta está perfeitamente calibrada com os requisitos do Instawards e aos interesses estratégicos da Stellar Development Foundation (SDF):
*   **Foco em Execução, não Exploração:** O escopo define entregas técnicas binárias e verificáveis publicamente (Hashes Wasm, Logs do Relayer).
*   **Orçamento e Prazo Respeitados:** O limite de **USD 5.000** e o prazo de **30 dias** são garantidos, alocando recursos unicamente para horas de engenharia pesada.
*   **Alinhamento Estratégico (SDF):** Acelera diretamente a adoção do Soroban (smart contracts) e fomenta o rendimento transacional da Mainnet.
*   **Escopo Negativo de Proteção:** A exclusão explícita de UIs voltadas ao cliente final (B2C), marketing e integrações off-chain blinda a equipe contra "scope creep" (aumento de escopo descontrolado).

## 4. Preparação para o Próximo Passo (Ações Imediatas)
Com os PDFs prontos para submissão, devemos preparar o terreno técnico para começar a execução no "Dia 1" após a aprovação:

1.  **Estruturação do Workspace de Contratos:** Garantir que o workspace `/contracts` no nosso monorepo esteja inicializado corretamente e com os pipelines de compilação Wasm configurados (`stellar-cli` / `cargo`).
2.  **Repositório do Relayer:** Preparar a infraestrutura básica da API do Relayer no repositório.
3.  **Ambiente de Testes RPC:** Provisionar o acesso RPC da Stellar (ex: acesso público ou provedores como QuickNode/ValidationCloud) para que o Relayer tenha endpoints de alta disponibilidade disponíveis rapidamente.
4.  **Visão Além do Instawards:** Registrar internamente que o sucesso técnico e a implantação na Mainnet deste SOW2 serão a prova de conceito definitiva para a nossa futura e maior aplicação ao **SCF (Stellar Community Fund) Build Award**.

---
*Status dos Documentos de Solicitação: PRONTOS PARA SUBMISSÃO.*
