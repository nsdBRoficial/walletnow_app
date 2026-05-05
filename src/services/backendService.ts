// src/services/backendService.ts
//
// Cliente do frontend para todas as Supabase Edge Functions.
// Nenhuma secret é usada aqui — apenas o JWT do usuário logado.

import { supabase } from '../lib/supabase';

/** URL base das Edge Functions derivada da variável Supabase */
const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// ─── Helper interno ────────────────────────────────────────────────────────────

async function callEdgeFunction<T>(
  fnName: string,
  body: Record<string, unknown>
): Promise<T> {
  // Pega a sessão atual para extrair o JWT de acesso
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const res = await fetch(`${FUNCTIONS_URL}/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error ?? `Erro ${res.status} em ${fnName}`);
  }

  return data as T;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CreateOrderResult {
  correlationId: string;      // orderId salvo no banco e Etherfuse
  depositClabe:  string;      // CLABE para TED/PIX/SPEI
  exchangeRate:  string;      // cotação MXN/USDC no momento
  feeAmount:     string;      // taxa em MXN
  statusPage:    string;      // link Etherfuse para acompanhar
}

export interface SimulateFiatResult {
  success:  boolean;
  orderId:  string;
  message:  string;
}

export interface FiatTransaction {
  id:                            string;
  user_id:                       string;
  provider:                      string;
  correlation_id:                string;
  amount_fiat:                   number;
  currency:                      string;
  status:                        'pending' | 'processing' | 'completed' | 'claimed' | 'failed';
  stellar_address:               string;
  stellar_xdr:                   string | null;
  stellar_claimable_balance_id:  string | null;
  stellar_tx_hash:               string | null;
  created_at:                    string;
  updated_at:                    string;
}

// ─── API Pública ──────────────────────────────────────────────────────────────

export const BackendService = {

  /**
   * Cria um order de onramp na Etherfuse e salva no banco.
   * Retorna CLABE para o usuário depositar.
   */
  createOrder: (amount: string, stellarAddress: string): Promise<CreateOrderResult> =>
    callEdgeFunction('etherfuse-create-order', { amount, stellarAddress }),

  /**
   * Simula recebimento fiat (Sandbox only).
   * Aciona os webhooks Etherfuse: funded → completed.
   */
  simulateFiat: (orderId: string): Promise<SimulateFiatResult> =>
    callEdgeFunction('etherfuse-simulate-fiat', { orderId }),

  /**
   * Busca transações fiat do usuário logado diretamente do Supabase.
   * Ordenado da mais recente para a mais antiga.
   */
  async getMyTransactions(): Promise<FiatTransaction[]> {
    const { data, error } = await supabase
      .from('fiat_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as FiatTransaction[];
  },

  /**
   * Busca uma transação pelo correlation_id.
   */
  async getTransactionById(correlationId: string): Promise<FiatTransaction | null> {
    const { data, error } = await supabase
      .from('fiat_transactions')
      .select('*')
      .eq('correlation_id', correlationId)
      .single();

    if (error || !data) return null;
    return data as FiatTransaction;
  },

  /**
   * Atualiza stellar_tx_hash e status='claimed' após claim bem-sucedido.
   * Executado no frontend após submissão do XDR à Stellar.
   */
  async markAsClaimed(correlationId: string, txHash: string): Promise<void> {
    const { error } = await supabase
      .from('fiat_transactions')
      .update({
        status:           'claimed',
        stellar_tx_hash:  txHash,
        updated_at:       new Date().toISOString(),
      })
      .eq('correlation_id', correlationId);

    if (error) throw new Error(`Falha ao marcar como claimed: ${error.message}`);
  },

  /**
   * Subscreve a atualizações em tempo real de uma transação específica.
   * Retorna função de cleanup para chamar em useEffect cleanup.
   */
  subscribeToTransaction(
    correlationId: string,
    onUpdate: (tx: FiatTransaction) => void
  ): () => void {
    const channel = supabase
      .channel(`fiat_tx_${correlationId}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'fiat_transactions',
          filter: `correlation_id=eq.${correlationId}`,
        },
        (payload) => {
          onUpdate(payload.new as FiatTransaction);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Subscreve a TODAS as transações do usuário (para atualizar dashboard).
   * Retorna função de cleanup.
   */
  subscribeToUserTransactions(
    userId: string,
    onUpdate: (tx: FiatTransaction) => void
  ): () => void {
    const channel = supabase
      .channel(`fiat_tx_user_${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'fiat_transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onUpdate(payload.new as FiatTransaction);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
