import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { Header } from './Header';
import { ColoredGridBackground } from './ColoredGridBackground';

export function Layout() {
    const wallet = useWallet();

    // Redirect to landing page when wallet disconnects
    useEffect(() => {
        if (!wallet.connected && wallet.disconnecting) {
            window.location.href = 'https://solsticeprotocol.dev';
        }
    }, [wallet.connected, wallet.disconnecting]);

    return (
        <div className="min-h-screen bg-primary text-text-primary font-serif selection:bg-vintage-grape-700 selection:text-stone-brown-50">
            {/* Interactive Colored Grid Background */}
            <ColoredGridBackground />

            {/* Main Content Area */}
            <main className="min-h-screen overflow-y-auto relative flex flex-col">

                {/* Background Elements (Subtle) */}
                <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-10">
                    <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-vintage-grape-800/30 blur-[100px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-stone-brown-800/20 blur-[100px]" />
                </div>

                {/* Header - Sticky within the main content area */}
                <div className="sticky top-0 z-20 w-full">
                    <Header />
                </div>

                {/* Page Content (Nested Routes) */}
                <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
                    <Outlet />
                </div>

                {/* Footer - Internal App Footer */}
                <footer className="relative z-10 border-t border-white/5 mt-auto bg-primary/60 backdrop-blur-sm">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex justify-between items-center text-xs text-text-muted font-futuristic tracking-wide">
                            <p className="font-light">Solstice Protocol App</p>
                            <div className="flex gap-4">
                                <span className="hover:text-text-secondary transition-colors cursor-pointer">Privacy</span>
                                <span className="hover:text-text-secondary transition-colors cursor-pointer">Terms</span>
                            </div>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}

