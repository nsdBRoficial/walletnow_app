// supabase/functions/_shared/etherfuse.ts
// Cliente Etherfuse — wrapper tipado para a API Sandbox/Produção

const ETHERFUSE_BASE_URL = Deno.env.get("ETHERFUSE_BASE_URL") ?? "https://api.sand.etherfuse.com";
const ETHERFUSE_API_KEY  = Deno.env.get("ETHERFUSE_API_KEY")  ?? "";

interface EtherfuseRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?:   Record<string, unknown>;
}

/** Faz requisição autenticada para a API Etherfuse.
 *  Auth: sem prefixo Bearer — direto no header Authorization. */
export async function etherfuseFetch<T = unknown>(
  path: string,
  options: EtherfuseRequestOptions = {}
): Promise<T> {
  const { method = "GET", body } = options;

  const res = await fetch(`${ETHERFUSE_BASE_URL}${path}`, {
    method,
    headers: {
      "Authorization": ETHERFUSE_API_KEY, // ← SEM "Bearer" conforme docs
      "Content-Type":  "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `[Etherfuse] ${method} ${path} → HTTP ${res.status}: ${text}`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

/** Simula recebimento fiat para um order (Sandbox only).
 *  POST /ramp/order/fiat_received */
export async function simulateFiatReceived(orderId: string): Promise<void> {
  await etherfuseFetch("/ramp/order/fiat_received", {
    method: "POST",
    body:   { orderId },
  });
}

/** Cria uma quote de onramp Stellar.
 *  POST /ramp/quote */
export interface EtherfuseQuoteResponse {
  quoteId:           string;
  exchangeRate:      string;
  feeBps:            number;
  feeAmount:         string;
  destinationAmount: string;
  expiresAt:         string;
}

export async function createQuote(params: {
  quoteId:       string;
  customerId:    string;
  blockchain:    string;
  sourceAsset:   string;
  targetAsset:   string;
  sourceAmount:  string;
  walletAddress: string;
}): Promise<EtherfuseQuoteResponse> {
  return etherfuseFetch<EtherfuseQuoteResponse>("/ramp/quote", {
    method: "POST",
    body: {
      quoteId:    params.quoteId,
      customerId: params.customerId,
      blockchain: params.blockchain,
      quoteAssets: {
        type:        "onramp",
        sourceAsset: params.sourceAsset,
        targetAsset: params.targetAsset,
      },
      sourceAmount:  params.sourceAmount,
      walletAddress: params.walletAddress,
    },
  });
}

/** Cria um order de onramp.
 *  POST /ramp/order */
export interface EtherfuseOrderResponse {
  orderId:               string;
  status:                string;
  depositClabe?:         string;
  depositBankName?:      string;
  depositAccountHolder?: string;
  statusPage?:           string;
}

export async function createOrder(params: {
  orderId:         string;
  bankAccountId:   string;
  cryptoWalletId:  string;
  quoteId:         string;
}): Promise<EtherfuseOrderResponse> {
  return etherfuseFetch<EtherfuseOrderResponse>("/ramp/order", {
    method: "POST",
    body: {
      orderId:        params.orderId,
      bankAccountId:  params.bankAccountId,
      cryptoWalletId: params.cryptoWalletId,
      quoteId:        params.quoteId,
    },
  });
}
