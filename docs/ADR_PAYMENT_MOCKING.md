# Architecture Decision Record (ADR): Payment Mocking Strategy

**Status:** Aceito  
**Data:** 12 de Maio de 2026  
**Contexto:** MVP Hackathon (Commit 2)  

## Contexto

A WalletNow possui uma infraestrutura de tesouraria híbrida integrando a Stellar Blockchain (via soroban/SDK) e gateways de pagamento fiduciário local (Woovi / OpenPix). Durante os ciclos de teste pré-hackathon, observamos instabilidades e timeouts de sandbox em transações na Woovi, além de ausência de suporte nativo na versão Sandbox gratuita para Webhooks atômicos confiáveis e PIX Out reais para certas faixas.

Além disso, nosso objetivo central na demonstração técnica é validar a camada blockchain e o Onboarding Abstrato (Passkeys/Gasless). Uma falha dependente de terceiros não-críticos para o valor Web3 do app prejudicaria a demonstração.

## Decisão

Implementaremos uma estratégia de "Fast-Mock" restrita estritamente às bordas de interação com o gateway fiduciário (Woovi).
- **Entrada (Depósito)**: A criação da cobrança gera um QR code irreal para efeitos de interface. Em 2 segundos simulamos que a Woovi mandou um Webhook com sucesso. 
- **Saída (Saque)**: Retornamos um id de correlação fixo sem realizar post externo para gateways.
- **Blockchain**: Permanecerá 100% REAL. O *Minting*, o *Burning*, as *Trustlines* e *Sponsorship* continuarão criando eventos verdadeiros na Testnet da Stellar. 

## Consequências

**Positivas:**
- Resiliência absoluta da Demo durante a banca. A UI e a experiência Web3 funcionam independente do status dos provedores fiduciários.
- Velocidade para demonstração, pois não precisamos esperar confirmações fiduciárias demoradas.
- Possibilita debugar com clareza o ciclo do aplicativo sem ruídos externos.

**Negativas:**
- O estado de concorrência com um provedor externo real (como double spending proveniente de falhas de rede) não será validado fisicamente, necessitando substituição imediata antes do GTM (Go-to-Market).

## Mitigações de Risco Adicionais (Commit 2)
Para não camuflar falhas no app devido ao mock, adicionamos neste commit:
- Logging rigoroso com Tags de sistema.
- Travas state-machine na interface.
- Rollbacks ativos entre falhas Blockchain <-> Mock.
