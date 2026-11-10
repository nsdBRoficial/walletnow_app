<!-- @module docs/qa/PERSONAS.md | Personas de QA que guiam os cenários E2E do WalletNow -->

# Personas de QA — WalletNow

Cada persona vira uma spec em `tests/e2e/personas/`. Os cenários marcados com 🔒 são bloqueantes no CI.

## 1. Ana — Novata Pix (`novice.spec.ts`)
- **Perfil:** nunca usou cripto e entra pelo celular.
- **Jornada 🔒:** cadastro → passkey → wallet criada sem ver a mnemônica → depósito Pix (mock) → saldo em BRL atualizado.
- **Verificar:** nenhum termo técnico (XLM, trustline) aparece na UI; loading e erros são amigáveis.

## 2. Bruno — Investidor (`investor.spec.ts`)
- **Perfil:** já tem saldo e quer rendimento.
- **Jornada 🔒:** login → swap → aplicação em yield (Defindex) → compra de RWA (Etherfuse, KYC mock) → portfólio reflete as posições.
- **Verificar:** cotação exibida = cotação executada (dentro do slippage); confirmação antes de assinar.

## 3. Carla — Usuária recorrente (`recurring.spec.ts`)
- **Perfil:** usa o app toda semana.
- **Jornada 🔒:** login com passkey → saque Pix → histórico em Atividade → logout limpa a sessão.
- **Verificar:** validação de valor/CPF/chave Pix; saldo insuficiente bloqueia o saque.

## 4. Diego — Recuperação (`recovery.spec.ts`)
- **Perfil:** trocou de celular.
- **Jornada:** novo dispositivo → recuperação → mesma public key de antes → saldo preservado.
- **Verificar:** mnemônica errada é rejeitada; não existe tela intermediária que exponha a chave.

## 5. Eva — Mal-intencionada (`adversary.spec.ts`)
- **Perfil:** tenta abusar do sistema.
- **Jornada 🔒:** inputs com XSS/valores negativos/overflow → rejeitados; sessão expirada → redireciona ao login; chamada direta à API com o ID de outro usuário → negada (RLS).
- **Verificar:** nenhum segredo em `localStorage` em texto claro; nenhum erro técnico vazado na UI.
