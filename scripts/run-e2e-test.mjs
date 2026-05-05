// scripts/run-e2e-test.mjs
// Teste end-to-end completo: login → create-order → simulate-fiat → poll banco → valida XDR
// Uso: node scripts/run-e2e-test.mjs <email> <password>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2" assert { type: "json" };

const SUPABASE_URL      = "https://vjvljpjzusgjsxnoihau.supabase.co";
const ANON_KEY          = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdmxqcGp6dXNnanN4bm9paGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTg4NjEsImV4cCI6MjA4ODM5NDg2MX0.XKFgFVttI3sdsSSXQgu5CZyflmT1TfWS5DpHogjx67s";
const FUNCTIONS_URL     = `${SUPABASE_URL}/functions/v1`;
