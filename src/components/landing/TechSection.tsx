import { Code2, Database, Zap, Shield, Fingerprint, Lock, Layers, CreditCard } from 'lucide-react';
import type { LandingT } from '../../i18n/landingTranslations';

const techIcons = [Code2, Database, Zap, Shield, Fingerprint, Lock, Layers, CreditCard];
const techLabels = ['Stellar SDK v14', 'Supabase Edge', 'Realtime Webhooks', 'Gas Sponsorship', 'Passkey Auth', 'Non-Custodial', 'Pix Infra', 'Stablecoin'];
const techDescs = [
  'Ed25519 keypair generation, sponsored reserves.',
  'Serverless Deno runtime for processing.',
  'Pix settlement events processed in real-time.',
  'beginSponsoringFutureReserves — seamless UX.',
  'WebAuthn / FIDO2 biometric authentication.',
  'Private key stored in device enclave.',
  'QR Code generation tied to Stellar address.',
  'BRZ/BRW minted via trustline on-chain.',
];
const techTags = ['Core', 'Backend', 'Events', 'Stellar', 'Security', 'Security', 'Payments', 'DeFi'];
const stackBadges = ['React 19', 'TypeScript', 'Vite 6', 'Stellar SDK v14', 'Supabase', 'WebAuthn', 'Tailwind v4', 'Vitest'];

export default function TechSection({ t }: { t: LandingT }) {
  const tech = t.tech;
  return (
    <section id="architecture" className="py-24 px-6 relative z-10" style={{ scrollMarginTop: 70 }}>
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        
        {/* Trusted Technology Header */}
        <div className="text-center mb-10 animate-fade-in-up">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase px-5 py-2 rounded-full glass-card text-[var(--text-secondary)]">
            {tech.badge}
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-6 text-[var(--text-primary)]">{tech.headline}</h2>
        </div>

        {/* Minimalist Horizontal Logos / Badges Row */}
        <div className="w-full overflow-hidden mb-20 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex flex-wrap justify-center gap-4">
            {stackBadges.map((badge, idx) => (
              <div key={idx} className="glass-card px-6 py-3 rounded-2xl flex items-center justify-center gap-2 premium-transition hover:bg-[var(--bg-surface-solid)] hover:-translate-y-1 cursor-default">
                <span className="text-sm font-semibold text-[var(--text-secondary)]">{badge}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Premium Tech Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          {techLabels.map((label, idx) => {
            const Icon = techIcons[idx];
            const tag = techTags[idx];
            return (
              <div key={label} className="group glass-card rounded-[24px] p-6 flex flex-col gap-4 premium-transition hover:bg-[var(--bg-surface-solid)] hover:-translate-y-2 hover:shadow-[var(--shadow-premium)]">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--border-subtle)] flex items-center justify-center group-hover:bg-[var(--glow-primary)] premium-transition">
                    {idx === 0 ? <img src={`${import.meta.env.BASE_URL}stellar-logo.svg`} alt="Stellar" className="w-5 h-5" /> : 
                     idx === 6 ? <img src={`${import.meta.env.BASE_URL}pix-icon.svg`} alt="Pix" className="w-5 h-5" /> :
                     idx === 7 ? <img src={`${import.meta.env.BASE_URL}usdc-icon.svg`} alt="USDC" className="w-5 h-5" /> :
                     <Icon className="w-5 h-5 text-[var(--text-primary)] group-hover:text-[var(--color-wn-green-hover)] premium-transition" />}
                  </div>
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-[var(--border-light)] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] premium-transition">
                    {tag}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)] mb-1">{label}</h3>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] premium-transition opacity-80">{techDescs[idx]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
