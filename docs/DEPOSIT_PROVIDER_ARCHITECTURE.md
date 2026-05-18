# Deposit Provider Architecture

## Overview
As part of the WalletNow architectural evolution, the deposit flow has been decoupled from the UI component `DepositModal.tsx` and moved into a scalable Provider-based Architecture.

The goal is to allow multiple deposit and on-ramp pathways (Woovi/Pix, Etherfuse, Stripe, etc.) without inflating the modal logic with multiple `if/else` statements for rendering and without mixing blockchain minting states with fiat gateways.

## Scalability & Philosophy
The `src/services/providers` module introduces a standard `IDepositProvider` interface.
Any new integration must implement this interface or extend `BaseDepositProvider`.

### Benefits
1. **Separation of Concerns**: The UI only iterates over an array of `availableProviders`. It knows how to render a provider based on its metadata (`name`, `description`, `iconName`, `status`) without knowing *how* the provider works.
2. **Easy Toggle**: We can disable or mark a provider as `coming_soon` simply by changing its `status` property in the provider class.
3. **Structured Logging**: Each provider handles its own logging prefix (`[WalletNow][Woovi]`, `[WalletNow][Etherfuse]`, etc.), improving observability.
4. **Future-Proof**: When integrating real API keys for Stripe or Etherfuse, developers will only work inside the respective provider files, leaving `DepositModal.tsx` untouched.

## Integration Flow
1. User clicks "Deposit".
2. `DepositModal` mounts in `provider_selection` phase.
3. `availableProviders` array is mapped into visual cards.
4. If a provider is `active`, it's clickable.
5. Clicking an active provider sets it as the `selectedProvider` and moves the phase to the respective input/processing flow.

## Rationale for Modular Payment Rails
WalletNow operates as a Web3 aggregator. Relying on a single fiat gateway limits global reach. By establishing modular payment rails early on, we create a treasury infrastructure ready for LATAM (Pix/Etherfuse) and Global (Stripe) expansion seamlessly.
