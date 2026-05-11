import { CheckCircle2 } from 'lucide-react';
import type { LandingT } from '../../i18n/landingTranslations';

const statusMap = ['current', 'next', 'future'] as const;
const ecosystemBadges = ['Stellar', 'Supabase', 'Vite', 'React', 'WebAuthn', 'TypeScript'];

export default function RoadmapSection({ t }: { t: LandingT }) {
  const r = t.roadmap;
  return (
    <section id="roadmap" className="py-24 px-6 relative z-10 bg-[var(--bg-main)]" style={{ scrollMarginTop: 70 }}>
      <div className="absolute inset-0 border-y border-[var(--border-light)] pointer-events-none" />
      <div className="max-w-6xl mx-auto relative z-10">
        
        <div className="text-center mb-20 animate-fade-in-up">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase px-5 py-2 rounded-full glass-card text-[var(--text-secondary)]">
            {r.badge}
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-6 text-[var(--text-primary)]">{r.headline}</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-24 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {r.milestones.map((m, idx) => {
            const status = statusMap[idx];
            const isCurrent = status === 'current';
            const isFuture = status === 'future';
            
            return (
              <div key={m.version} className={`relative rounded-[32px] p-8 glass-card group premium-transition hover:-translate-y-2 hover:shadow-[var(--shadow-premium)] hover:bg-[var(--bg-surface-solid)] ${isCurrent ? 'border-[var(--color-wn-green)]/30 shadow-[0_12px_40px_-8px_rgba(0,255,153,0.1)]' : ''}`}>
                
                {isCurrent && <div className="absolute inset-0 bg-[var(--glow-primary)] blur-[60px] opacity-20 -z-10 rounded-full" />}

                <div className="flex items-center gap-4 mb-8">
                  <div className="relative flex items-center justify-center">
                    <div className={`w-3 h-3 rounded-full relative z-10 ${isCurrent ? 'bg-[var(--color-wn-green)]' : isFuture ? 'bg-[var(--border-subtle)]' : 'bg-[var(--text-primary)]'}`} />
                    {isCurrent && <div className="absolute inset-0 bg-[var(--color-wn-green)] blur-sm animate-pulse" />}
                  </div>
                  
                  <span className={`font-black text-xl ${isCurrent ? 'text-[var(--color-wn-green)]' : isFuture ? 'text-[var(--text-secondary)] opacity-60' : 'text-[var(--text-primary)]'}`}>{m.version}</span>
                  
                  {isCurrent && (
                    <span className="ml-auto text-[10px] uppercase tracking-wider px-3 py-1 rounded-full font-bold bg-[var(--color-wn-green)]/10 text-[var(--color-wn-green)] border border-[var(--color-wn-green)]/20">
                      {r.liveLabel}
                    </span>
                  )}
                </div>

                <ul className="space-y-4">
                  {m.items.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 premium-transition ${isCurrent ? 'text-[var(--color-wn-green)]' : isFuture ? 'text-[var(--border-subtle)]' : 'text-[var(--text-primary)] group-hover:text-[var(--color-wn-green-hover)]'}`} />
                      <span className={`text-sm font-medium leading-relaxed ${isFuture ? 'text-[var(--text-secondary)] opacity-60' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] premium-transition'}`}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="text-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-8 text-[var(--text-secondary)]">{r.ecosystemLabel}</p>
          <div className="flex flex-wrap justify-center gap-4">
            {ecosystemBadges.map((b) => (
              <span key={b} className="px-6 py-2.5 rounded-full text-sm font-semibold glass-card text-[var(--text-secondary)] premium-transition hover:bg-[var(--bg-surface-solid)] hover:text-[var(--text-primary)] cursor-default hover:-translate-y-1 hover:shadow-lg">
                {b}
              </span>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
