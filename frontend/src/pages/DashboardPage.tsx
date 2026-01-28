import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useSolstice } from '../contexts/SolsticeContext';
import { IdentityStatus } from '../components/IdentityStatus';
import { ChallengeScanner } from '../components/ChallengeScanner';
import { ProofsDashboard } from '../components/ProofsDashboard';
import { User, Zap, CheckCircle } from 'lucide-react';

interface SectionProps {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
    delay?: number;
}

function Section({ id, title, description, icon: Icon, children, delay = 0 }: SectionProps) {
    return (
        <motion.section
            id={id}
            className="scroll-mt-24"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
        >
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-vintage-grape-900/40 border border-vintage-grape-500/30 hover:border-vintage-grape-400/50 transition-colors duration-300">
                        <Icon className="w-5 h-5 text-vintage-grape-300" />
                    </div>
                    <h2 className="text-2xl font-bold text-text-primary font-serif">{title}</h2>
                </div>
                <p className="text-text-secondary pl-12 font-futuristic font-light">{description}</p>
            </div>
            <div className="grid grid-cols-1 gap-6">
                {children}
            </div>
        </motion.section>
    );
}

export function DashboardPage() {
    const { identity, loading } = useSolstice();
    const statusRef = useRef<HTMLDivElement>(null);
    const challengeRef = useRef<HTMLDivElement>(null);
    const proofsRef = useRef<HTMLDivElement>(null);

    const sections = [
        { id: 'status', label: 'Identity Status', icon: User, ref: statusRef },
        { id: 'challenge', label: 'Scan Challenge', icon: Zap, ref: challengeRef },
        { id: 'proofs', label: 'My Proofs', icon: CheckCircle, ref: proofsRef },
    ];

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="space-y-12">
            {/* Quick Navigation Pills */}
            <motion.div
                className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 bg-primary/80 backdrop-blur-xl border-b border-white/5"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <nav className="flex gap-2 flex-wrap">
                    {sections.map((section, index) => {
                        const Icon = section.icon;
                        return (
                            <motion.button
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-futuristic font-light tracking-wide
                                    text-text-muted hover:text-text-primary hover:bg-white/5 
                                    border border-transparent hover:border-vintage-grape-500/30
                                    transition-all duration-300"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{section.label}</span>
                            </motion.button>
                        );
                    })}
                </nav>
            </motion.div>

            {/* Identity Status Section */}
            <div ref={statusRef}>
                <Section
                    id="status"
                    title="Identity Status"
                    description="View your registered identity details and verification status."
                    icon={User}
                    delay={0.2}
                >
                    <IdentityStatus identity={identity} loading={loading} expanded={true} />
                </Section>
            </div>

            {/* Divider */}
            <div className="border-t border-white/5" />

            {/* Scan Challenge Section */}
            <div ref={challengeRef}>
                <Section
                    id="challenge"
                    title="Scan Challenge"
                    description="Scan QR codes to respond to verification challenges."
                    icon={Zap}
                    delay={0.3}
                >
                    <ChallengeScanner />
                </Section>
            </div>

            {/* Divider */}
            <div className="border-t border-white/5" />

            {/* My Proofs Section */}
            <div ref={proofsRef}>
                <Section
                    id="proofs"
                    title="My Proofs"
                    description="View and manage your generated zero-knowledge proofs."
                    icon={CheckCircle}
                    delay={0.4}
                >
                    <ProofsDashboard />
                </Section>
            </div>
        </div>
    );
}

