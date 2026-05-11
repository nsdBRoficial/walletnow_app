import { Fingerprint, Mail, Loader2, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

/**
 * Tela de Login (Onboarding)
 * 
 * Esta é a primeira tela que o usuário vê. O objetivo aqui é oferecer uma
 * experiência "UX Zero" (sem atritos). O usuário não precisa criar senhas complexas
 * ou guardar 24 palavras (seed phrase). Ele entra usando a biometria (Passkey) ou Google.
 */
export default function Login() {
  const navigate = useNavigate();
  const { session, authError } = useAuth();

  // Estados de Interface para ajudar a debugar!
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  /**
   * Efeito Colateral Escutador (Assertion):
   * Se em qualquer momento a sessão se tornar válida, forçamos o redirecionamento.
   */
  useEffect(() => {
    if (session) {
      console.log('✅ Sessão detectada no Contexto! Navegando para /dashboard...');
      navigate('/dashboard', { replace: true });
    }
  }, [session, navigate]);

  /**
   * Função para lidar com o login via Google OAuth (Prioridade 1)
   */
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      // Determinamos a URL de redirecionamento dinâmica.
      // Em desenvolvimento (localhost), mantemos o origin atual.
      // Em produção (Hostinger), forçamos a URL nsdbr.com.
      const redirectURL = window.location.origin.includes('localhost')
        ? `${window.location.origin}/walletnow/dashboard`
        : 'https://nsdbr.com/walletnow/dashboard';

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectURL
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Erro ao autenticar com Google:", err);
      setErrorMsg(err.message || 'Falha ao autenticar com provedor Google.');
      setIsLoading(false);
    }
  };

  /**
   * Função para lidar com o login via Passkeys biometria (Prioridade 2)
   * 
   * Novo Fluxo aprimorado: 
   * 1. Tenta Lógica de LOGIN (Assertion) -> navigator.credentials.get
   * 2. Tenta Lógica de REGISTRO (Attestation) -> navigator.credentials.create
   */
  const handlePasskeyLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      console.log('Biometria: Iniciando fluxo...');

      // Desafio randômico conforme padrões WebAuthn
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const rpId = window.location.hostname;

      let credential = null;

      // PASSO 1: Tentar LOGAR (Assertion)
      try {
        console.log('Biometria: Buscando credenciais salvas (Assertion)...');
        credential = await navigator.credentials.get({
          publicKey: {
            challenge: challenge,
            rpId: rpId,
            userVerification: "preferred"
          }
        });
      } catch (getErr) {
        console.log('Biometria: Nenhuma credencial existente ou erro ao acessar. Partindo para criação!');
      }

      // PASSO 2: Caso não haja login prévio, CRIAR REGISTRO (Attestation)
      if (!credential) {
        console.log('Biometria: Exigindo registro de nova chave (Attestation)...');
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        credential = await navigator.credentials.create({
          publicKey: {
            challenge: challenge,
            rp: { name: "WalletNow App", id: rpId },
            user: { id: userId, name: "usuario@walletnow.app", displayName: "Usuário WalletNow" },
            pubKeyCredParams: [
              { type: "public-key", alg: -7 },
              { type: "public-key", alg: -257 }
            ],
            authenticatorSelection: {
              // Removido "authenticatorAttachment: 'platform'" intencionalmente.
              // Isso permite que o usuário use o celular (Cross-Device via QR Code) para liberar a Passkey
              // num PC Desk que não tenha biometria embutida (Windows Hello), evitando a tela travada de "Insira o USB".
              userVerification: "preferred"
            },
            timeout: 60000,
            attestation: "none"
          }
        });
      }

      if (!credential) {
        throw new Error('Falha ao acionar a janela de biometria. Verifique as configurações do SO.');
      }

      console.log('✅ Biometria confirmada pelo sistema nativo!', credential);

      // PASSO 3: Logar via Supabase
      console.log('Biometria: Assinando sessão anônima no Supabase...');
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) {
        console.error('Falha severa na chamada signInAnonymously:', error);
        throw new Error(`Erro Supabase: ${error.message} - Verifique se Anonymous Sign-in está Ativo!`);
      }

      console.log('✅ Sessão Autenticada:', data.user?.id);

      // OBS: Após esse sucesso, o banco de dados e AuthContext entram num estado de 'Logado' 
      // e o `useEffect` da linha 25 fará o router.navigate de modo seguro.

    } catch (err: any) {
      console.error('Fluxo completo falhou:', err);
      // Erro "NotAllowedError" ocorre se o usuário clicar no (X) do Modal de Biometria do Windows/Mac
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Operação de Biometria cancelada pelo usuário.');
      } else if (err.name === 'NotSupportedError') {
        setErrorMsg('Este navegador/dispositivo não suporta Passkeys.');
      } else {
        setErrorMsg('Falha de hardware/Passkey. Tente logar via Celular ou use o Google. Detalhes (F12).');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">

      <div className="flex flex-col items-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-20 h-20 bg-[#161616] rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-white/5">
          <Fingerprint className="w-10 h-10 text-[#00E676]" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          WALLET<span className="text-[#00E676]">NOW</span>
        </h1>
        <p className="text-gray-400 text-sm font-medium">A sua infraestrutura Web3 invisível.</p>
      </div>

      <div className="w-full bg-[#161616] rounded-[32px] p-8 border border-white/5 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150 fill-mode-both">

        {/* Caixa de Exibição de Erros Customizada */}
        {(errorMsg || authError) && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in duration-300">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-500">Erro de Acesso</p>
              <p className="text-xs text-red-400/80 mt-1">{errorMsg || authError}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handlePasskeyLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-[#00E676]/10 hover:bg-[#00E676]/20 text-[#00E676] py-4 px-6 rounded-2xl transition-all duration-300 font-semibold border border-[#00E676]/20 shadow-[0_0_20px_rgba(0,230,118,0.1)] hover:shadow-[0_0_30px_rgba(0,230,118,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
            {isLoading ? "Processando Biometria..." : "Entrar com Passkey"}
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink-0 mx-4 text-white/30 text-xs uppercase tracking-wider font-medium">ou</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white py-4 px-6 rounded-2xl transition-all duration-300 font-medium border border-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" /> : <Mail className="w-5 h-5 text-gray-400" />}
            Entrar com Google
          </button>
        </div>

        <p className="text-center text-xs text-gray-500 mt-8 leading-relaxed">
          Ao entrar, você concorda com nossos <br />
          <span className="text-gray-400 underline decoration-white/20 underline-offset-4 cursor-pointer">Termos de Serviço</span> e <span className="text-gray-400 underline decoration-white/20 underline-offset-4 cursor-pointer">Política de Privacidade</span>.
        </p>
      </div>
    </div>
  );
}
