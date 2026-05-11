import { useState, useEffect, useRef } from 'react';
import { Fingerprint, Wallet, QrCode, CheckCircle2, Coins } from 'lucide-react';
import type { LandingT } from '../../i18n/landingTranslations';

const icons = [Fingerprint, Wallet, QrCode, CheckCircle2, Coins];

export default function FlowSection({ t }: { t: LandingT }) {
  const [active, setActive] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const f = t.flow;

  useEffect(() => {
    intervalRef.current = window.setInterval(() => setActive((p) => (p + 1) % f.steps.length), 2800);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [f.steps.length]);

  return (
    <section className="py-24 px-6 relative z-10 bg-[var(--bg-main)]">
      <div className="absolute inset-0 border-y border-[var(--border-light)] pointer-events-none" />
      <div className="max-w-6xl mx-auto relative z-10">
        
        <div className="text-center mb-20 animate-fade-in-up">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase px-5 py-2 rounded-full glass-card text-[var(--text-secondary)]">
            {f.badge}
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-6 text-[var(--text-primary)]">{f.headline}</h2>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-0 items-start md:items-stretch animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {f.steps.map((step, i) => {
            const Icon = icons[i];
            const isActive = active === i;
            const isDone = i <= active;
            return (
              <div key={step.label} className="flex-1 flex flex-col cursor-pointer group"
                onClick={() => { setActive(i); if (intervalRef.current) clearInterval(intervalRef.current); }}>
                
                {/* Connecting Line (Desktop) */}
                {i > 0 && (
                  <div className="hidden md:block h-[2px] mt-10 -mx-1 premium-transition relative z-0"
                    style={{ background: isDone ? 'var(--color-wn-green)' : 'var(--border-subtle)' }}>
                     {isActive && <div className="absolute inset-0 bg-[var(--glow-primary)] blur-sm" />}
                  </div>
                )}
                
                {/* Step Card */}
                <div className={`rounded-[24px] p-6 mx-2 premium-transition relative z-10 ${isActive ? 'glass-card-solid scale-105' : 'glass-card opacity-70 hover:opacity-100'}`}
                  style={{
                    borderColor: isActive ? 'var(--color-wn-green)' : 'var(--border-subtle)',
                    boxShadow: isActive ? '0 20px 40px -10px rgba(0,255,153,0.15)' : 'none',
                  }}>
                  
                  {isActive && <div className="absolute inset-0 bg-[var(--glow-primary)] blur-2xl -z-10 rounded-full opacity-50" />}

                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 premium-transition ${isActive ? 'bg-[var(--glow-primary)]' : 'bg-[var(--border-light)]'}`}>
                    <Icon className={`w-6 h-6 premium-transition ${isActive ? 'text-[var(--color-wn-green)] drop-shadow-[0_0_8px_rgba(0,255,153,0.8)]' : 'text-[var(--text-secondary)]'}`} />
                  </div>
                  
                  <div className="text-[10px] font-bold mb-2 tracking-widest uppercase text-[var(--text-secondary)]">{f.stepLabel} {i + 1}</div>
                  <div className={`font-bold text-base mb-2 premium-transition ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{step.label}</div>
                  
                  <div className={`overflow-hidden premium-transition ${isActive ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{step.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Progress Bar */}
        <div className="mt-16 h-1 rounded-full overflow-hidden bg-[var(--border-light)] relative">
          <div className="h-full rounded-full premium-transition bg-gradient-to-r from-[var(--color-wn-green)] to-[var(--color-wn-green-hover)]"
            style={{ width: `${((active + 1) / f.steps.length) * 100}%` }} />
          <div className="absolute top-0 left-0 h-full rounded-full blur-sm bg-[var(--color-wn-green)] opacity-50 premium-transition"
            style={{ width: `${((active + 1) / f.steps.length) * 100}%` }} />
        </div>

      </div>
    </section>
  );
}
