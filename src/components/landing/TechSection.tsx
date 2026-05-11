import { Code2, Database, Zap, Shield, Fingerprint, Lock, Layers, CreditCard } from 'lucide-react';
import type { LandingT } from '../../i18n/landingTranslations';

const techIcons = [Code2, Database, Zap, Shield, Fingerprint, Lock, Layers, CreditCard];
const techLabels = ['Stellar SDK v14', 'Supabase Edge Functions', 'Realtime Webhooks', 'Gas Sponsorship', 'Passkey Auth', 'Non-Custodial', 'Pix Infrastructure', 'Stablecoin Issuance'];
const techDescs = [
  'Ed25519 keypair generation, sponsored reserves, CAP-33.',
  'Serverless Deno runtime for webhook processing and KYC.',
  'Pix settlement events processed in real-time via Supabase.',
  'beginSponsoringFutureReserves — users never hold XLM.',
  'WebAuthn / FIDO2 biometric device-bound authentication.',
  'Private key stored in device enclave — never on servers.',
  'QR Code generation tied to user Stellar address via webhook.',
  'BRZ/BRW minted via trustline and asset operations on-chain.',
];
const techTags = ['Core', 'Backend', 'Events', 'Stellar', 'Security', 'Security', 'Payments', 'DeFi'];
const tagColors: Record<string, string> = { Core: 'rgba(0,255,153,0.1)', Backend: 'rgba(99,102,241,0.1)', Events: 'rgba(251,191,36,0.1)', Stellar: 'rgba(0,212,255,0.1)', Security: 'rgba(239,68,68,0.1)', Payments: 'rgba(34,197,94,0.1)', DeFi: 'rgba(168,85,247,0.1)' };
const tagTextColors: Record<string, string> = { Core: '#00FF99', Backend: '#818CF8', Events: '#FBBF24', Stellar: '#00D4FF', Security: '#F87171', Payments: '#4ADE80', DeFi: '#C084FC' };
const stackBadges = ['React 19', 'TypeScript', 'Vite 6', 'Stellar SDK v14', 'Supabase', 'WebAuthn', 'Tailwind v4', 'Vitest'];

export default function TechSection({ t }: { t: LandingT }) {
  const tech = t.tech;
  return (
    <section id="architecture" className="py-28 px-6" style={{ scrollMarginTop: 70 }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full border mb-4 inline-block"
            style={{ color: '#00FF99', borderColor: 'rgba(0,255,153,0.2)', background: 'rgba(0,255,153,0.05)' }}>
            {tech.badge}
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-4" style={{ color: '#F5F5F5' }}>{tech.headline}</h2>
          <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: '#8B8B8B' }}>{tech.sub}</p>
        </div>

        {/* Mini Architecture Diagram */}
        <div className="mb-12 rounded-2xl p-6 border overflow-x-auto"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-4 min-w-max mx-auto w-fit">
            {[{ label: 'Passkey', sublabel: 'WebAuthn' }, null, { label: 'WalletNow', sublabel: 'React + Vite', highlight: true }, null, { label: 'Supabase', sublabel: 'Edge + Realtime' }, null, { label: 'Stellar', sublabel: 'Testnet' }].map((node, i) =>
              node === null ? (
                <div key={i} className="flex items-center gap-1 text-xs font-mono" style={{ color: '#00FF99' }}>
                  <div className="w-8 h-px" style={{ background: 'rgba(0,255,153,0.4)' }} /><span>→</span><div className="w-8 h-px" style={{ background: 'rgba(0,255,153,0.4)' }} />
                </div>
              ) : (
                <div key={node.label} className="flex flex-col items-center px-5 py-3 rounded-xl border text-center"
                  style={{ background: node.highlight ? 'rgba(0,255,153,0.08)' : 'rgba(255,255,255,0.03)', borderColor: node.highlight ? 'rgba(0,255,153,0.25)' : 'rgba(255,255,255,0.07)' }}>
                  <span className="font-bold text-sm" style={{ color: node.highlight ? '#00FF99' : '#F5F5F5' }}>{node.label}</span>
                  <span className="text-xs mt-0.5" style={{ color: '#8B8B8B' }}>{node.sublabel}</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {techLabels.map((label, idx) => {
            const Icon = techIcons[idx];
            const tag = techTags[idx];
            return (
              <div key={label} className="rounded-2xl p-5 border flex flex-col gap-3 transition-all duration-300"
                style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,153,0.2)'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,255,153,0.03)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}>
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: tagColors[tag] }}>
                    <Icon className="w-4 h-4" style={{ color: tagTextColors[tag] }} />
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: tagColors[tag], color: tagTextColors[tag] }}>{tag}</span>
                </div>
                <div className="font-bold text-sm" style={{ color: '#F5F5F5' }}>{label}</div>
                <p className="text-xs leading-relaxed" style={{ color: '#8B8B8B' }}>{techDescs[idx]}</p>
              </div>
            );
          })}
        </div>

        {/* Stack badges */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <p className="w-full text-center text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#8B8B8B' }}>{tech.stackLabel}</p>
          {stackBadges.map((s) => (
            <span key={s} className="px-3 py-1 rounded-full text-xs font-mono border"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)', color: '#8B8B8B' }}>{s}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
