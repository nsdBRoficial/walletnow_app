import { ArrowRight, ShieldCheck, Zap, Lock, ScanLine, Wallet, Fingerprint, HelpCircle, Key } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const translations = {
  en: {
    heroSub: "self-custody fiat ramp abstraction.",
    heroDesc: "The invisible crypto infrastructure. No seed phrases, no network fees. Log in with your Biometrics, deposit with real-time local fiat, and receive your digital assets directly in your self-custody wallet.",
    launchBtn: "Launch MVP (Testnet)",
    matrixTitle: "The Friction Matrix",
    matrixSub: "Leaving Web3 barriers in the past for instant mass onboarding.",
    highFriction: "High Friction (Market Standard)",
    high1: "User forced to write down and manage 12/24 seed phrases.",
    high2: "Need to buy native network tokens to pay for Gas Fees before transacting.",
    high3: "Confusing and slow fiat bridge process through centralized exchanges (CEX).",
    high4: "Risk of irrevocable fund loss due to phishing attacks.",
    lowFriction: "Low Friction (WalletNow)",
    low1: "Native 'Web2' onboarding: 3-click account creation using only the device's Magic Fingerprint (Passkeys).",
    low2: "Native GasLess: Fees abstracted via Sponsored Reserves. The user doesn't need to hold the base network coin (XLM/ETH).",
    low3: "Express Fiat Ramp: Pay with local fiat (PIX/ARS), and receive corresponding Stablecoins in your wallet in under 10s.",
    low4: "100% decentralized custody (The user always controls the keys via secure co-processor).",
    checkTitle: "MVP 0.8 Milestones Achieved",
    checkSub: "Key deliverables from the Scope of Work promised and executed in under 30 days.",
    check1Title: "GasLess Processing",
    check1Desc: "Our 'Master Wallet' triggers Sponsorship Operations (`beginSponsoringFutureReserves`), covering the base and transaction fees invisibly through the Stellar architecture.",
    check2Title: "ZK-Stark Identity Layer (KYC)",
    check2Desc: "Implementation of Zero-Knowledge Identity via Gemini AI + SHA-3 256 integration. We validate identity data without exposing or saving PII metadata in the database.",
    check3Title: "PIX/ARS Integration (Transfero) On-Chain",
    check3Desc: "Synchronization with Sandbox B2B APIs. Convert fiat funds (BRL/ARS) into tokenized Stablecoins without hassle in seconds.",
    // New Security
    securityTitle: "Absolute Security & Full Abstraction",
    securityDesc: "WalletNow never has access to your private keys. Your wallet is 100% decentralized and secured by your device's cryptographic co-processor (Passkeys).",
    sec1Title: "No Seed Phrases",
    sec1Desc: "Forget the 12/24 words. Recover your account simply and securely using your biometric identity.",
    sec2Title: "Gasless Transactions",
    sec2Desc: "Full abstraction. You don't need to hold XLM or ETH to pay for transaction fees. We sponsor them.",
    // New FAQ
    faqTitle: "Frequently Asked Questions",
    faq1Q: "Do I need an exchange account (Binance, Coinbase)?",
    faq1A: "Absolutely not. WalletNow is a direct bridge. You deposit fiat via your local bank and the tokens go straight to your self-custody wallet.",
    faq2Q: "How long does a deposit take?",
    faq2A: "Under 10 seconds. Once your local transfer (PIX/ARS) clears, the smart contract mints the tokens instantly.",
    faq3Q: "If I lose my phone, do I lose my funds?",
    faq3A: "No. Because your Passkey is tied to your Cloud/Google/Apple Auth and verified via ZK-Stark KYC, you can securely recover your wallet on a new device.",
    finalCtaTitle: "Ready to test real Web3 abstraction?"
  },
  pt: {
    heroSub: "abstração fiduciária autocustodial.",
    heroDesc: "A infraestrutura cripto invisível. Sem seed phrases, sem taxas de rede. Faça logon com sua Biometria, deposite com PIX em tempo real e receba seus ativos digitais direto na sua carteira.",
    launchBtn: "Lançar MVP (Testnet)",
    matrixTitle: "A Matriz de Atrito",
    matrixSub: "Deixando as barreiras da Web3 no passado para onboarding instantâneo das massas.",
    highFriction: "Alto Atrito (Padrão de Mercado)",
    high1: "Usuário forçado a anotar e gerenciar 12/24 palavras-semente (Seed Phrases).",
    high2: "Necessidade de comprar tokens nativos da rede (Gas Fees) antes de transacionar.",
    high3: "Processo de ponte fiduciária (Bridge) confuso e lento através de Corretoras (CEX).",
    high4: "Risco de perda irrevogável de fundos por ataque Pishing.",
    lowFriction: "Baixo Atrito (WalletNow)",
    low1: "Onboarding 'Web2' nativo: Criação de conta em 3 cliques apenas com a Digital Mágica (Passkeys).",
    low2: "GasLess Nativo: Taxas abstraídas via Reservas Patrocinadas. O usuário não precisa ter a moeda raiz (XLM/ETH).",
    low3: "Rampa Fiduciária Expressa: Pague via transferência local, e em menos de 10s receba as Stablecoins direto na carteira.",
    low4: "Custódia 100% descentralizada (O usuário sempre controla a chave via co-processador seguro).",
    checkTitle: "Milestones Alcançados MVP 0.8",
    checkSub: "Entregáveis chave do Scope of Work prometidos e executados em menos de 30 dias.",
    check1Title: "Processamento GasLess",
    check1Desc: "Nossa 'Master Wallet' engatilha Operações de Patrocínio (`beginSponsoringFutureReserves`), custeando as taxas invisivelmente pela arquitetura Stellar.",
    check2Title: "Camada de Identidade ZK-Stark (KYC)",
    check2Desc: "Implementação de Zero-Knowledge Identity via integração Gemini AI + SHA-3 256. Validamos dados de identidade sem expor ou salvar os metadados do PII no banco.",
    check3Title: "Integração BRL/ARS (Transfero) On-Chain",
    check3Desc: "Sincronização com as APIs do Sandbox B2B. Converter fundos fiduciários (Reais/Pesos) em Stablecoins tokenizados sem complicação em segundos.",
    // New Security
    securityTitle: "Segurança Absoluta e Abstração Total",
    securityDesc: "A WalletNow nunca tem acesso às suas chaves privadas. O controle é 100% descentralizado e assegurado pelo co-processador criptográfico do seu aparelho (Passkeys).",
    sec1Title: "Sem Seed Phrases",
    sec1Desc: "Esqueça as 12/24 palavras. Recupere sua conta de forma simples e segura utilizando sua identidade biométrica.",
    sec2Title: "Transações GasLess",
    sec2Desc: "Abstração total. Você não precisa ter XLM ou ETH para pagar as taxas de rede. Nós patrocinamos elas para você.",
    // New FAQ
    faqTitle: "Perguntas Frequentes",
    faq1Q: "Preciso de conta em corretora (Binance, Mercado Bitcoin)?",
    faq1A: "Não. A WalletNow é uma ponte direta. Você faz a transferência do seu banco e os tokens caem direto na sua carteira descentralizada.",
    faq2Q: "Quanto tempo leva o depósito?",
    faq2A: "Menos de 10 segundos. Assim que o valor é compensado, o contrato inteligente emite os tokens imediatamente.",
    faq3Q: "Se eu perder o celular, perco meus fundos?",
    faq3A: "Não. Como sua Passkey está atrelada à sua Nuvem (Google/Apple) e validada pelo KYC ZK-Stark, você consegue recuperar a carteira com segurança num aparelho novo.",
    finalCtaTitle: "Pronto para testar a abstração Web3 real?"
  },
  es: {
    heroSub: "abstracción fiduciaria de autocustodia.",
    heroDesc: "La infraestructura cripto invisible. Sin frases semilla, sin tarifas de red. Inicia sesión con tu Biometría, deposita con moneda local en tiempo real y recibe tus activos digitales en tu billetera de autocustodia.",
    launchBtn: "Lanzar MVP (Testnet)",
    matrixTitle: "La Matriz de Fricción",
    matrixSub: "Dejando las barreras de Web3 en el pasado para onboarding instantáneo de las masas.",
    highFriction: "Alta Fricción (Estándar del Mercado)",
    high1: "Usuario forzado a anotar y gestionar 12/24 palabras semilla.",
    high2: "Necesidad de comprar el token nativo de la red para pagar Tarifas de Gas antes de transaccionar.",
    high3: "Proceso de puente fiduciario confuso y lento a través de Exchanges Centralizados (CEX).",
    high4: "Riesgo de pérdida irrevocable de fondos por ataques de Phishing.",
    lowFriction: "Baja Fricción (WalletNow)",
    low1: "Onboarding 'Web2' nativo: Creación de cuenta en 3 clics usando solo la Biometría Mágica (Passkeys).",
    low2: "GasLess Nativo: Tarifas abstraídas (Reservas Patrocinadas). El usuario no necesita tener la moneda base (XLM/ETH).",
    low3: "Rampa Fiduciaria Exprés: Paga con moneda local (PIX/ARS), y recibe las Stablecoins directo en tu billetera en 10s.",
    low4: "Custodia 100% descentralizada (El usuario siempre controla la llave vía coprocesador seguro).",
    checkTitle: "Hitos Alcanzados MVP 0.8",
    checkSub: "Entregables clave del Scope of Work prometidos y ejecutados en menos de 30 días.",
    check1Title: "Procesamiento GasLess",
    check1Desc: "Nuestra 'Master Wallet' activa Operaciones de Patrocinio (`beginSponsoringFutureReserves`), cubriendo invisíblemente las tarifas en la arquitectura Stellar.",
    check2Title: "Capa de Identidad ZK-Stark (KYC)",
    check2Desc: "Implementación de Zero-Knowledge Identity vía Gemini AI + SHA-3 256. Validamos datos de identidad sin exponer ni guardar la PII en la base de datos.",
    check3Title: "Integración ARS/BRL (Transfero) On-Chain",
    check3Desc: "Sincronización con APIs de Sandbox B2B. Convierte fondos fiduciarios en Stablecoins tokenizadas (ARZ/BRZ) sin complicaciones en segundos.",
    // New Security
    securityTitle: "Seguridad Absoluta y Abstracción Total",
    securityDesc: "WalletNow nunca tiene acceso a tus llaves privadas. El control es 100% descentralizado y asegurado por el coprocesador criptográfico de tu dispositivo (Passkeys).",
    sec1Title: "Sin Frases Semilla",
    sec1Desc: "Olvídate de las 12/24 palabras. Recupera tu cuenta de forma simple y segura usando tu identidad biométrica.",
    sec2Title: "Transacciones GasLess",
    sec2Desc: "Abstracción total. No necesitas tener XLM o ETH para pagar las tarifas de red. Nosotros las patrocinamos.",
    // New FAQ
    faqTitle: "Preguntas Frecuentes",
    faq1Q: "¿Necesito una cuenta en un Exchange (Binance, Lemon)?",
    faq1A: "No. WalletNow es un puente directo. Depositas fiat vía tu banco local y los tokens van directo a tu billetera descentralizada.",
    faq2Q: "¿Cuánto tarda un depósito?",
    faq2A: "Menos de 10 segundos. Una vez que tu transferencia (PIX/ARS) se acredita, el contrato inteligente emite los tokens al instante.",
    faq3Q: "¿Si pierdo mi teléfono, pierdo mis fondos?",
    faq3A: "No. Como tu Passkey está vinculada a tu Nube (Google/Apple) y validada por KYC ZK-Stark, puedes recuperar tu billetera de forma segura en un nuevo dispositivo.",
    finalCtaTitle: "¿Listo para probar la abstracción Web3 real?"
  }
};

