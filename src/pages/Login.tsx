import { Fingerprint, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Tela de Login (Onboarding)
 * 
 * Esta é a primeira tela que o usuário vê. O objetivo aqui é oferecer uma
 * experiência "UX Zero" (sem atritos). O usuário não precisa criar senhas complexas
 * ou guardar 24 palavras (seed phrase). Ele entra usando a biometria (Passkey) ou Google.
 */
export default function Login() {
  // O hook useNavigate nos permite navegar entre as páginas via código.
  const navigate = useNavigate();

  /**
   * Função para lidar com o clique no botão de login.
   * Por enquanto (no protótipo), ela apenas redireciona o usuário direto para o Dashboard.
   * No futuro, aqui chamaremos o Supabase Auth para validar a biometria ou o Google OAuth.
   */
  const handleLogin = () => {
    // Redireciona o usuário para a rota '/dashboard'
    navigate('/dashboard');
  };

  return (
    // Container da tela: Centraliza todo o conteúdo verticalmente e horizontalmente.
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      
      {/* Área da Logo e Título */}
      {/* Usamos classes 'animate-in' do Tailwind para criar uma animação suave de entrada */}
      <div className="flex flex-col items-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Ícone da Logo (Placeholder) */}
        <div className="w-20 h-20 bg-[#161616] rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-white/5">
          <Fingerprint className="w-10 h-10 text-[#00E676]" />
        </div>
        
        {/* Nome do App */}
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          WALLET<span className="text-[#00E676]">NOW</span>
        </h1>
        <p className="text-gray-400 text-sm font-medium">A sua infraestrutura Web3 invisível.</p>
      </div>

      {/* Card de Login (Onde ficam os botões) */}
      <div className="w-full bg-[#161616] rounded-[32px] p-8 border border-white/5 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150 fill-mode-both">
        <div className="space-y-4">
          
          {/* Botão Principal: Biometria (Passkey) */}
          {/* Este é o fluxo principal. O botão tem um brilho verde (glow) para chamar atenção. */}
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-[#00E676]/10 hover:bg-[#00E676]/20 text-[#00E676] py-4 px-6 rounded-2xl transition-all duration-300 font-semibold border border-[#00E676]/20 shadow-[0_0_20px_rgba(0,230,118,0.1)] hover:shadow-[0_0_30px_rgba(0,230,118,0.2)]"
          >
            <Fingerprint className="w-5 h-5" />
            Entrar com Passkey
          </button>

          {/* Divisor visual ("ou") */}
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink-0 mx-4 text-white/30 text-xs uppercase tracking-wider font-medium">ou</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          {/* Botão Secundário: Google OAuth */}
          {/* Uma alternativa caso o usuário não queira/possa usar biometria no momento. */}
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white py-4 px-6 rounded-2xl transition-all duration-300 font-medium border border-white/5"
          >
            <Mail className="w-5 h-5 text-gray-400" />
            Entrar com Google
          </button>
        </div>
        
        {/* Textos legais (Termos e Privacidade) */}
        <p className="text-center text-xs text-gray-500 mt-8 leading-relaxed">
          Ao entrar, você concorda com nossos <br/>
          <span className="text-gray-400 underline decoration-white/20 underline-offset-4 cursor-pointer">Termos de Serviço</span> e <span className="text-gray-400 underline decoration-white/20 underline-offset-4 cursor-pointer">Política de Privacidade</span>.
        </p>
      </div>
    </div>
  );
}
