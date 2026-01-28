import { motion } from 'framer-motion';
import { Shield, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Identity {
  walletAddress: string;
  isVerified: boolean;
  verificationTimestamp?: number;
  attributesVerified: number;
}

interface IdentityStatusProps {
  identity: Identity | null;
  loading: boolean;
  expanded?: boolean;
}

export function IdentityStatus({ identity, loading, expanded = false }: IdentityStatusProps) {
  const isAgeVerified = identity ? (identity.attributesVerified & 1) > 0 : false;
  const isNationalityVerified = identity ? (identity.attributesVerified & 2) > 0 : false;
  const isUniquenessVerified = identity ? (identity.attributesVerified & 4) > 0 : false;

  if (loading) {
    return (
      <div className="col-span-full bg-secondary/50 rounded-xl p-6 border border-border-custom animate-pulse">
        <div className="h-6 bg-tertiary rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-tertiary rounded w-2/3"></div>
      </div>
    );
  }

  if (!identity) {
    return (
      <motion.div
        className="col-span-full bg-secondary/50 rounded-xl p-6 border border-border-custom"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-text-muted" />
          <div>
            <h3 className="text-lg font-bold text-text-primary font-serif">No Identity Registered</h3>
            <p className="text-sm text-text-secondary font-futuristic">Scan your Aadhaar QR code to get started</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      {/* Main Status Card */}
      <motion.div
        className="col-span-full lg:col-span-1 bg-gradient-to-br from-vintage-grape-900/50 to-shadow-grey-900/50 rounded-xl p-6 border border-vintage-grape-700/50 hover:border-vintage-grape-500/70 transition-colors duration-300"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-4">
          {identity.isVerified ? (
            <CheckCircle className="w-8 h-8 text-green-400" />
          ) : (
            <Clock className="w-8 h-8 text-yellow-400" />
          )}
          <div>
            <h3 className="text-lg font-bold text-text-primary font-serif">
              {identity.isVerified ? 'Verified Identity' : 'Pending Verification'}
            </h3>
            <p className="text-sm text-text-secondary font-futuristic">
              {identity.isVerified ? 'Ready for authentication' : 'Complete attribute verification'}
            </p>
          </div>
        </div>

        {identity.verificationTimestamp && (
          <p className="text-xs text-text-muted font-futuristic">
            Verified: {new Date(identity.verificationTimestamp * 1000).toLocaleDateString()}
          </p>
        )}
      </motion.div>

      {/* Attribute Cards */}
      <AttributeCard
        title="Age Verified"
        verified={isAgeVerified}
        description="Age range proof completed"
      />
      <AttributeCard
        title="Nationality Verified"
        verified={isNationalityVerified}
        description="Nationality verification completed"
      />
      <AttributeCard
        title="Uniqueness Verified"
        verified={isUniquenessVerified}
        description="Sybil resistance confirmed"
      />

      {/* Expanded Details */}
      {expanded && (
        <div className="col-span-full bg-secondary/50 rounded-xl p-6 border border-border-custom space-y-4">
          <h3 className="text-xl font-bold text-text-primary mb-4 font-serif">Identity Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailItem label="Wallet Address" value={identity.walletAddress} mono />
            <DetailItem label="Verification Status" value={identity.isVerified ? 'Verified' : 'Pending'} />
            <DetailItem
              label="Attributes Bitmap"
              value={`0b${identity.attributesVerified.toString(2).padStart(8, '0')}`}
              mono
            />
            {identity.verificationTimestamp && (
              <DetailItem
                label="Timestamp"
                value={new Date(identity.verificationTimestamp * 1000).toLocaleString()}
              />
            )}
          </div>

          <div className="pt-4 border-t border-border-custom">
            <h4 className="text-sm font-semibold text-text-secondary mb-2 font-serif">Verification Breakdown</h4>
            <div className="flex gap-4 text-sm">
              <VerificationBadge label="Age" verified={isAgeVerified} />
              <VerificationBadge label="Nationality" verified={isNationalityVerified} />
              <VerificationBadge label="Uniqueness" verified={isUniquenessVerified} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AttributeCard({ title, verified, description }: { title: string; verified: boolean; description: string }) {
  return (
    <motion.div
      className="bg-secondary/50 rounded-xl p-6 border border-border-custom hover:border-vintage-grape-500/30 transition-colors duration-300"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center gap-3 mb-2">
        {verified ? (
          <CheckCircle className="w-6 h-6 text-green-400" />
        ) : (
          <XCircle className="w-6 h-6 text-text-muted" />
        )}
        <h3 className="font-semibold text-text-primary font-serif">{title}</h3>
      </div>
      <p className="text-sm text-text-secondary font-futuristic font-light">{description}</p>
    </motion.div>
  );
}

function DetailItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={`text-sm text-text-primary ${mono ? 'font-mono break-all' : ''}`}>{value}</p>
    </div>
  );
}

function VerificationBadge({ label, verified }: { label: string; verified: boolean }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${verified ? 'bg-green-900/30 text-green-300 border border-green-700/50' : 'bg-tertiary/50 text-text-muted border border-border-custom'
      }`}>
      {label}: {verified ? '' : ''}
    </span>
  );
}
