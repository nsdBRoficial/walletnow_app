import { CheckCircle2 } from 'lucide-react';
import type { LandingT } from '../../i18n/landingTranslations';

const statusMap = ['current', 'next', 'future'] as const;
const colorMap = ['#00FF99', '#00D084', '#8B8B8B'] as const;
const ecosystemBadges = ['Stellar', 'Supabase', 'Vite', 'React', 'WebAuthn', 'TypeScript'];

export default function RoadmapSection({ t }: { t: LandingT }) {
  const r = t.roadmap;
  return (
    <section id="roadmap" className="py-28 px-6 relative" style={{ background: 'rgba(0,0,0,0.5)', scrollMarginTop: 70 }}>
      <div className="absolute inset-0 border-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }} />
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full border mb-4 inline-block"
            style={{ color: '#00FF99', borderColor: 'rgba(0,255,153,0.2)', background: 'rgba(0,255,153,0.05)' }}>
            {r.badge}
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-4" style={{ color: '#F5F5F5' }}>{r.headline}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {r.milestones.map((m, idx) => {
            const status = statusMap[idx];
            const color = colorMap[idx];
            return (
              <div key={m.version} className="rounded-2xl p-6 border"
                style={{ background: status === 'current' ? 'rgba(0,255,153,0.04)' : 'rgba(255,255,255,0.02)', borderColor: status === 'current' ? 'rgba(0,255,153,0.2)' : 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: status === 'current' ? `0 0 8px ${color}` : 'none' }} />
                  <span className="font-black text-lg" style={{ color }}>{m.version}</span>
                  {status === 'current' && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(0,255,153,0.1)', color: '#00FF99' }}>{r.liveLabel}</span>
                  )}
                </div>
                <ul className="space-y-3">
                  {m.items.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: status === 'future' ? '#333' : color }} />
                      <span className="text-sm" style={{ color: status === 'future' ? '#555' : '#8B8B8B' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest uppercase mb-6" style={{ color: '#8B8B8B' }}>{r.ecosystemLabel}</p>
          <div className="flex flex-wrap justify-center gap-4">
            {ecosystemBadges.map((b) => (
              <span key={b} className="px-5 py-2 rounded-full text-sm font-semibold border"
                style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)', color: '#F5F5F5' }}>{b}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
