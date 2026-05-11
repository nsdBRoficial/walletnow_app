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
    <section className="py-20 px-6 relative" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="absolute inset-0 border-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }} />
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full border mb-4 inline-block"
            style={{ color: '#00FF99', borderColor: 'rgba(0,255,153,0.2)', background: 'rgba(0,255,153,0.05)' }}>
            {m.badge}
          </span>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mt-4" style={{ color: '#F5F5F5' }}>{m.headline}</h2>
          <p className="text-sm mt-2" style={{ color: '#8B8B8B' }}>{m.sub}</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {m.items.map((item, idx) => (
            <div key={item.label} className="rounded-2xl p-6 border text-center"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="text-3xl md:text-4xl font-black mb-2" style={{ color: idx % 2 === 0 ? '#00FF99' : '#00D084' }}>
                <CountUp target={metricValues[idx]} suffix={metricSuffixes[idx]} />
              </div>
              <div className="text-xs font-medium" style={{ color: '#8B8B8B' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
