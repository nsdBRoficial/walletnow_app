import { X, Check } from 'lucide-react';

const problems = [
  { title: 'Seed Phrases', desc: 'Users forced to write and manage 12/24 secret words.' },
  { title: 'Gas Fees', desc: 'Must buy native tokens before any transaction.' },
  { title: 'Complex Onboarding', desc: 'Slow, confusing process through centralized exchanges.' },
  { title: 'Exchange Dependency', desc: 'Custodial risk, KYC friction, and withdrawal delays.' },
  { title: 'KYC Friction', desc: 'Lengthy verification blocking access to Web3.' },
];

const solutions = [
  { title: 'Passkeys', desc: 'Biometric login — no passwords, no seed phrases, no friction.' },
  { title: 'Gasless UX', desc: 'Fees sponsored via Stellar CAP-33. Zero XLM required.' },
  { title: 'Pix Integration', desc: 'Instant BRL deposit via Pix → stablecoins in seconds.' },
  { title: 'Self-Custody', desc: 'You own the keys. Non-custodial, device-bound identity.' },
  { title: 'Instant Onboarding', desc: 'Wallet created automatically on first login. Done.' },
];

export default function ProblemSolutionSection() {
  return (
    <section className="py-28 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full border mb-4 inline-block"
            style={{ color: '#00FF99', borderColor: 'rgba(0,255,153,0.2)', background: 'rgba(0,255,153,0.05)' }}>
            Why WalletNow
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-4" style={{ color: '#F5F5F5' }}>
            Leaving Web3 barriers<br />in the past.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* Problems */}
          <div className="rounded-3xl p-8 border" style={{ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.12)' }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <X className="w-4 h-4 text-red-400" />
              </div>
              <h3 className="font-bold text-red-400 text-sm tracking-widest uppercase">High Friction — Market Standard</h3>
            </div>
            <ul className="space-y-5">
              {problems.map((p) => (
                <li key={p.title} className="flex items-start gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500/50 mt-2 shrink-0" />
                  <div>
                    <span className="font-semibold text-sm" style={{ color: '#F5F5F5' }}>{p.title} — </span>
                    <span className="text-sm" style={{ color: '#8B8B8B' }}>{p.desc}</span>
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
              <h3 className="font-bold text-sm tracking-widest uppercase" style={{ color: '#00FF99' }}>Low Friction — WalletNow</h3>
            </div>
            <ul className="space-y-5">
              {solutions.map((s) => (
                <li key={s.title} className="flex items-start gap-4">
                  <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: '#00FF99', boxShadow: '0 0 8px #00FF99' }} />
                  <div>
                    <span className="font-semibold text-sm" style={{ color: '#F5F5F5' }}>{s.title} — </span>
                    <span className="text-sm" style={{ color: '#8B8B8B' }}>{s.desc}</span>
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
