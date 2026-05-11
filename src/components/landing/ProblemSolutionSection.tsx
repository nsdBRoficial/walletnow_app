import { X, Check } from 'lucide-react';
import type { LandingT } from '../../i18n/landingTranslations';

export default function ProblemSolutionSection({ t }: { t: LandingT }) {
  const p = t.problem;
  return (
    <section className="py-28 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full border mb-4 inline-block"
            style={{ color: '#00FF99', borderColor: 'rgba(0,255,153,0.2)', background: 'rgba(0,255,153,0.05)' }}>
            {p.badge}
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-4" style={{ color: '#F5F5F5' }}>
            {p.headline}
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* Problems */}
          <div className="rounded-3xl p-8 border" style={{ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.12)' }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <X className="w-4 h-4 text-red-400" />
              </div>
              <h3 className="font-bold text-red-400 text-sm tracking-widest uppercase">{p.highTitle}</h3>
            </div>
            <ul className="space-y-5">
              {p.problems.map((item) => (
                <li key={item.title} className="flex items-start gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500/50 mt-2 shrink-0" />
                  <div>
                    <span className="font-semibold text-sm" style={{ color: '#F5F5F5' }}>{item.title} — </span>
                    <span className="text-sm" style={{ color: '#8B8B8B' }}>{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {/* Solutions */}
          <div className="rounded-3xl p-8 border md:-translate-y-4" style={{ background: 'rgba(0,255,153,0.03)', borderColor: 'rgba(0,255,153,0.15)', boxShadow: '0 30px 60px rgba(0,255,153,0.06)' }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,255,153,0.1)' }}>
                <Check className="w-4 h-4" style={{ color: '#00FF99' }} />
              </div>
              <h3 className="font-bold text-sm tracking-widest uppercase" style={{ color: '#00FF99' }}>{p.lowTitle}</h3>
            </div>
            <ul className="space-y-5">
              {p.solutions.map((item) => (
                <li key={item.title} className="flex items-start gap-4">
                  <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: '#00FF99', boxShadow: '0 0 8px #00FF99' }} />
                  <div>
                    <span className="font-semibold text-sm" style={{ color: '#F5F5F5' }}>{item.title} — </span>
                    <span className="text-sm" style={{ color: '#8B8B8B' }}>{item.desc}</span>
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
