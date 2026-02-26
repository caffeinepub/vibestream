import { useState, useEffect } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Zap, Video, Heart, TrendingUp, Users, Star } from 'lucide-react';

const features = [
  {
    icon: Video,
    title: 'Share Short Videos',
    desc: 'Upload and share your best moments with the world',
    color: '#8A2BE2',
  },
  {
    icon: TrendingUp,
    title: 'Discover Trending',
    desc: 'Explore what\'s hot and find your next obsession',
    color: '#00FFFF',
  },
  {
    icon: Heart,
    title: 'Like & Connect',
    desc: 'Engage with creators and build your community',
    color: '#ff6b9d',
  },
  {
    icon: Users,
    title: 'Follow Creators',
    desc: 'Stay updated with your favorite content creators',
    color: '#8A2BE2',
  },
];

export default function LoginScreen() {
  const { login, isLoggingIn } = useInternetIdentity();
  const [activeFeature, setActiveFeature] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setActiveFeature((prev) => (prev + 1) % features.length);
        setAnimating(false);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const feature = features[activeFeature];
  const FeatureIcon = feature.icon;

  return (
    <div className="relative flex flex-col items-center justify-between h-dvh bg-vibe-black px-6 py-10 overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.12] animate-pulse"
          style={{ background: 'radial-gradient(circle, #8A2BE2, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.10] animate-pulse"
          style={{ background: 'radial-gradient(circle, #00FFFF, transparent 70%)', animationDelay: '1.5s' }}
        />
        <div
          className="absolute top-1/3 right-0 w-64 h-64 rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #ff6b9d, transparent 70%)' }}
        />
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(138,43,226,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(138,43,226,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Top: Logo + Branding */}
      <div className="flex flex-col items-center gap-4 mt-4 relative z-10 w-full">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-3xl blur-xl opacity-60"
            style={{ background: 'linear-gradient(135deg, #8A2BE2, #00FFFF)' }}
          />
          <img
            src="/assets/generated/vibestream-logo.dim_512x512.png"
            alt="VibeStream"
            className="relative w-20 h-20 rounded-3xl shadow-2xl"
          />
        </div>
        <div className="text-center">
          <h1 className="font-display text-5xl font-bold text-gradient-purple tracking-tight leading-none">
            VibeStream
          </h1>
          <p className="text-muted-foreground text-sm mt-2 tracking-wide">
            Your world. Your vibe. Unfiltered.
          </p>
        </div>
      </div>

      {/* Center: Feature Showcase */}
      <div className="flex flex-col items-center gap-6 relative z-10 w-full max-w-sm">
        {/* Animated feature card */}
        <div
          className="w-full glass-card rounded-3xl p-6 transition-all duration-300"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating ? 'translateY(8px)' : 'translateY(0)',
            borderColor: `${feature.color}30`,
            boxShadow: `0 0 40px ${feature.color}15`,
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: `${feature.color}20`, border: `1px solid ${feature.color}40` }}
            >
              <FeatureIcon size={22} style={{ color: feature.color }} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-white text-base">{feature.title}</h3>
              <p className="text-muted-foreground text-sm mt-0.5 leading-relaxed">{feature.desc}</p>
            </div>
          </div>
        </div>

        {/* Feature dots */}
        <div className="flex gap-2">
          {features.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveFeature(i)}
              className="transition-all duration-300 rounded-full"
              style={{
                width: i === activeFeature ? '24px' : '8px',
                height: '8px',
                background: i === activeFeature ? '#8A2BE2' : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {[
            { icon: Star, value: '10K+', label: 'Creators' },
            { icon: Video, value: '50K+', label: 'Videos' },
            { icon: Zap, value: '1M+', label: 'Vibes' },
          ].map((stat) => {
            const StatIcon = stat.icon;
            return (
              <div key={stat.label} className="glass-card rounded-2xl p-3 flex flex-col items-center gap-1">
                <StatIcon size={16} className="text-vibe-purple" />
                <span className="text-white font-bold text-sm font-display">{stat.value}</span>
                <span className="text-muted-foreground text-xs">{stat.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom: CTA */}
      <div className="flex flex-col items-center gap-4 relative z-10 w-full max-w-sm">
        <button
          onClick={login}
          disabled={isLoggingIn}
          className="w-full py-4 rounded-2xl font-display font-semibold text-base text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, #8A2BE2, #6a1fb5)',
            boxShadow: isLoggingIn ? 'none' : '0 0 40px rgba(138, 43, 226, 0.5), 0 4px 20px rgba(138, 43, 226, 0.3)',
          }}
        >
          <span
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'linear-gradient(135deg, #9d3ef5, #8A2BE2)' }}
          />
          <span className="relative flex items-center justify-center gap-2">
            {isLoggingIn ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Connecting securely...</span>
              </>
            ) : (
              <>
                <Zap size={18} />
                <span>Get Started — It's Free</span>
              </>
            )}
          </span>
        </button>

        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">Secure & Passwordless</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Sign in with your device's biometrics or PIN.{' '}
          <span className="text-white/60">No password needed.</span>
        </p>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center mt-2">
          Built with{' '}
          <span style={{ color: '#8A2BE2' }}>♥</span>
          {' '}using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || 'vibestream')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: '#00FFFF' }}
          >
            caffeine.ai
          </a>
          {' '}· © {new Date().getFullYear()} VibeStream
        </p>
      </div>
    </div>
  );
}
