<!-- @module SECURITY.md | Política de segurança, modelo de autocustódia criptográfica, RLS e invariantes de auditoria do WalletNow -->

# Política de Segurança do WalletNow

A segurança é o pilar fundamental de qualquer protocolo financeiro.

## Versões Suportadas

| Versão | Status | Suportada |
| ------ | ------ | --------- |
| `0.2.x` (Atual) | Release Candidate (Testnet Ativa + Mainnet-Ready) | ✅ Sim |
| `< 0.2.0` | Legado / Alpha Inicial | ❌ Não |

## Reportando Vulnerabilidades
Se você descobrir uma vulnerabilidade de segurança, **NÃO** abra uma issue pública.

Por favor, envie um e-mail para `security@walletnow.app` (fictício para o template) detalhando a falha, os passos para reproduzir e uma prova de conceito (PoC). Nós responderemos em até 48 horas.

## Princípios de Segurança (Auditoria Adversarial v2.0)

1. **Autocustódia Estrita (Client-Side Signing)**: O Core e o frontend NUNCA têm acesso ou armazenam chaves privadas de emissores institucionais. Chaves de usuário operam exclusivamente em hardware enclaves / WebAuthn (Passkeys) ou isolamento local.
2. **Segregação de Chaves Institucionais**: A chave de emissão (`STELLAR_ISSUER_SECRET`) opera exclusivamente em Supabase Vault / Edge Functions isoladas, exigindo autenticação JWT e validação de titularidade antes de assinar.
3. **Anti-Drenagem de Recursos (Gas Station Ownership Check)**: O patrocínio de taxas on-chain e criação de contas requer verificação estrita de que a chave pública pertence ao usuário autenticado (`verifyUserOwnsPublicKey`).
4. **Isolamento de Dados e RLS Granular**: Tabelas financeiras (`fiat_transactions`, `audit_logs`, `keepalive_log`) possuem políticas de Row Level Security estritas, impedindo inserção ou adulteração por usuários arbitrários (somente `service_role`).
5. **Idempotência e Anti-Replay**: Operações financeiras usam travas de concorrência e índices únicos baseados em `correlation_id` para evitar duplo gasto e transações duplicadas.
6. **Privacidade e Conformidade Regulatória (LGPD/GDPR)**: Nenhum dado pessoal identificável (PII) é registrado em texto claro na blockchain. Utiliza-se esquema de compromisso criptográfico (Cryptographic Commitment via SHA3-256) como Trust Anchor on-chain.
7. **Sanitização de Telemetria e Logs**: Cabeçalhos sensíveis (JWT, API keys, credenciais) e dados privados são completamente excluídos dos logs de servidor e preflights CORS, além de redigidos automaticamente no cliente por `logger.ts` e `productionLogger.ts`.
8. **Validação Automatizada Contínua**: Os cofres `DeviceVault` (PBKDF2 100k SHA-256 + AES-GCM-256), `MnemonicVault` (BIP39) e a derivação SEP-0005 (`m/44'/148'/0'`) são verificados a cada commit por testes unitários dedicados (`src/security/*.test.ts` e `src/utils/bip39Wallet.test.ts`) contra adulteração de tag GCM, acesso cruzado entre usuários e vazamento em texto plano.

---

## 📄 Registro Completo de Riscos e Auditoria
Para consultar o relatório detalhado de remediações da Fase 2, os riscos residuais catalogados (CVSS) e a matriz de conformidade regulatória (LGPD / BACEN), consulte o documento oficial:
👉 **[docs/mainnet/SECURITY_RISKS.md](docs/mainnet/SECURITY_RISKS.md)** (Versão 2.0).

