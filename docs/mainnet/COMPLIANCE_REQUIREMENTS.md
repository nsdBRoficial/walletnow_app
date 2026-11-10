<!-- @module docs\mainnet\COMPLIANCE_REQUIREMENTS.md | WalletNow Protocol - Documentação e especificações de engenharia -->

# WalletNow — Compliance Requirements

**Versão:** 1.0 | **Data:** 2026-05-27

> [!IMPORTANT]
> Este documento não constitui assessoria jurídica. Consultar advogado especializado em FinTech/Cripto antes do go-live.

---

## Regulação Aplicável (Brasil)

### Banco Central do Brasil (BACEN)
- **Resolução BCB nº 96/2021:** Regulação de serviços de ativos virtuais
- **Circular BCB nº 3.978/2020:** KYC e prevenção à lavagem de dinheiro
- **Limite de isenção PIX:** Verificar limites atuais para PF/PJ
- **Registro de PSA:** A WalletNow pode precisar de registro como Prestadora de Serviços de Ativos Virtuais (PSAV) dependendo do volume

### COAF (Conselho de Controle de Atividades Financeiras)
- Comunicação obrigatória para transações suspeitas
- Limite para comunicação: R$ 10.000 em espécie (verificar regras para cripto)
- Monitoramento de usuários com alto volume

### LGPD (Lei Geral de Proteção de Dados)
- **Dado sensível:** CPF, documentos de identidade, biometria (KYC)
- **Consentimento:** Explícito e específico para cada finalidade
- **Direitos do titular:** Acesso, correção, exclusão, portabilidade
- **Data Protection Officer (DPO):** Obrigatório se processar dados sensíveis em escala
- **ANPD notificação:** Em caso de vazamento de dados dentro de 72h

---

## Documentos Legais Necessários

### 1. Termos de Uso
Deve incluir:
- Natureza non-custodial da carteira (usuário é responsável pelas chaves)
- Responsabilidade pelo seed phrase/12 palavras
- Limitações de uso (restrições geográficas se houver)
- Política de fee (0,49% por transação)
- Procedimento de resolução de disputas
- Limitação de responsabilidade da WalletNow

### 2. Política de Privacidade (LGPD)
Deve incluir:
- Quais dados são coletados (email, CPF, documentos KYC)
- Finalidade do tratamento
- Base legal (consentimento, execução de contrato)
- Compartilhamento com terceiros (Etherfuse, Woovi, Gemini AI)
- Retenção de dados (prazo)
- Direitos do titular
- Contato do DPO

### 3. Disclaimer Non-Custodial
Aviso claro em destaque na UI:
```
"A WalletNow é uma carteira não-custodial. Você é o único 
responsável pela guarda das suas chaves privadas e seed phrase. 
A WalletNow não tem acesso à sua carteira e não pode recuperar 
seus fundos em caso de perda das suas credenciais."
```

### 4. Risk Disclosure (RWAs)
Para TESOURO Direto tokenizado e outros RWAs:
- Riscos de liquidez
- Riscos de contraparte (Etherfuse/Transfero)
- Riscos de smart contract
- Risco regulatório
- Que tokens não são depósitos bancários protegidos pelo FGC

### 5. KYC Disclosure
- Por que o KYC é necessário
- Como os documentos são processados (Gemini AI → Etherfuse)
- Prazo de aprovação
- O que acontece se rejeitado

---

## KYC — Limites e Obrigações

| Volume Mensal | KYC Necessário |
|--------------|----------------|
| Até R$ 500 | KYC leve (email + CPF) |
| R$ 500 - R$ 10.000 | KYC completo (doc + selfie) |
| Acima de R$ 10.000 | KYC avançado + validação manual |

**Nota:** Verificar limites atuais com a Etherfuse (eles definem os limites KYC no contexto deles).

---

## Parceiros — Due Diligence

### Etherfuse
- `[ ]` Contrato de parceria assinado
- `[ ]` SLA de uptime garantido
- `[ ]` Regulação aplicável à Etherfuse verificada
- `[ ]` Credenciais de produção obtidas

### Transfero (BRZ)
- `[ ]` Acordo de uso do BRZ em mainnet
- `[ ]` Issuer ID do BRZ mainnet confirmado

### Circle (USDC)
- `[ ]` USDC não requer parceria formal — usar issuer público
- `[ ]` Confirmar se há restrições para uso no Brasil

---

## Checklist de Compliance Pré-Launch

- `[ ]` Assessoria jurídica FinTech contratada
- `[ ]` Termos de Uso redigidos e aprovados
- `[ ]` Política de Privacidade (LGPD) redigida e aprovada
- `[ ]` Disclaimer Non-Custodial implementado na UI
- `[ ]` Risk Disclosure implementado na UI (pré-primeiro depósito)
- `[ ]` KYC Disclosure implementado na UI
- `[ ]` ANPD registro avaliado (verificar obrigatoriedade)
- `[ ]` COAF obrigações mapeadas e sistema de monitoramento configurado
- `[ ]` BACEN registro de PSAV avaliado
- `[ ]` Política de cookies implementada (LGPD)
