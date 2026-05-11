import { ArrowRight, Zap, Shield, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const statusItems = [
  { label: 'Network', value: 'Stellar Testnet', dot: 'bg-green-400' },
  { label: 'Status', value: 'Online', dot: 'bg-green-400' },
  { label: 'Gas Fees', value: 'Sponsored', dot: 'bg-blue-400' },
  { label: 'Settlement', value: '~3s', dot: 'bg-green-400' },
  { label: 'Passkeys', value: 'Enabled', dot: 'bg-green-400' },
  { label: 'Stablecoin Rail', value: 'Active', dot: 'bg-green-400' },
];

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,255,153,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,153,0.07) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Orb central */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
        <div className="w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #00FF99 0%, #00D084 40%, transparent 70%)', filter: 'blur(80px)', animation: 'pulse 4s ease-in-out infinite' }}
        />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
        <div className="w-[300px] h-[300px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #00FF99, transparent)', filter: 'blur(30px)', animation: 'pulse 3s ease-in-out infinite reverse' }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto w-full flex flex-col items-center text-center">

        {/* Badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-10" style={{ animation: 'fadeSlideUp 0.6s ease both' }}>
          {['Built on Stellar Testnet', 'Gasless Payments', 'Pix → Stablecoins'].map((b) => (
            <span key={b} className="px-4 py-1.5 rounded-full text-xs font-semibold border"
              style={{ background: 'rgba(0,255,153,0.06)', borderColor: 'rgba(0,255,153,0.2)', color: '#00FF99', letterSpacing: '0.05em' }}>
              {b}
            </span>
          ))}
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-none"
          style={{ animation: 'fadeSlideUp 0.7s 0.1s ease both' }}>
          <span style={{ color: '#F5F5F5' }}>The invisible bridge</span>
          <br />
          <span style={{ background: 'linear-gradient(135deg, #00FF99, #00D084)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            between Pix and Web3.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl max-w-2xl mb-10 leading-relaxed"
          style={{ color: '#8B8B8B', animation: 'fadeSlideUp 0.7s 0.2s ease both' }}>
          Create a wallet instantly using Passkeys, deposit fiat through Pix, and receive stablecoins directly in your self-custody account.
        </p>

        {/* Flow visual */}
        <div className="flex items-center gap-3 md:gap-5 mb-12 text-sm font-semibold flex-wrap justify-center"
          style={{ animation: 'fadeSlideUp 0.7s 0.3s ease both' }}>
          {['PIX', 'WalletNow', 'Stellar', 'Stablecoin'].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-3">
              <span className="px-4 py-2 rounded-xl border"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: i === 1 ? '#00FF99' : '#F5F5F5' }}>
                {step}
              </span>
              {i < arr.length - 1 && <ArrowRight className="w-4 h-4" style={{ color: '#00FF99' }} />}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-16" style={{ animation: 'fadeSlideUp 0.7s 0.4s ease both' }}>
          <button onClick={() => navigate('/login')}
            className="flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-bold text-lg text-black transition-all"
            style={{ background: '#00FF99', boxShadow: '0 0 40px rgba(0,255,153,0.4)', transition: 'all 0.3s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 60px rgba(0,255,153,0.6)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 40px rgba(0,255,153,0.4)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}>
            Launch Testnet MVP <ArrowRight className="w-5 h-5" />
          </button>
          <a href="#architecture"
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#F5F5F5' }}>
            View Architecture
          </a>
        </div>

        {/* Live Status Widget */}
        <div className="w-full max-w-3xl rounded-2xl p-4 border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', animation: 'fadeSlideUp 0.7s 0.5s ease both' }}>
          <div className="flex items-center gap-2 mb-3 px-2">
            <Wifi className="w-3.5 h-3.5" style={{ color: '#00FF99' }} />
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#8B8B8B' }}>Live Network Status</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {statusItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className={`w-1.5 h-1.5 rounded-full ${item.dot}`} style={{ boxShadow: `0 0 6px currentColor` }} />
                <span className="text-xs" style={{ color: '#8B8B8B' }}>{item.label}:</span>
                <span className="text-xs font-semibold" style={{ color: '#F5F5F5' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="mt-16 flex flex-col items-center gap-2 opacity-40" style={{ animation: 'bounce 2s infinite' }}>
          <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, transparent, #00FF99)' }} />
          <Zap className="w-3 h-3" style={{ color: '#00FF99' }} />
        </div>
      </div>
    </section>
  );
}
