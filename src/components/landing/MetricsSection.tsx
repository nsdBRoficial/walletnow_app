import { useEffect, useRef, useState } from 'react';

const metrics = [
  { label: 'Wallets Created', value: 847, suffix: '+', color: '#00FF99' },
  { label: 'Pix Requests', value: 1203, suffix: '+', color: '#00D084' },
  { label: 'Stablecoins Minted', value: 52400, suffix: '+', color: '#00FF99' },
  { label: 'Avg Settlement', value: 3, suffix: 's', color: '#00D084' },
];

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const duration = 1800;
        const steps = 60;
        const increment = target / steps;
        let current = 0;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) { setCount(target); clearInterval(timer); }
          else setCount(Math.floor(current));
        }, duration / steps);
      }
    }, { threshold: 0.3 });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export default function MetricsSection() {
  return (
    <section className="py-20 px-6 relative" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="absolute inset-0 border-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }} />
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full border mb-4 inline-block"
            style={{ color: '#00FF99', borderColor: 'rgba(0,255,153,0.2)', background: 'rgba(0,255,153,0.05)' }}>
            Live Product Metrics
          </span>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mt-4" style={{ color: '#F5F5F5' }}>
            Numbers that matter.
          </h2>
          <p className="text-sm mt-2" style={{ color: '#8B8B8B' }}>Simulated testnet metrics — reflects production architecture capacity</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map(({ label, value, suffix, color }) => (
            <div key={label} className="rounded-2xl p-6 border text-center"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="text-3xl md:text-4xl font-black mb-2" style={{ color }}>
                <CountUp target={value} suffix={suffix} />
              </div>
              <div className="text-xs font-medium" style={{ color: '#8B8B8B' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
