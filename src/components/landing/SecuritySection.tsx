import { ShieldCheck, Key, Lock, Fingerprint, Zap, Eye } from 'lucide-react';
import type { LandingT } from '../../i18n/landingTranslations';

const icons = [ShieldCheck, Fingerprint, Eye, Lock, Zap, Key];

export default function SecuritySection({ t }: { t: LandingT }) {
  const s = t.security;
  return (
    <section id="security" className="py-28 px-6 relative overflow-hidden" style={{ scrollMarginTop: 70 }}>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,255,153,0.08), transparent 70%)', filter: 'blur(60px)' }} />
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full border mb-4 inline-block"
            style={{ color: '#00FF99', borderColor: 'rgba(0,255,153,0.2)', background: 'rgba(0,255,153,0.05)' }}>
            {s.badge}
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-4" style={{ color: '#F5F5F5' }}>{s.headline}</h2>
          <p className="mt-4 max-w-xl mx-auto text-lg" style={{ color: '#8B8B8B' }}>{s.sub}</p>
        </div>
        {/* Vault visual */}
        <div className="relative mb-16 flex justify-center">
          <div className="w-36 h-36 rounded-full flex items-center justify-center relative"
            style={{ background: 'rgba(0,255,153,0.06)', border: '1px solid rgba(0,255,153,0.15)' }}>
            <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(0,255,153,0.03)', animation: 'ping 3s cubic-bezier(0,0,0.2,1) infinite' }} />
            <Lock className="w-16 h-16" style={{ color: '#00FF99', filter: 'drop-shadow(0 0 20px rgba(0,255,153,0.5))' }} />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border pointer-events-none" style={{ borderColor: 'rgba(0,255,153,0.06)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border pointer-events-none" style={{ borderColor: 'rgba(0,255,153,0.03)' }} />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {s.items.map((item, idx) => {
            const Icon = icons[idx];
            return (
              <div key={item.title} className="rounded-2xl p-6 border flex gap-4 transition-all duration-300"
                style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,153,0.2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,255,153,0.08)' }}>
                  <Icon className="w-5 h-5" style={{ color: '#00FF99' }} />
                </div>
                <div>
                  <div className="font-bold text-sm mb-1" style={{ color: '#F5F5F5' }}>{item.title}</div>
                  <p className="text-xs leading-relaxed" style={{ color: '#8B8B8B' }}>{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