type LangKey = 'en' | 'pt' | 'es';

export default function Landing() {
  const navigate = useNavigate();
  // English as Default as requested
  const [lang, setLang] = useState<LangKey>('en');

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#00E676]/30 overflow-x-hidden relative">
      
      {/* Header / Language Switcher */}
      <div className="absolute top-0 right-0 w-full p-6 flex justify-end gap-3 z-50 animate-in fade-in duration-500">
        <button 
          onClick={() => setLang('en')} 
          className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-all border ${lang === 'en' ? 'bg-[#00E676]/10 border-[#00E676]/50 text-[#00E676]' : 'border-transparent text-gray-500 hover:text-white'}`}
        >
          EN
        </button>
        <button 
          onClick={() => setLang('pt')} 
          className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-all border ${lang === 'pt' ? 'bg-[#00E676]/10 border-[#00E676]/50 text-[#00E676]' : 'border-transparent text-gray-500 hover:text-white'}`}
        >
          PT
        </button>
        <button 
          onClick={() => setLang('es')} 
          className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-all border ${lang === 'es' ? 'bg-[#00E676]/10 border-[#00E676]/50 text-[#00E676]' : 'border-transparent text-gray-500 hover:text-white'}`}
        >
          ES
        </button>
      </div>

      {/* 1. Hero Section (O Impacto Imediato) */}
      <section className="relative pt-24 pb-32 lg:pt-36 lg:pb-40 px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center relative z-10">
          
          {/* Logo Abstrata Transparente (Ícone + Texto) inves da imagem */}
          <div className="flex items-center gap-4 mb-10 animate-in fade-in zoom-in duration-700">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-[#00E676] to-cyan-400 rounded-2xl flex items-center justify-center -rotate-6 shadow-[0_0_40px_rgba(0,230,118,0.5)]">
              <Wallet className="w-8 h-8 md:w-10 md:h-10 text-black rotate-6" />
            </div>
            <span className="text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              WalletNow
            </span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 animate-in slide-in-from-bottom-8 duration-700 delay-100 leading-tight">
            WalletNow - Your Web3 <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E676] to-emerald-400 drop-shadow-[0_0_20px_rgba(0,230,118,0.3)]">
              {t.heroSub}
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-14 animate-in slide-in-from-bottom-8 duration-700 delay-200">
            {t.heroDesc}
          </p>
          
          {/* Botão Gigante (Unico CTA conforme pedido) */}
          <div className="w-full sm:w-auto animate-in slide-in-from-bottom-8 duration-700 delay-300">
            <button 
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto flex items-center justify-center gap-4 bg-[#00E676] hover:bg-[#00E676]/90 text-black px-12 py-6 rounded-3xl font-black text-2xl transition-all shadow-[0_0_50px_rgba(0,230,118,0.5)] hover:shadow-[0_0_80px_rgba(0,230,118,0.7)] transform hover:-translate-y-2 scale-100 hover:scale-[1.02]"
            >
              {t.launchBtn}
              <ArrowRight className="w-8 h-8" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. A Matriz de Atrito (A Prova de Valor) */}
      <section className="py-24 bg-[#050505] border-y border-white/5 relative overflow-hidden">
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{t.matrixTitle}</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">{t.matrixSub}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Alto Atrito */}
            <div className="bg-red-950/10 border border-red-900/30 rounded-3xl p-8 lg:p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl group-hover:bg-red-500/10 transition-all"></div>
              <h3 className="text-xl font-bold text-red-500 mb-8 flex items-center gap-3">
                <Lock className="w-6 h-6" />
                {t.highFriction}
              </h3>
              <ul className="space-y-6">
                <li className="flex items-start gap-4 text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-red-500/50 mt-2 shrink-0"></div>
                  <p className="leading-relaxed">{t.high1}</p>
                </li>
                <li className="flex items-start gap-4 text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-red-500/50 mt-2 shrink-0"></div>
                  <p className="leading-relaxed">{t.high2}</p>
                </li>
                <li className="flex items-start gap-4 text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-red-500/50 mt-2 shrink-0"></div>
                  <p className="leading-relaxed">{t.high3}</p>
                </li>
                <li className="flex items-start gap-4 text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-red-500/50 mt-2 shrink-0"></div>
                  <p className="leading-relaxed">{t.high4}</p>
                </li>
              </ul>
            </div>

            {/* Baixo Atrito */}
            <div className="bg-[#00E676]/5 border border-[#00E676]/30 rounded-3xl p-8 lg:p-10 relative overflow-hidden group transform md:-translate-y-4 shadow-[0_30px_60px_rgba(0,230,118,0.08)]">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#00E676]/10 rounded-full blur-3xl group-hover:bg-[#00E676]/20 transition-all"></div>
              <h3 className="text-2xl font-black text-[#00E676] mb-8 flex items-center gap-3">
                <ShieldCheck className="w-8 h-8" />
                {t.lowFriction}
              </h3>
              <ul className="space-y-6">
                <li className="flex items-start gap-4 text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-[#00E676] mt-2 shrink-0 shadow-[0_0_10px_#00E676]"></div>
                  <p className="leading-relaxed">{t.low1}</p>
                </li>
                <li className="flex items-start gap-4 text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-[#00E676] mt-2 shrink-0 shadow-[0_0_10px_#00E676]"></div>
                  <p className="leading-relaxed">{t.low2}</p>
                </li>
                <li className="flex items-start gap-4 text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-[#00E676] mt-2 shrink-0 shadow-[0_0_10px_#00E676]"></div>
                  <p className="leading-relaxed">{t.low3}</p>
                </li>
                <li className="flex items-start gap-4 text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-[#00E676] mt-2 shrink-0 shadow-[0_0_10px_#00E676]"></div>
                  <p className="leading-relaxed">{t.low4}</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. O Check-list do SOW */}
      <section className="py-24 px-6 relative bg-black">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{t.checkTitle}</h2>
            <p className="text-gray-400">{t.checkSub}</p>
          </div>

          <div className="space-y-6">
            <div className="bg-[#111] border border-white/5 p-6 md:p-8 rounded-3xl flex items-center gap-6 md:gap-8 hover:border-[#00E676]/30 hover:bg-[#161616] transition-all">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Zap className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white mb-2">{t.check1Title}</h4>
                <p className="text-sm md:text-base text-gray-400 leading-relaxed max-w-2xl">{t.check1Desc}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-[#00E676] ml-auto shrink-0 hidden sm:block drop-shadow-[0_0_10px_rgba(0,230,118,0.5)]" />
            </div>

            <div className="bg-[#111] border border-white/5 p-6 md:p-8 rounded-3xl flex items-center gap-6 md:gap-8 hover:border-[#00E676]/30 hover:bg-[#161616] transition-all">
              <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                <ScanLine className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white mb-2">{t.check2Title}</h4>
                <p className="text-sm md:text-base text-gray-400 leading-relaxed max-w-2xl">{t.check2Desc}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-[#00E676] ml-auto shrink-0 hidden sm:block drop-shadow-[0_0_10px_rgba(0,230,118,0.5)]" />
            </div>

            <div className="bg-[#111] border border-white/5 p-6 md:p-8 rounded-3xl flex items-center gap-6 md:gap-8 hover:border-[#00E676]/30 hover:bg-[#161616] transition-all">
              <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                <Wallet className="w-8 h-8 text-yellow-400" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white mb-2">{t.check3Title}</h4>
                <p className="text-sm md:text-base text-gray-400 leading-relaxed max-w-2xl">{t.check3Desc}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-[#00E676] ml-auto shrink-0 hidden sm:block drop-shadow-[0_0_10px_rgba(0,230,118,0.5)]" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Segurança e Abstração (Security & Abstraction) */}
      <section className="py-24 px-6 relative bg-[#050505] border-y border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#00E676]/5 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <ShieldCheck className="w-16 h-16 text-[#00E676] mx-auto mb-6 drop-shadow-[0_0_20px_rgba(0,230,118,0.4)]" />
          <h2 className="text-3xl font-bold mb-4">{t.securityTitle}</h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-16">{t.securityDesc}</p>
          
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <div className="bg-[#111] border border-white/5 p-8 rounded-3xl group hover:border-[#00E676]/30 transition-all">
              <Key className="w-10 h-10 text-cyan-400 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-3 text-white">{t.sec1Title}</h3>
              <p className="text-gray-400 leading-relaxed">{t.sec1Desc}</p>
            </div>
            <div className="bg-[#111] border border-white/5 p-8 rounded-3xl group hover:border-[#00E676]/30 transition-all">
              <Zap className="w-10 h-10 text-[#00E676] mb-6 group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(0,230,118,0.3)]" />
              <h3 className="text-xl font-bold mb-3 text-white">{t.sec2Title}</h3>
              <p className="text-gray-400 leading-relaxed">{t.sec2Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQ de Objeções (Frequently Asked Questions) */}
      <section className="py-24 px-6 bg-black relative">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-10">
            <HelpCircle className="w-8 h-8 text-gray-500" />
            <h2 className="text-3xl font-bold">{t.faqTitle}</h2>
          </div>
          
          <div className="space-y-4">
            {/* QA 1 */}
            <div className="bg-[#161616] rounded-2xl p-6 border border-white/5">
              <h4 className="font-bold text-lg mb-2 text-[#00E676]">{t.faq1Q}</h4>
              <p className="text-gray-400 leading-relaxed">{t.faq1A}</p>
            </div>
            {/* QA 2 */}
            <div className="bg-[#161616] rounded-2xl p-6 border border-white/5">
              <h4 className="font-bold text-lg mb-2 text-[#00E676]">{t.faq2Q}</h4>
              <p className="text-gray-400 leading-relaxed">{t.faq2A}</p>
            </div>
            {/* QA 3 */}
            <div className="bg-[#161616] rounded-2xl p-6 border border-white/5">
              <h4 className="font-bold text-lg mb-2 text-[#00E676]">{t.faq3Q}</h4>
              <p className="text-gray-400 leading-relaxed">{t.faq3A}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Extra: Final CTA */}
      <section className="py-20 px-6 bg-[#00E676]/5 text-center border-t border-[#00E676]/10">
        <h2 className="text-2xl font-bold mb-8 text-white">{t.finalCtaTitle}</h2>
        <button 
          onClick={() => navigate('/login')}
          className="bg-[#00E676] hover:bg-[#00E676]/90 text-black px-10 py-4 rounded-full font-bold text-xl inline-flex items-center gap-3 transition-transform hover:scale-105 shadow-[0_0_30px_rgba(0,230,118,0.3)]"
        >
          {t.launchBtn} <ArrowRight className="w-6 h-6" />
        </button>
      </section>

    </div>
  );
}

// Ícone Local (lucide-react não tem 'CheckCircle', apenas 'CheckCircle2')
function CheckCircle({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" viewBox="0 0 24 24" fill="none" 
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}
