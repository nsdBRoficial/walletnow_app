import { supabase } from '../lib/supabase';

export const StorageService = {
    /**
     * Converte uma string Base64 em Blob e faz o upload para o bucket seguro do Supabase.
     */
    async uploadKycDocument(userId: string, documentBase64: string, selfieBase64: string) {
        const uploadBase64 = async (base64: string, path: string) => {
            const base64Data = base64.split(',')[1] || base64;
            const mimeTypeMatch = base64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
            const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';

            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });

            const { data, error } = await supabase.storage
                .from('kyc_docs')
                .upload(path, blob, { upsert: false, contentType: mimeType });

            if (error) throw new Error(`Erro no Upload para Supabase Storage: ${error.message}`);
            return data;
        };

        // CORREÇÃO RLS: A RLS do bucket exige `(storage.foldername(name))[1]` igual ao uid()
        // O Supabase mapeia pastas através de barras (/). Portanto precisamos obrigatoriamente
        // iniciar o nome do arquivo com "id_do_usuario/".
        const docPath = `${userId}/document_${Date.now()}.jpg`;
        const selfiePath = `${userId}/selfie_${Date.now()}.jpg`;

        console.log('☁️ Realizando backup seguro das evidências KYC no Supabase Storage...');

        await Promise.all([
            uploadBase64(documentBase64, docPath),
            uploadBase64(selfieBase64, selfiePath)
        ]);

        console.log('✅ Upload das evidências concluído com sucesso.');
    }
};
