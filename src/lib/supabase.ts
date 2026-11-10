/**
 * @module src\lib\supabase.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { createClient } from '@supabase/supabase-js';

// Extração das variáveis de ambiente de forma segura pelo Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Instância global do cliente Supabase.
 * Centraliza as regras de conexão do frontend com o backend.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
