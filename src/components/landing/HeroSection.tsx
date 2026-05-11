import { ArrowRight, Zap, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LandingT } from '../../i18n/landingTranslations';

const statusItems = [
  { labelKey: 'Network', value: 'Stellar Testnet', dot: 'bg-green-400' },
  { labelKey: 'Status',  value: 'Online',          dot: 'bg-green-400' },
  { labelKey: 'Gas Fees',value: 'Sponsored',        dot: 'bg-blue-400'  },
  { labelKey: 'Settlement', value: '~3s',           dot: 'bg-green-400' },
  { labelKey: 'Passkeys', value: 'Enabled',         dot: 'bg-green-400' },
  { labelKey: 'Stablecoin Rail', value: 'Active',   dot: 'bg-green-400' },
];

export default function HeroSection({ t }: { t: LandingT }) {
  const navigate = useNavigate();
  const h = t.hero;

  return (
    <section className="relative flex flex-col justify-center px-6 overflow-hidden min-h-[calc(100vh-60px)] pt-20 pb-20">

      {/* Global Glow Backgrounds */}
      <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20" style={{
        background: 'radial-gradient(circle at 50% -20%, var(--glow-primary) 0%, transparent 60%)',
      }} />

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        
        {/* Left Column: Copy & CTAs */}
        <div className="flex-1 flex flex-col items-start text-left">
          
          {/* Badges */}
          <div className="flex flex-wrap gap-3 mb-8 animate-fade-in-up">
            {[h.badge1, h.badge2, h.badge3].map((b) => (
              <span key={b} className="px-4 py-1.5 rounded-full text-xs font-semibold glass-card text-[var(--text-secondary)] tracking-wider">
                {b}
              </span>
            ))}
          </div>

          {/* Headline */}
          <h1 className="font-black tracking-tighter mb-6 leading-[1.05] text-[clamp(2.5rem,6vw,5.5rem)] animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <span className="text-[var(--text-primary)]">{h.headline1}</span><br />
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-[var(--color-wn-green)] to-[var(--color-wn-green-hover)]">
              {h.headline2}
            </span>
          </h1>

          {/* Sub */}
          <p className="max-w-2xl mb-10 leading-relaxed font-medium text-[clamp(1.1rem,2vw,1.25rem)] text-[var(--text-secondary)] animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            {h.sub}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mb-14 w-full sm:w-auto animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <button onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-3 px-10 py-4 rounded-full font-bold text-lg bg-[var(--text-primary)] text-[var(--bg-main)] hover:translate-y-[-2px] transition-all duration-300 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.3)]">
              {h.ctaPrimary} <ArrowRight className="w-5 h-5" />
            </button>
            <a href="#architecture"
              onClick={e => { e.preventDefault(); document.getElementById('architecture')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-base glass-card text-[var(--text-primary)] hover:bg-[var(--bg-surface-solid)] premium-transition">
              {h.ctaSecondary}
            </a>
          </div>

          {/* Live Status Widget - Now on the left */}
          <div className="w-full max-w-xl rounded-3xl p-6 glass-card animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="relative flex items-center justify-center">
                <Wifi className="w-4 h-4 text-[var(--color-wn-green)] relative z-10" />
                <div className="absolute inset-0 bg-[var(--color-wn-green)] blur-md opacity-40 animate-glow-pulse" />
              </div>
              <span className="text-xs font-bold tracking-[0.15em] uppercase text-[var(--text-secondary)]">{h.statusTitle}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {statusItems.map((item) => (
                <div key={item.labelKey} className="flex flex-col gap-1.5 px-3 py-3 rounded-2xl glass-card-solid">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${item.dot} shadow-[0_0_8px_rgba(74,222,128,0.5)]`} />
                    <span className="text-[10px] font-semibold tracking-wider text-[var(--text-secondary)] uppercase">{item.labelKey}</span>
                  </div>
                  <span className="text-sm font-bold text-[var(--text-primary)] truncate pl-3.5">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: 3D Visual Elements */}
        <div className="flex-1 w-full relative hidden lg:flex justify-center items-center h-[600px] animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          
          {/* Central Glow Orb */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[var(--glow-primary)] blur-[100px] animate-glow-pulse pointer-events-none" />

          {/* 3D Orbiting System */}
          <div className="relative w-full h-full flex justify-center items-center">
            
            {/* Main Center Node (Stellar) */}
            <div className="absolute z-30 w-32 h-32 rounded-3xl glass-card-solid flex items-center justify-center animate-float-orb shadow-[0_20px_60px_-10px_rgba(0,0,0,0.2)]">
               <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[var(--color-wn-green)] to-transparent opacity-10" />
               <img src={`${import.meta.env.BASE_URL}stellar-logo.svg`} alt="Stellar" style={{ width: 42, height: 42, position: 'relative', zIndex: 10 }} />
            </div>

            {/* Orbiting Element 1 (Pix) */}
            <div className="absolute z-20 left-[10%] top-[25%] animate-float">
              <div className="w-24 h-24 rounded-2xl glass-card flex flex-col items-center justify-center gap-2">
                <img src={`${import.meta.env.BASE_URL}pix-icon.svg`} alt="Pix" style={{ width: 42, height: 42 }} />
                <span className="text-[10px] font-bold text-[var(--text-primary)]">PIX IN</span>
              </div>
            </div>

            {/* Orbiting Element 2 (USDC) */}
            <div className="absolute z-20 right-[10%] bottom-[25%] animate-float-delayed">
              <div className="w-24 h-24 rounded-2xl glass-card flex flex-col items-center justify-center gap-2">
                <img src={`${import.meta.env.BASE_URL}usdc-icon.svg`} alt="USDC" style={{ width: 42, height: 42 }} />
                <span className="text-[10px] font-bold text-[var(--text-primary)]">USDC OUT</span>
              </div>
            </div>

            {/* Decorative Connecting Lines (SVG) */}
            <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" style={{ filter: 'drop-shadow(0 0 8px var(--glow-primary))' }}>
              <path d="M 150 200 Q 250 300 350 300" fill="none" stroke="var(--border-subtle)" strokeWidth="2" strokeDasharray="6 6" className="animate-pulse" />
              <path d="M 450 300 Q 550 300 600 400" fill="none" stroke="var(--border-subtle)" strokeWidth="2" strokeDasharray="6 6" className="animate-pulse" style={{ animationDelay: '1s' }} />
            </svg>

          </div>
        </div>

      </div>
    </section>
  );
}
