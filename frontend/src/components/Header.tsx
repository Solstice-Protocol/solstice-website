import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Shield } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-white/5 bg-primary/40 backdrop-blur-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-vintage-grape-900/50 border border-vintage-grape-700/30 rounded-lg">
              <Shield className="w-6 h-6 text-vintage-grape-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary font-serif">Solstice Protocol</h1>
              <p className="text-sm text-text-secondary font-sans">Zero-Knowledge Identity Verification</p>
            </div>
          </div>

          <WalletMultiButton className="!bg-vintage-grape-600 hover:!bg-vintage-grape-700 !font-serif !rounded-lg transiton-colors duration-200" />
        </div>
      </div>
    </header>
  );
}
