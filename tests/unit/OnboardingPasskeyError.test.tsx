// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import Login, { Onboarding } from '../../src/pages/Login';

// Mock do AuthContext para isolar o teste do componente
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    session: null,
    user: null,
    profile: null,
    loading: false,
    authError: null,
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock do cliente Supabase
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signInAnonymously: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

describe('Teste de Componente - Fluxo de Erro no Onboarding via Passkey', () => {
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Garante suporte a crypto.getRandomValues em ambiente JSDOM
    if (!window.crypto || !window.crypto.getRandomValues) {
      Object.defineProperty(window, 'crypto', {
        value: {
          getRandomValues: (buffer: Uint8Array) => {
            for (let i = 0; i < buffer.length; i++) {
              buffer[i] = Math.floor(Math.random() * 256);
            }
            return buffer;
          },
        },
        writable: true,
        configurable: true,
      });
    }

    mockGet = vi.fn().mockResolvedValue(null);
    mockCreate = vi.fn();

    // Mock da API WebAuthn (navigator.credentials)
    Object.defineProperty(window.navigator, 'credentials', {
      value: {
        get: mockGet,
        create: mockCreate,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('não deve quebrar (crash) e deve exibir mensagem amigável quando o usuário cancela a biometria (NotAllowedError)', async () => {
    // Simula cancelamento do usuário no modal nativo da Passkey
    const cancellationError = new DOMException('The operation was canceled or not allowed.', 'NotAllowedError');
    mockCreate.mockRejectedValue(cancellationError);

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>
    );

    // Botão de entrada por Passkey
    const passkeyButton = screen.getByRole('button', { name: /entrar com passkey/i });
    expect(passkeyButton).toBeInTheDocument();
    expect(passkeyButton).not.toBeDisabled();

    // Dispara a tentativa de login por biometria
    fireEvent.click(passkeyButton);

    // Aguarda a chamada do navigator.credentials.create
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    // Critério 1: O componente não quebra e volta ao estado não carregando
    await waitFor(() => {
      expect(passkeyButton).not.toBeDisabled();
      expect(screen.queryByText(/processando biometria/i)).not.toBeInTheDocument();
    });

    // Critério 2: Uma mensagem amigável de erro deve aparecer na tela
    const errorTitle = await screen.findByText('Erro de Acesso');
    expect(errorTitle).toBeInTheDocument();

    const friendlyMessage = await screen.findByText('Operação de Biometria cancelada pelo usuário.');
    expect(friendlyMessage).toBeInTheDocument();
  });

  it('não deve quebrar (crash) e deve exibir mensagem amigável quando ocorre falha de hardware ou erro genérico', async () => {
    // Simula falha de hardware na leitura biométrica
    const hardwareError = new Error('Biometric sensor malfunction or hardware unavailable.');
    mockCreate.mockRejectedValue(hardwareError);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const passkeyButton = screen.getByRole('button', { name: /entrar com passkey/i });
    fireEvent.click(passkeyButton);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    // Critério 1: Componente não crasha e recupera estado interativo
    await waitFor(() => {
      expect(passkeyButton).not.toBeDisabled();
    });

    // Critério 2: Mensagem amigável de falha de hardware na tela
    const errorTitle = await screen.findByText('Erro de Acesso');
    expect(errorTitle).toBeInTheDocument();

    const friendlyMessage = await screen.findByText(
      /falha de hardware\/passkey\. tente logar via celular ou use o google/i
    );
    expect(friendlyMessage).toBeInTheDocument();
  });

  it('não deve quebrar (crash) e deve exibir mensagem amigável quando o dispositivo não suporta Passkeys (NotSupportedError)', async () => {
    const notSupportedError = new DOMException('Passkeys not supported on this device.', 'NotSupportedError');
    mockCreate.mockRejectedValue(notSupportedError);

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>
    );

    const passkeyButton = screen.getByRole('button', { name: /entrar com passkey/i });
    fireEvent.click(passkeyButton);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(passkeyButton).not.toBeDisabled();
    });

    const errorTitle = await screen.findByText('Erro de Acesso');
    expect(errorTitle).toBeInTheDocument();

    const friendlyMessage = await screen.findByText('Este navegador/dispositivo não suporta Passkeys.');
    expect(friendlyMessage).toBeInTheDocument();
  });
});
