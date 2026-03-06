-- supabase/migrations/00002_create_auth_trigger.sql

-- Esta função é chamada toda vez que uma nova linha é inserida na tabela auth.users.
-- Ela copia os dados básicos do usuário para a tabela public.profiles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (
    NEW.id,
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criação do trigger vinculado à tabela auth.users (tabela padrão do Supabase)
-- Fazendo com que após a criação do usuário na auth.users, chame nossa função.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
