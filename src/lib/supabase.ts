import { createClient } from '@supabase/supabase-js';

// Extração das variáveis de ambiente de forma segura pelo Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

/**
 * Instância global do cliente Supabase.
 * Centraliza as regras de conexão do frontend com o backend.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
