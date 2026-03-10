-- ==========================================
-- SPRINT 9: MOTOR DE PAGAMENTOS (FIAT <-> CRYPTO)
-- Tabela de Conciliação e Rastros (PIX vs BRZ Mint)
-- ==========================================

CREATE TYPE fiat_transaction_type AS ENUM ('cash_in', 'cash_out');
CREATE TYPE fiat_status AS ENUM ('pending', 'processing', 'paid', 'failed', 'refunded');
CREATE TYPE crypto_status AS ENUM ('awaiting_fiat', 'minting', 'burning', 'success', 'failed');

CREATE TABLE fiat_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 1. Detalhes Fiduciários
    type fiat_transaction_type NOT NULL,
    amount NUMERIC(15, 6) NOT NULL, -- Valor financeiro preciso BRL/BRZ
    
    -- 2. Rastreadores Gateway Bancário (Transfero Sandbox)
    transfero_deposit_id VARCHAR(255), -- ID de Depósito gerado lá
    transfero_withdraw_id VARCHAR(255), -- ID do Saque gerado lá
    status_fiat fiat_status NOT NULL DEFAULT 'pending',
    
    -- 3. Rastreadores Blockchain (Stellar)
    status_crypto crypto_status NOT NULL DEFAULT 'awaiting_fiat',
    tx_hash_stellar VARCHAR(255), -- Recibo da transação imutável
    
    -- 4. Dados Adicionais & Compliance
    error_log TEXT,                
    destination_pix_key VARCHAR(255), -- Pra onde foi o saque CPF?
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativa RLS (Segurança) mas deixamos políticas abertas para backend de serviço
ALTER TABLE fiat_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem suas próprias transações FIAT" 
ON fiat_transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service Role Master insere livremente" 
ON fiat_transactions FOR ALL 
USING (true) WITH CHECK (true); -- Segurança relaxada para webhooks/service hooks

-- Indexações de Performance para o Polling da Dashboard
CREATE INDEX idx_fiat_txns_user ON fiat_transactions(user_id);
CREATE INDEX idx_fiat_txns_transfero_dep ON fiat_transactions(transfero_deposit_id);
