/**
 * @module src/pages/docs/pages/TestnetKit.tsx
 * @description Página de documentação interativa (TestnetKit) do portal de desenvolvedores WalletNow OS (exporta: TestnetKit).
 */
/**
 * @packageDocumentation
 * @module Pages/Docs/TestnetKit
 *
 * TestnetKit — Developer Sandbox & Playground Page
 *
 * Propósito:
 * Ponto de entrada interativo no Portal do Desenvolvedor (`/docs/testnet-kit`).
 * Renderiza o pacote de sandbox `TestnetKitSDK`, oferecendo aos desenvolvedores
 * da rede Stellar ferramentas de provisionamento efêmero de contas, faucet automatizado,
 * pools de liquidez AMM ($X \times Y = K$), monitor de latência e testes de âncoras SEPs.
 *
 * Marco Institucional:
 * Entregável de destaque para a submissão do Follow-On InstaAward e Hackathon 2026.
 *
 * @updated Setembro de 2026
 */

import React from 'react';
import TestnetKitSDK from '@walletnow/sdk/testnetkit';

export default function TestnetKit() {
  return (
    <div style={{ width: '100%' }}>
      <TestnetKitSDK />
    </div>
  );
}

