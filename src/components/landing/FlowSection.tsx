import { useState, useEffect, useRef } from 'react';
import { Fingerprint, Wallet, QrCode, CheckCircle2, Coins } from 'lucide-react';

const steps = [
  { icon: Fingerprint, label: 'Login with Passkey', desc: 'Biometric authentication — no password required.', color: '#00FF99' },
  { icon: Wallet, label: 'Wallet Auto-Created', desc: 'Stellar keypair generated instantly in background.', color: '#00D084' },
  { icon: QrCode, label: 'Generate Pix', desc: 'QR Code created linked to your Stellar address.', color: '#00FF99' },
  { icon: CheckCircle2, label: 'Payment Confirmed', desc: 'Webhook fires upon Pix settlement (~2s).', color: '#00D084' },
  { icon: Coins, label: 'Stablecoins Delivered', desc: 'BRZ/BRW minted directly to your self-custody wallet.', color: '#00FF99' },
];

export default function FlowSection() {
  const [active, setActive] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setActive((prev) => (prev + 1) % steps.length);
    }, 2000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return (
    <section className="py-28 px-6 relative" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="absolute inset-0 border-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }} />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full border mb-4 inline-block"
            style={{ color: '#00FF99', borderColor: 'rgba(0,255,153,0.2)', background: 'rgba(0,255,153,0.05)' }}>
            How It Works
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-4" style={{ color: '#F5F5F5' }}>
            From fiat to Web3 in 5 steps.
          </h2>
        </div>

        {/* Timeline horizontal */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-0 items-start md:items-stretch">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isActive = active === i;
            const isDone = i < active;
            return (
              <div key={step.label}
                className="flex-1 flex flex-col cursor-pointer"
                onClick={() => {
                  setActive(i);
                  if (intervalRef.current) clearInterval(intervalRef.current);
                }}>
                {/* Connector line */}
                {i > 0 && (
                  <div className="hidden md:block h-px mt-10 -mx-px transition-all duration-500"
                    style={{ background: isDone ? '#00FF99' : 'rgba(255,255,255,0.08)' }} />
                )}
                <div className={`rounded-2xl p-5 border mx-1 transition-all duration-500 ${isActive ? 'md:-translate-y-2' : ''}`}
                  style={{
                    background: isActive ? 'rgba(0,255,153,0.07)' : 'rgba(255,255,255,0.02)',
                    borderColor: isActive ? 'rgba(0,255,153,0.3)' : 'rgba(255,255,255,0.06)',
                    boxShadow: isActive ? '0 10px 40px rgba(0,255,153,0.1)' : 'none',
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: isActive ? 'rgba(0,255,153,0.15)' : 'rgba(255,255,255,0.04)' }}>
                    <Icon className="w-5 h-5" style={{ color: isActive ? '#00FF99' : '#8B8B8B' }} />
                  </div>
                  <div className="text-xs font-bold mb-2" style={{ color: '#8B8B8B' }}>Step {i + 1}</div>
                  <div className="font-bold text-sm mb-1" style={{ color: isActive ? '#F5F5F5' : '#8B8B8B' }}>{step.label}</div>
                  {isActive && <p className="text-xs leading-relaxed" style={{ color: '#8B8B8B' }}>{step.desc}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-8 h-px rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${((active + 1) / steps.length) * 100}%`, background: 'linear-gradient(90deg, #00FF99, #00D084)' }} />
        </div>
      </div>
    </section>
  );
}
