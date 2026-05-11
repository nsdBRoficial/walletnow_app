import { ShieldCheck, Key, Lock, Fingerprint, Zap, Eye } from 'lucide-react';

const items = [
  { icon: ShieldCheck, title: 'Non-Custodial', desc: 'We never hold your keys. Your wallet belongs only to you.', color: '#00FF99' },
  { icon: Fingerprint, title: 'Device-Bound Auth', desc: 'Passkeys are tied to your hardware. Unphishable by design.', color: '#00D084' },
  { icon: Eye, title: 'No Seed Exposure', desc: 'Secret key lives in device enclave — never transmitted.', color: '#00FF99' },
  { icon: Lock, title: 'WebAuthn / FIDO2', desc: 'Industry standard biometric authentication protocol.', color: '#00D084' },
  { icon: Zap, title: 'Sponsored Transactions', desc: 'Users never pay gas — fee abstraction via Stellar CAP-33.', color: '#00FF99' },
  { icon: Key, title: 'Encrypted Local Storage', desc: 'Keys persisted with hardware-backed encryption at rest.', color: '#00D084' },
];

export default function SecuritySection() {
  return (
    <section className="py-28 px-6 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,255,153,0.08), transparent 70%)', filter: 'blur(60px)' }} />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full border mb-4 inline-block"
            style={{ color: '#00FF99', borderColor: 'rgba(0,255,153,0.2)', background: 'rgba(0,255,153,0.05)' }}>
            Security
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-4" style={{ color: '#F5F5F5' }}>
            Security by design.
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-lg" style={{ color: '#8B8B8B' }}>
            Built on zero-trust principles. No single point of failure. No custodial risk.
          </p>
        </div>

        {/* Vault visual */}
        <div className="relative mb-16 flex justify-center">
          <div className="w-36 h-36 rounded-full flex items-center justify-center relative"
            style={{ background: 'rgba(0,255,153,0.06)', border: '1px solid rgba(0,255,153,0.15)' }}>
            <div className="absolute inset-0 rounded-full animate-ping"
              style={{ background: 'rgba(0,255,153,0.03)', animationDuration: '3s' }} />
            <Lock className="w-16 h-16" style={{ color: '#00FF99', filter: 'drop-shadow(0 0 20px rgba(0,255,153,0.5))' }} />
          </div>
          {/* Orbital rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border pointer-events-none"
            style={{ borderColor: 'rgba(0,255,153,0.06)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border pointer-events-none"
            style={{ borderColor: 'rgba(0,255,153,0.03)' }} />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="rounded-2xl p-6 border flex gap-4 group transition-all duration-300"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,153,0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,255,153,0.08)' }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div>
                <div className="font-bold text-sm mb-1" style={{ color: '#F5F5F5' }}>{title}</div>
                <p className="text-xs leading-relaxed" style={{ color: '#8B8B8B' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
