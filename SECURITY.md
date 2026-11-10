<!-- @module SECURITY.md | WalletNow Protocol - Documentação e especificações de engenharia -->

# Política de Segurança do WalletNow

A segurança é o pilar fundamental de qualquer protocolo financeiro.

## Versões Suportadas

| Versão | Suportada |
| ------ | --------- |
| > 1.0.0| Sim       |
| 0.x.x  | Não (Alpha/Beta) |

*Atualmente estamos na fase Alpha (0.2.x). Não utilize em produção com fundos reais.*

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
7. **Sanitização de Telemetria e Logs**: Cabeçalhos sensíveis (JWT, API keys, credenciais) e dados privados são completamente excluídos dos logs de servidor e preflights CORS.

---

## 📄 Registro Completo de Riscos e Auditoria
Para consultar o relatório detalhado de remediações da Fase 2, os riscos residuais catalogados (CVSS) e a matriz de conformidade regulatória (LGPD / BACEN), consulte o documento oficial:
👉 **[docs/mainnet/SECURITY_RISKS.md](docs/mainnet/SECURITY_RISKS.md)** (Versão 2.0).

