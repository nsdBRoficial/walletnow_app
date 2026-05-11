import { ArrowRight, Zap, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LandingT } from '../../i18n/landingTranslations';

const statusItems = [
  { labelKey: 'Network', value: 'Stellar Testnet', dot: 'bg-green-400' },
  { labelKey: 'Status',  value: 'Online',          dot: 'bg-green-400' },
  { labelKey: 'Gas Fees',value: 'Sponsored',        dot: 'bg-blue-400'  },
  { labelKey: 'Settlement', value: '~3s',           dot: 'bg-green-400' },
  { labelKey: 'Passkeys', value: 'Enabled',         dot: 'bg-green-400' },
  { labelKey: 'Stablecoin Rail', value: 'Active',   dot: 'bg-green-400' },
];

export default function HeroSection({ t }: { t: LandingT }) {
  const navigate = useNavigate();
  const h = t.hero;

  return (
    <section className="relative flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ minHeight: 'calc(100vh - 60px)', paddingTop: 80, paddingBottom: 80 }}>

      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(0,255,153,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,153,0.06) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }} />

      {/* Orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,153,0.12) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'pulse 4s ease-in-out infinite' }} />

      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center">

        {/* Badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-12" style={{ animation: 'fadeSlideUp 0.6s ease both' }}>
          {[h.badge1, h.badge2, h.badge3].map((b) => (
            <span key={b} className="px-4 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(0,255,153,0.06)', border: '1px solid rgba(0,255,153,0.2)', color: '#00FF99', letterSpacing: '0.05em' }}>
              {b}
            </span>
          ))}
        </div>

        {/* Headline */}
        <h1 className="font-black tracking-tighter mb-8 leading-none"
          style={{ fontSize: 'clamp(2.4rem, 7vw, 5rem)', animation: 'fadeSlideUp 0.7s 0.1s ease both' }}>
          <span style={{ color: '#F5F5F5' }}>{h.headline1}</span><br />
          <span style={{ background: 'linear-gradient(135deg, #00FF99, #00D084)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {h.headline2}
          </span>
        </h1>

        {/* Sub */}
        <p className="max-w-2xl mb-10 leading-relaxed"
          style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#8B8B8B', animation: 'fadeSlideUp 0.7s 0.2s ease both' }}>
          {h.sub}
        </p>

        {/* Flow */}
        <div className="flex items-center gap-3 flex-wrap justify-center mb-12 text-sm font-semibold"
          style={{ animation: 'fadeSlideUp 0.7s 0.3s ease both' }}>
          {['PIX', 'WalletNow', 'Stellar', 'Stablecoin'].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-3">
              <span className="px-4 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: i === 1 ? '#00FF99' : '#F5F5F5' }}>
                {step}
              </span>
              {i < arr.length - 1 && <ArrowRight className="w-4 h-4" style={{ color: '#00FF99' }} />}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-16" style={{ animation: 'fadeSlideUp 0.7s 0.4s ease both' }}>
          <button onClick={() => navigate('/login')}
            className="flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-bold text-lg text-black"
            style={{ background: '#00FF99', boxShadow: '0 0 40px rgba(0,255,153,0.4)', transition: 'all 0.3s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 60px rgba(0,255,153,0.6)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(0,255,153,0.4)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
            {h.ctaPrimary} <ArrowRight className="w-5 h-5" />
          </button>
          <a href="#architecture"
            onClick={e => { e.preventDefault(); document.getElementById('architecture')?.scrollIntoView({ behavior: 'smooth' }); }}
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#F5F5F5', textDecoration: 'none', transition: 'background 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}>
            {h.ctaSecondary}
          </a>
        </div>

        {/* Live Status Widget */}
        <div className="w-full max-w-3xl rounded-2xl p-4 border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', animation: 'fadeSlideUp 0.7s 0.5s ease both' }}>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Wifi className="w-3.5 h-3.5" style={{ color: '#00FF99' }} />
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#8B8B8B' }}>{h.statusTitle}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {statusItems.map((item) => (
              <div key={item.labelKey} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                <span className="text-xs" style={{ color: '#8B8B8B' }}>{item.labelKey}:</span>
                <span className="text-xs font-semibold truncate" style={{ color: '#F5F5F5' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="mt-16 flex flex-col items-center gap-2 opacity-40" style={{ animation: 'bounce 2.5s infinite' }}>
          <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, transparent, #00FF99)' }} />
          <Zap className="w-3 h-3" style={{ color: '#00FF99' }} />
        </div>
      </div>
    </section>
  );
}
