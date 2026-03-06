import { Outlet } from 'react-router-dom';

/**
 * RootLayout (Layout Principal)
 * 
 * Este é o componente "pai" de toda a nossa aplicação. Ele define a estrutura básica
 * da página, como a cor de fundo e o tamanho máximo do conteúdo (para ficar bonito
 * tanto no celular quanto no computador).
 * 
 * O `<Outlet />` é onde o React Router vai "injetar" as outras páginas (Login, Dashboard, etc.)
 * dependendo da URL que o usuário acessar.
 */
export default function RootLayout() {
  return (
    // Container principal: Define a altura mínima como a tela toda (min-h-screen),
    // a cor de fundo escura (bg-[#0A0A0A]) e a cor do texto padrão (text-white).
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#00E676]/30 font-sans">
      
      {/* Container Mobile-First: 
          - max-w-md: Limita a largura máxima para parecer um aplicativo de celular mesmo no PC.
          - mx-auto: Centraliza o container na tela.
          - relative overflow-hidden: Evita que o conteúdo "vaze" para fora do container.
      */}
      <main className="max-w-md mx-auto min-h-screen relative overflow-hidden bg-[#0A0A0A] sm:border-x sm:border-white/5 shadow-2xl">
        
        {/* Aqui é onde as páginas filhas (Login, Dashboard, Settings) serão renderizadas */}
        <Outlet />
        
      </main>
    </div>
  );
}
