import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const faqs = [
  { q: 'Is this custodial?', a: 'No. WalletNow is 100% non-custodial. Your private key is generated on-device, stored in your device enclave, and never transmitted to our servers.' },
  { q: 'How does Passkey login work?', a: 'We use WebAuthn / FIDO2 — your biometrics (fingerprint, Face ID) sign a challenge on your hardware. There is no password or seed phrase. The key never leaves your device.' },
  { q: 'What happens if I change devices?', a: 'Currently, your wallet key is device-bound. A recovery layer is on the MVP 1.0 roadmap via multi-sig and cross-device Passkey sync through your cloud account.' },
  { q: 'Which stablecoins are supported?', a: 'BRZ (Brazilian Real on Stellar) and BRW (WalletNow native stablecoin) are currently supported on Testnet. USDC and ARZ support planned for Mainnet.' },
  { q: 'Why Stellar?', a: 'Stellar offers fast finality (~5s), near-zero fees, native asset issuance, and fee sponsorship via CAP-33 — perfect for inclusive, gasless fiat onboarding.' },
  { q: 'Is KYC required?', a: 'Our Zero-Knowledge KYC layer validates identity without storing PII. It\'s optional for basic usage — required for higher transaction limits on Mainnet.' },
];

interface FAQItemProps { q: string; a: string; [key: string]: unknown; }

function FAQItem(props: FAQItemProps) {
  const { q, a } = props;
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-2xl overflow-hidden transition-all duration-300"
      style={{ borderColor: open ? 'rgba(0,255,153,0.2)' : 'rgba(255,255,255,0.06)', background: open ? 'rgba(0,255,153,0.03)' : 'rgba(255,255,255,0.02)' }}>
      <button className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
        onClick={() => setOpen(!open)}>
        <span className="font-semibold text-sm" style={{ color: '#F5F5F5' }}>{q}</span>
        <ChevronDown className="w-4 h-4 shrink-0 transition-transform duration-300" style={{ color: '#8B8B8B', transform: open ? 'rotate(180deg)' : 'rotate(0)' }} />
      </button>
      {open && (
        <div className="px-6 pb-5 text-sm leading-relaxed" style={{ color: '#8B8B8B' }}>{a}</div>
      )}
    </div>
  );
}

export default function FAQAndCTASection() {
  const navigate = useNavigate();
  return (
    <>
      {/* FAQ */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full border mb-4 inline-block"
              style={{ color: '#00FF99', borderColor: 'rgba(0,255,153,0.2)', background: 'rgba(0,255,153,0.05)' }}>
              FAQ
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mt-4" style={{ color: '#F5F5F5' }}>
              Frequently asked questions.
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f, idx) => {
              return <FAQItem key={idx} q={f.q} a={f.a} />;
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 relative overflow-hidden text-center">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(0,255,153,0.07) 0%, transparent 65%)' }} />
        <div className="absolute inset-0 border-t" style={{ borderColor: 'rgba(0,255,153,0.08)' }} />

        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6" style={{ color: '#F5F5F5' }}>
            Experience frictionless<br />
            <span style={{ background: 'linear-gradient(135deg, #00FF99, #00D084)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Web3 onboarding.
            </span>
          </h2>
          <p className="text-lg mb-10" style={{ color: '#8B8B8B' }}>
            No seed phrases. No gas. No exchange. Just your biometrics and Pix.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-bold text-lg text-black transition-all"
              style={{ background: '#00FF99', boxShadow: '0 0 40px rgba(0,255,153,0.35)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 60px rgba(0,255,153,0.55)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 40px rgba(0,255,153,0.35)'; }}>
              Launch WalletNow →
            </button>
            <a href="https://github.com/nsdBRoficial/walletnow_app" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#F5F5F5' }}>
              View GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t text-center" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-xs" style={{ color: '#8B8B8B' }}>
          © 2026 WalletNow · Built on Stellar · Hackathon Edition ·{' '}
          <span style={{ color: '#00FF99' }}>Testnet</span>
        </p>
      </footer>
    </>
  );
}
