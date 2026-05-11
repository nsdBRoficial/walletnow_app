import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LandingT } from '../../i18n/landingTranslations';

function FAQItem({ q, a }: { q: string; a: string; [k: string]: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-2xl overflow-hidden transition-all duration-300"
      style={{ borderColor: open ? 'rgba(0,255,153,0.2)' : 'rgba(255,255,255,0.06)', background: open ? 'rgba(0,255,153,0.03)' : 'rgba(255,255,255,0.02)' }}>
      <button className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
        onClick={() => setOpen((v) => !v)}>
        <span className="font-semibold text-sm" style={{ color: '#F5F5F5' }}>{q}</span>
        <ChevronDown className="w-4 h-4 shrink-0 transition-transform duration-300"
          style={{ color: '#8B8B8B', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      {open && <div className="px-6 pb-5 text-sm leading-relaxed" style={{ color: '#8B8B8B' }}>{a}</div>}
    </div>
  );
}

export default function FAQAndCTASection({ t }: { t: LandingT }) {
  const navigate = useNavigate();
  const faq = t.faq;
  const cta = t.cta;
  return (
    <>
      {/* FAQ */}
      <section id="faq" className="py-28 px-6" style={{ scrollMarginTop: 70 }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full border mb-4 inline-block"
              style={{ color: '#00FF99', borderColor: 'rgba(0,255,153,0.2)', background: 'rgba(0,255,153,0.05)' }}>
              {faq.badge}
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mt-4" style={{ color: '#F5F5F5' }}>{faq.headline}</h2>
          </div>
          <div className="space-y-3">
            {faq.items.map((item, idx) => (
              <FAQItem key={idx} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 relative overflow-hidden text-center">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(0,255,153,0.07) 0%, transparent 65%)' }} />
        <div className="absolute inset-0 border-t" style={{ borderColor: 'rgba(0,255,153,0.08)' }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6" style={{ color: '#F5F5F5' }}>
            {cta.headline1}<br />
            <span style={{ background: 'linear-gradient(135deg, #00FF99, #00D084)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {cta.headline2}
            </span>
          </h2>
          <p className="text-lg mb-10" style={{ color: '#8B8B8B' }}>{cta.sub}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-bold text-lg text-black transition-all"
              style={{ background: '#00FF99', boxShadow: '0 0 40px rgba(0,255,153,0.35)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 60px rgba(0,255,153,0.55)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(0,255,153,0.35)'; }}>
              {cta.launch} →
            </button>
            <a href="https://github.com/nsdBRoficial/walletnow_app" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#F5F5F5', textDecoration: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}>
              {cta.github}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t text-center" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-xs" style={{ color: '#8B8B8B' }}>
          © 2026 WalletNow · Built on Stellar · {t.footer} · <span style={{ color: '#00FF99' }}>Testnet</span>
        </p>
      </footer>
    </>
  );
}
