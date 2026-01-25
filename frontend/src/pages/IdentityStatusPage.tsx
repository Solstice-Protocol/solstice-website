import { useSolstice } from '../contexts/SolsticeContext';
import { IdentityStatus } from '../components/IdentityStatus';

export function IdentityStatusPage() {
    const { identity, loading } = useSolstice();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2 font-serif">Identity Status</h2>
                <p className="text-text-secondary">
                    View your registered identity details and verification status.
                </p>
            </div>
            <div className="grid grid-cols-1 gap-6">
                <IdentityStatus identity={identity} loading={loading} expanded={true} />
            </div>
        </div>
    );
}
