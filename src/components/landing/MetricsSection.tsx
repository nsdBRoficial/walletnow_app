import { useEffect, useRef, useState } from 'react';
import type { LandingT } from '../../i18n/landingTranslations';

const metricValues = [847, 1203, 52400, 3];
const metricSuffixes = ['+', '+', '+', 's'];

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const steps = 60;
        const inc = target / steps;
        let cur = 0;
        const id = setInterval(() => {
          cur += inc;
          if (cur >= target) { setCount(target); clearInterval(id); }
          else setCount(Math.floor(cur));
        }, 1800 / steps);
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

export default function MetricsSection({ t }: { t: LandingT }) {
  const m = t.metrics;
  return (
    <section className="py-24 px-6 relative z-10 bg-transparent">
      <div className="max-w-6xl mx-auto relative z-10">
        
        <div className="text-center mb-16 animate-fade-in-up">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase px-5 py-2 rounded-full glass-card text-[var(--text-secondary)]">
            {m.badge}
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-6 text-[var(--text-primary)]">{m.headline}</h2>
          <p className="text-base mt-4 max-w-xl mx-auto text-[var(--text-secondary)]">{m.sub}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {m.items.map((item, idx) => (
            <div key={item.label} className="group rounded-[32px] p-8 glass-card text-center premium-transition hover:bg-[var(--bg-surface-solid)] hover:-translate-y-2 hover:shadow-[var(--shadow-premium)]">
              <div className="text-4xl md:text-5xl font-black mb-3 premium-transition" style={{ color: idx % 2 === 0 ? 'var(--color-wn-green)' : 'var(--text-primary)' }}>
                <CountUp target={metricValues[idx]} suffix={metricSuffixes[idx]} />
              </div>
              <div className="text-sm font-semibold tracking-wider uppercase text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] premium-transition">
                {item.label}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
