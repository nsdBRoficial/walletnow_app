import { ShieldCheck, Key, Lock, Fingerprint, Zap, Eye } from 'lucide-react';
import type { LandingT } from '../../i18n/landingTranslations';

const icons = [ShieldCheck, Fingerprint, Eye, Lock, Zap, Key];

export default function SecuritySection({ t }: { t: LandingT }) {
  const s = t.security;
  return (
    <section id="security" className="py-24 px-6 relative overflow-hidden z-10 bg-[var(--bg-main)]" style={{ scrollMarginTop: 70 }}>
      
      {/* Background Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full pointer-events-none opacity-30 dark:opacity-10"
        style={{ background: 'radial-gradient(circle, var(--glow-primary), transparent 60%)', filter: 'blur(80px)' }} />
      
      <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center">
        
        <div className="text-center mb-16 animate-fade-in-up">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase px-5 py-2 rounded-full glass-card text-[var(--text-secondary)]">
            {s.badge}
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-6 text-[var(--text-primary)]">{s.headline}</h2>
          <p className="mt-4 max-w-xl mx-auto text-base text-[var(--text-secondary)]">{s.sub}</p>
        </div>

        {/* 3D Vault Visual */}
        <div className="relative mb-24 flex justify-center items-center w-full max-w-2xl h-[300px] animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          
          {/* Orbital Rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-[var(--border-subtle)] animate-[spin_20s_linear_infinite]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-[var(--border-light)] animate-[spin_30s_linear_infinite_reverse]" />
          
          {/* Central Vault */}
          <div className="relative z-10 w-40 h-40 rounded-full flex items-center justify-center glass-card-solid shadow-[var(--shadow-premium)] animate-float">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--color-wn-green)] to-transparent opacity-10" />
            <Lock className="w-16 h-16 text-[var(--color-wn-green)] relative z-10" style={{ filter: 'drop-shadow(0 0 16px rgba(0,255,153,0.3))' }} />
          </div>

          {/* Floating Particles/Keys */}
          <div className="absolute top-1/4 left-1/4 animate-float-orb">
            <div className="w-10 h-10 rounded-full glass-card flex items-center justify-center"><Key className="w-4 h-4 text-[var(--text-secondary)]" /></div>
          </div>
          <div className="absolute bottom-1/4 right-1/4 animate-float-delayed">
            <div className="w-12 h-12 rounded-full glass-card flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-[var(--text-secondary)]" /></div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          {s.items.map((item, idx) => {
            const Icon = icons[idx];
            return (
              <div key={item.title} className="group rounded-[24px] p-6 glass-card flex gap-5 premium-transition hover:bg-[var(--bg-surface-solid)] hover:-translate-y-2 hover:shadow-[var(--shadow-premium)]">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-[var(--border-light)] group-hover:bg-[var(--glow-primary)] premium-transition">
                  <Icon className="w-6 h-6 text-[var(--text-secondary)] group-hover:text-[var(--color-wn-green)] premium-transition" />
                </div>
                <div>
                  <div className="font-bold text-base mb-1 text-[var(--text-primary)]">{item.title}</div>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
