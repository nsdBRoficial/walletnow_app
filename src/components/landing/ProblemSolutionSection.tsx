import { X, Check } from 'lucide-react';
import type { LandingT } from '../../i18n/landingTranslations';

export default function ProblemSolutionSection({ t }: { t: LandingT }) {
  const p = t.problem;
  return (
    <section className="py-24 px-6 relative z-10">
      <div className="max-w-6xl mx-auto">
        
        <div className="text-center mb-20 animate-fade-in-up">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase px-5 py-2 rounded-full glass-card text-[var(--text-secondary)]">
            {p.badge}
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-6 text-[var(--text-primary)]">
            {p.headline}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          
          {/* Problems */}
          <div className="rounded-[32px] p-10 border border-red-500/10 bg-red-500/5 backdrop-blur-xl relative overflow-hidden group premium-transition hover:border-red-500/20">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-red-500/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-red-500/10 premium-transition" />
            
            <div className="flex items-center gap-4 mb-10 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <X className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-bold text-red-500 text-sm tracking-[0.2em] uppercase">{p.highTitle}</h3>
            </div>
            
            <ul className="space-y-6 relative z-10">
              {p.problems.map((item) => (
                <li key={item.title} className="flex items-start gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500/50 mt-2.5 shrink-0" />
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-base text-[var(--text-primary)]">{item.title}</span>
                    <span className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div className="rounded-[32px] p-10 glass-card md:-translate-y-6 relative overflow-hidden group premium-transition hover:translate-y-[-32px] shadow-[var(--shadow-premium)] hover:shadow-[0_20px_60px_-10px_rgba(0,196,106,0.1)] hover:border-[var(--color-wn-green)]/30">
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[var(--glow-primary)] rounded-full blur-[80px] pointer-events-none group-hover:opacity-100 opacity-50 premium-transition" />
            
            <div className="flex items-center gap-4 mb-10 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-wn-green)]/10 flex items-center justify-center border border-[var(--color-wn-green)]/20">
                <Check className="w-6 h-6 text-[var(--color-wn-green)]" />
              </div>
              <h3 className="font-bold text-[var(--color-wn-green)] text-sm tracking-[0.2em] uppercase">{p.lowTitle}</h3>
            </div>

            <ul className="space-y-6 relative z-10">
              {p.solutions.map((item) => (
                <li key={item.title} className="flex items-start gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-wn-green)] mt-2.5 shrink-0 shadow-[0_0_8px_var(--color-wn-green)]" />
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-base text-[var(--text-primary)]">{item.title}</span>
                    <span className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
}
