// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import Onboarding from '../Onboarding';

// Mock do AuthContext para isolar o teste do componente
vi.mock('../../contexts/AuthContext', () => ({
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
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signInAnonymously: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

describe('Teste de Componente - Fluxo de Erro no Onboarding via Passkey (src/components)', () => {
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Suporte a crypto.getRandomValues em ambiente JSDOM
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

    // Mock da API WebAuthn nativa
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
    const cancellationError = new DOMException('The operation was canceled or not allowed.', 'NotAllowedError');
    mockCreate.mockRejectedValue(cancellationError);

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>
    );

    const passkeyButton = screen.getByRole('button', { name: /entrar com passkey/i });
    expect(passkeyButton).toBeInTheDocument();
    expect(passkeyButton).not.toBeDisabled();

    fireEvent.click(passkeyButton);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    // O componente não crasha e volta ao estado habilitado
    await waitFor(() => {
      expect(passkeyButton).not.toBeDisabled();
      expect(screen.queryByText(/processando biometria/i)).not.toBeInTheDocument();
    });

    // Mensagem amigável de erro aparece na tela
    const errorTitle = await screen.findByText('Erro de Acesso');
    expect(errorTitle).toBeInTheDocument();

    const friendlyMessage = await screen.findByText('Operação de Biometria cancelada pelo usuário.');
    expect(friendlyMessage).toBeInTheDocument();
  });

  it('não deve quebrar (crash) e deve exibir mensagem amigável quando ocorre falha de hardware ou erro genérico', async () => {
    const hardwareError = new Error('Biometric hardware failure.');
    mockCreate.mockRejectedValue(hardwareError);

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

    const friendlyMessage = await screen.findByText(
      /falha de hardware\/passkey\. tente logar via celular ou use o google/i
    );
    expect(friendlyMessage).toBeInTheDocument();
  });
});
