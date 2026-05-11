import { useState, useEffect, useRef } from 'react';
import { Fingerprint, Wallet, QrCode, CheckCircle2, Coins } from 'lucide-react';
import type { LandingT } from '../../i18n/landingTranslations';

const icons = [Fingerprint, Wallet, QrCode, CheckCircle2, Coins];

export default function FlowSection({ t }: { t: LandingT }) {
  const [active, setActive] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const f = t.flow;

  useEffect(() => {
    intervalRef.current = window.setInterval(() => setActive((p) => (p + 1) % f.steps.length), 2200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [f.steps.length]);

  return (
    <section className="py-28 px-6 relative" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="absolute inset-0 border-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }} />
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full border mb-4 inline-block"
            style={{ color: '#00FF99', borderColor: 'rgba(0,255,153,0.2)', background: 'rgba(0,255,153,0.05)' }}>
            {f.badge}
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-4" style={{ color: '#F5F5F5' }}>{f.headline}</h2>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:gap-0 items-start md:items-stretch">
          {f.steps.map((step, i) => {
            const Icon = icons[i];
            const isActive = active === i;
            const isDone = i < active;
            return (
              <div key={step.label} className="flex-1 flex flex-col cursor-pointer"
                onClick={() => { setActive(i); if (intervalRef.current) clearInterval(intervalRef.current); }}>
                {i > 0 && (
                  <div className="hidden md:block h-px mt-10 -mx-px transition-all duration-500"
                    style={{ background: isDone ? '#00FF99' : 'rgba(255,255,255,0.08)' }} />
                )}
                <div className="rounded-2xl p-5 border mx-1 transition-all duration-500"
                  style={{
                    background: isActive ? 'rgba(0,255,153,0.07)' : 'rgba(255,255,255,0.02)',
                    borderColor: isActive ? 'rgba(0,255,153,0.3)' : 'rgba(255,255,255,0.06)',
                    boxShadow: isActive ? '0 10px 40px rgba(0,255,153,0.1)' : 'none',
                    transform: isActive ? 'translateY(-6px)' : 'none',
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: isActive ? 'rgba(0,255,153,0.15)' : 'rgba(255,255,255,0.04)' }}>
                    <Icon className="w-5 h-5" style={{ color: isActive ? '#00FF99' : '#8B8B8B' }} />
                  </div>
                  <div className="text-xs font-bold mb-2" style={{ color: '#8B8B8B' }}>{f.stepLabel} {i + 1}</div>
                  <div className="font-bold text-sm mb-1" style={{ color: isActive ? '#F5F5F5' : '#8B8B8B' }}>{step.label}</div>
                  {isActive && <p className="text-xs leading-relaxed" style={{ color: '#8B8B8B' }}>{step.desc}</p>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 h-px rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${((active + 1) / f.steps.length) * 100}%`, background: 'linear-gradient(90deg, #00FF99, #00D084)' }} />
        </div>
      </div>
    </section>
  );
}
