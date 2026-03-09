-- Supabase Migration: Criação do Bucket de Storage para Documentos de KYC
-- Cria o bucket 'kyc_docs' e aplica políticas rigorosas de Row Level Security (RLS)
-- garantindo que os usuários só possam acessar e modificar os próprios arquivos.

-- 1. Criação do Bucket
insert into storage.buckets (id, name, public)
values ('kyc_docs', 'kyc_docs', false)
on conflict (id) do nothing;

-- 2. Habilita RLS na tabela de objetos de storage (caso não esteja)
alter table storage.objects enable row level security;

-- 3. Políticas de Segurança (Row Level Security)

-- Permitir que os usuários (autenticados) vejam seus próprios arquivos
create policy "Usuários podem ver seus próprios documentos de KYC"
on storage.objects for select
to authenticated
using ( bucket_id = 'kyc_docs' and auth.uid()::text = (storage.foldername(name))[1] );

-- Permitir que os usuários insiram arquivos na própria pasta (o path inicial deve ser o próprio user_id)
create policy "Usuários podem enviar documentos para KYC na própria pasta"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'kyc_docs' and auth.uid()::text = (storage.foldername(name))[1] );

-- Permitir que os usuários atualizem seus próprios arquivos
create policy "Usuários podem atualizar seus próprios documentos de KYC"
on storage.objects for update
to authenticated
using ( bucket_id = 'kyc_docs' and auth.uid()::text = (storage.foldername(name))[1] );

-- Permitir que os usuários apaguem seus próprios arquivos
create policy "Usuários podem deletar seus próprios documentos de KYC"
on storage.objects for delete
to authenticated
using ( bucket_id = 'kyc_docs' and auth.uid()::text = (storage.foldername(name))[1] );
