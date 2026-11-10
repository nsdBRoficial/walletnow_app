/**
 * @module check_balances.js
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.development' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: profiles, error } = await supabase.from('profiles').select('*');
  if (error || !profiles) {
    console.error("Error fetching profiles:", error);
    return;
  }
  
  for (const profile of profiles) {
    if (profile.stellar_address) {
      const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${profile.stellar_address}`);
      const data = await res.json();
      if (data.balances) {
         for (const b of data.balances) {
           if (b.asset_code === 'TESOURO') {
              console.log("FOUND TESOURO on account", profile.stellar_address);
              console.log(JSON.stringify(b, null, 2));
           }
         }
      }
    }
  }
}

check();
