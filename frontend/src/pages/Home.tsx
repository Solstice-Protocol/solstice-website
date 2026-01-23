import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Zap, Fingerprint, Check, ArrowRight, Sparkles,
  Terminal, Database, Cpu, Network, Key, Activity,
  Layers, Code, Globe, Users, Rocket, Lock, Eye,
  ChevronDown
} from 'lucide-react';
import '../fonts.css';

function Home() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [currentSection, setCurrentSection] = useState(0);
  const [stats, setStats] = useState({
    proofs: 0,
    users: 0,
    savings: 0
  });
  const [hasAnimated, setHasAnimated] = useState(false);
  const metricsRef = useRef(null);

  // Track mouse for parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  const [isScrolling, setIsScrolling] = useState(false);

  const sections = ['hero', 'problem', 'solution', 'technology', 'usecases', 'metrics'];

  // Number animation
  const animateNumber = (start: number, end: number, duration: number, key: string) => {
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(start + (end - start) * progress);
      setStats(prev => ({ ...prev, [key]: current }));
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };
    tick();
  };

  // Metrics animation on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            animateNumber(0, 1400000000, 2500, 'proofs');
            animateNumber(0, 100000, 2000, 'users');
            animateNumber(0, 5000, 1800, 'savings');
          }
        });
      },
      { threshold: 0.5 }
    );

    if (metricsRef.current) {
      observer.observe(metricsRef.current);
    }

    return () => {
      if (metricsRef.current) {
        observer.unobserve(metricsRef.current);
      }
    };
  }, [hasAnimated]);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-green-500/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6">
        <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-green-400 bg-clip-text text-transparent">
          SOLSTICE
        </div>
        <button
          onClick={() => navigate('/app')}
          className="px-6 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white hover:bg-white/20 transition-all duration-300"
        >
          Launch App
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        {/* Hero */}
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-light mb-6 leading-tight">
            <span className="block text-white mb-2">Zero-Knowledge</span>
            <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-green-400 bg-clip-text text-transparent animate-pulse">
              Identity Proofs
            </span>
            <span className="block text-white/80 text-3xl md:text-5xl mt-4">
              on Solana
            </span>
          </h1>

          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Prove your identity without revealing your data. Age, nationality, uniqueness — all verified through cryptography, not trust.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={() => navigate('/app')}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-green-600 text-white rounded-full font-semibold hover:from-purple-700 hover:to-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
            >
              Get Started
            </button>
            <button
              onClick={() => window.open('https://github.com/Shaurya2k06/SolsticeProtocol', '_blank')}
              className="px-8 py-4 bg-white/5 backdrop-blur-sm border border-white/20 rounded-full text-white hover:bg-white/10 transition-all duration-300"
            >
              View on GitHub
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Privacy First</h3>
            <p className="text-gray-400 text-sm">
              Your personal data stays private. Only cryptographic proofs are shared.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Zap className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
            <p className="text-gray-400 text-sm">
              Generate proofs in seconds, verify in milliseconds on Solana.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Lock className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Secure by Design</h3>
            <p className="text-gray-400 text-sm">
              Built on Groth16 SNARKs and government-verified credentials.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-gray-500 text-sm">
        <p>© 2025 Solstice Protocol. Built for the decentralized future.</p>
      </footer>

      <style>{`
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #9333ea, #22c55e);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #22c55e, #9333ea);
        }
      `}</style>
    </div>
  );
}

export default Home;