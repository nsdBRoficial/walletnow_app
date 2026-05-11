import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LandingT } from '../../i18n/landingTranslations';

function FAQItem({ q, a }: { q: string; a: string; [k: string]: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-3xl overflow-hidden premium-transition border ${open ? 'border-[var(--color-wn-green)]/30 glass-card-solid shadow-[var(--shadow-premium)] scale-[1.01]' : 'border-[var(--border-subtle)] glass-card hover:border-[var(--border-light)] hover:bg-[var(--bg-surface-solid)]'}`}>
      <button className="w-full flex items-center justify-between px-8 py-6 text-left gap-6 group"
        onClick={() => setOpen((v) => !v)}>
        <span className={`font-bold text-base premium-transition ${open ? 'text-[var(--color-wn-green)]' : 'text-[var(--text-primary)] group-hover:text-[var(--color-wn-green-hover)]'}`}>{q}</span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 premium-transition ${open ? 'bg-[var(--glow-primary)]' : 'bg-[var(--border-light)] group-hover:bg-[var(--border-subtle)]'}`}>
          <ChevronDown className={`w-4 h-4 premium-transition ${open ? 'rotate-180 text-[var(--color-wn-green)]' : 'rotate-0 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`} />
        </div>
      </button>
      <div className={`px-8 overflow-hidden premium-transition ${open ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 pb-0 opacity-0'}`}>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{a}</p>
      </div>
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
      <section id="faq" className="py-24 px-6 relative z-10 bg-[var(--bg-main)]" style={{ scrollMarginTop: 70 }}>
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="text-center mb-16 animate-fade-in-up">
            <span className="text-xs font-semibold tracking-[0.2em] uppercase px-5 py-2 rounded-full glass-card text-[var(--text-secondary)]">
              {faq.badge}
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-6 text-[var(--text-primary)]">{faq.headline}</h2>
          </div>
          <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            {faq.items.map((item, idx) => (
              <FAQItem key={idx} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 relative overflow-hidden text-center z-10">
        
        {/* Massive Glow Background */}
        <div className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-20" style={{ background: 'radial-gradient(ellipse at center, var(--glow-primary) 0%, transparent 60%)' }} />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--color-wn-green)] to-transparent opacity-20" />

        <div className="relative z-10 max-w-4xl mx-auto animate-fade-in-up">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-[1.05] text-[var(--text-primary)]">
            {cta.headline1}<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-[var(--color-wn-green)] to-[var(--color-wn-green-hover)] filter drop-shadow-[0_0_16px_rgba(0,255,153,0.3)]">
              {cta.headline2}
            </span>
          </h2>
          <p className="text-xl mb-12 max-w-2xl mx-auto text-[var(--text-secondary)] font-medium leading-relaxed">{cta.sub}</p>
          
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <button onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-3 px-12 py-5 rounded-full font-black text-lg bg-[var(--text-primary)] text-[var(--bg-main)] transition-all duration-300 hover:translate-y-[-4px] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4)] shadow-[0_10px_20px_-10px_rgba(0,0,0,0.2)] w-full sm:w-auto">
              {cta.launch} <span className="text-[var(--color-wn-green)]">→</span>
            </button>
            <a href="https://github.com/nsdBRoficial/walletnow_app" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-10 py-5 rounded-full font-bold text-base glass-card-solid text-[var(--text-primary)] transition-all duration-300 hover:bg-[var(--border-light)] hover:-translate-y-1 w-full sm:w-auto">
              {cta.github}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-[var(--border-light)] flex flex-col items-center justify-center gap-4 bg-[var(--bg-main)] relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center bg-white rounded-md p-1 shadow-sm" style={{ width: 26, height: 26 }}>
            <img src={`${import.meta.env.BASE_URL}logo-walletnow.svg`} alt="Logo" style={{ height: '100%', width: 'auto', display: 'block' }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>WalletNow</span>
        </div>
        <p className="text-xs font-medium tracking-wide text-[var(--text-secondary)] flex items-center justify-center flex-wrap gap-1.5">
          © 2026 WalletNow · Built on <img src={`${import.meta.env.BASE_URL}stellar-logo.svg`} alt="Stellar" className="w-3.5 h-3.5 inline-block -mt-0.5" /> Stellar · {t.footer} · <span className="text-[var(--color-wn-green)] font-bold">Testnet</span>
        </p>
      </footer>
    </>
  );
}
