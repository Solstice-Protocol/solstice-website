import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function Header() {
  return (
    <header className="border-b border-white/5 bg-primary/60 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <img
              src="/loaderlogo.png"
              alt="Solstice"
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-xl font-bold text-text-primary font-serif">Solstice Protocol</h1>
          </div>

          <WalletMultiButton className="!bg-vintage-grape-600 hover:!bg-vintage-grape-700 !font-futuristic !rounded-lg !transition-all !duration-300 hover:!shadow-lg hover:!shadow-vintage-grape-500/20 !text-sm !px-4 !py-2" />
        </div>
      </div>
    </header>
  );
}
