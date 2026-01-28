import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Shield, CheckCircle, User, Zap } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(false);
    const [activeSection, setActiveSection] = useState('status');

    // Check if current screen is mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Track active section based on scroll position
    useEffect(() => {
        const handleScroll = () => {
            const sections = ['status', 'challenge', 'proofs'];
            const scrollPosition = window.scrollY + 200;

            for (const sectionId of sections) {
                const element = document.getElementById(sectionId);
                if (element) {
                    const offsetTop = element.offsetTop;
                    const offsetHeight = element.offsetHeight;
                    if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
                        setActiveSection(sectionId);
                        break;
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, []);

    const navItems = [
        { id: 'status', label: 'Identity Status', icon: User },
        { id: 'challenge', label: 'Scan Challenge', icon: Zap },
        { id: 'proofs', label: 'My Proofs', icon: CheckCircle },
    ];

    const handleNavClick = (sectionId: string) => {
        // Ensure we're on the dashboard page
        if (location.pathname !== '/dashboard') {
            navigate('/dashboard');
            // Wait for navigation, then scroll
            setTimeout(() => {
                const element = document.getElementById(sectionId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        } else {
            const element = document.getElementById(sectionId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        // Close sidebar on mobile after clicking
        if (isMobile) {
            onClose();
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isMobile && isOpen && (
                <div
                    className="fixed inset-0 bg-primary/80 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed top-0 left-0 h-full w-72 bg-primary/20 backdrop-blur-xl border-r border-white/5 z-50
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
        `}
            >
                <div className="flex flex-col h-full font-serif">
                    {/* Header */}
                    <div className="flex items-center justify-between p-8 pb-4">
                        <div>
                            <button onClick={() => handleNavClick('status')} className="block">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-vintage-grape-400" />
                                    <h2 className="text-sm font-light tracking-widest text-text-primary uppercase opacity-90 hover:opacity-100 transition-opacity">Solstice App</h2>
                                </div>
                            </button>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] text-text-muted uppercase tracking-widest font-light pl-7">v1.0.0</span>
                            </div>
                        </div>
                        {isMobile && (
                            <button
                                onClick={onClose}
                                className="lg:hidden text-text-muted hover:text-text-primary transition-colors"
                                aria-label="Close navigation"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Navigation Links - Centered Vertically */}
                    <nav className="flex-1 flex flex-col justify-center overflow-y-auto px-6 py-4 custom-scrollbar">
                        <ul className="space-y-4">
                            {navItems.map((item) => {
                                const active = activeSection === item.id;
                                const Icon = item.icon;

                                return (
                                    <li key={item.id}>
                                        <button
                                            onClick={() => handleNavClick(item.id)}
                                            className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group
                        ${active
                                                    ? 'bg-vintage-grape-900/40 text-vintage-grape-200 border border-vintage-grape-500/30'
                                                    : 'text-text-muted hover:text-text-primary hover:bg-white/5 border border-transparent'
                                                }
                      `}
                                        >
                                            <Icon className={`w-4 h-4 ${active ? 'text-vintage-grape-300' : 'text-text-muted group-hover:text-text-primary'} transition-colors`} />
                                            <span className="tracking-wide font-light text-sm">{item.label}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {/* Footer */}
                    <div className="p-8 pt-4 border-t border-white/5 mx-6">
                        <div className="flex flex-col gap-1 opacity-40 hover:opacity-80 transition-opacity">
                            <p className="text-[10px] text-text-muted tracking-widest uppercase font-light">Protected by</p>
                            <p className="text-xs text-text-secondary font-serif">ZK-SNARKs</p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-secondary/80 backdrop-blur-md border border-white/10 rounded-lg text-text-primary hover:bg-white/5 transition-colors"
            aria-label="Open navigation menu"
        >
            <div className="space-y-1.5">
                <span className="block w-5 h-0.5 bg-current"></span>
                <span className="block w-4 h-0.5 bg-current"></span>
                <span className="block w-3 h-0.5 bg-current"></span>
            </div>
        </button>
    );
}

