// supabase/functions/_shared/auth.ts
// Valida JWT Supabase e retorna usuário autenticado

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthenticatedUser {
  id: string;
  email: string | undefined;
}

export async function requireAuth(req: Request): Promise<AuthenticatedUser> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED: Token JWT ausente ou malformado.");
  }

  const jwt = authHeader.replace("Bearer ", "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const { data: { user }, error } = await supabase.auth.getUser(jwt);

  if (error || !user) {
    throw new Error(`UNAUTHORIZED: Token inválido ou expirado. ${error?.message ?? ""}`);
  }

  return { id: user.id, email: user.email };
}

/** Cliente Supabase com service_role para bypass de RLS */
export function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}
