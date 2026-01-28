import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useNavigate, useSearchParams } from 'react-router-dom';
import jsQR from 'jsqr';
import { useSolstice } from '../contexts/SolsticeContext';
import { generateAllProofs, storeProofs } from '../lib/proofGenerator';
import { parseAadhaarQR } from '../lib/aadhaarParser';
import { generateIdentityCommitment } from '../lib/crypto';
import {
  isOnboardingComplete,
  recordOnboardingCompletion,
  linkAadhaarToWallet,
  verifyAadhaarWalletLink
} from '../lib/onboarding';

type OnboardingStep = 'wallet' | 'scan-method' | 'camera' | 'upload' | 'processing' | 'complete';

export function OnboardingFlow() {
  const wallet = useWallet();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { fetchIdentity, registerIdentity } = useSolstice();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('wallet');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check if we should skip initial steps (coming from main website with wallet connected)
  const shouldSkipInitialSteps = searchParams.get('skip') === 'true';

  // Progress dots based on major steps
  const getStepIndex = (): number => {
    switch (currentStep) {
      case 'wallet': return 0;
      case 'scan-method':
      case 'camera':
      case 'upload': return 1;
      case 'processing': return 2;
      case 'complete': return 3;
      default: return 0;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        streamRef.current = stream;
        scanQRCode();
      }
    } catch {
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const scanQRCode = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const scan = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA && currentStep === 'camera') {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          handleQRScan(code.data);
          return;
        }
      }
      requestAnimationFrame(scan);
    };
    scan();
  };

  const handleQRScan = async (qrData: string) => {
    try {
      stopCamera();
      setCurrentStep('processing');
      setError(null);

      if (!wallet.publicKey) {
        setError('Please connect your wallet first');
        setCurrentStep('wallet');
        return;
      }

      console.log('📱 Processing Aadhaar QR code...');

      // Extract Aadhaar hash early for verification
      const aadhaarHash = qrData.substring(0, 12);

      // Check if this Aadhaar is already linked to another wallet
      const linkCheck = verifyAadhaarWalletLink(aadhaarHash, wallet.publicKey.toString());

      if (!linkCheck.valid) {
        setError(linkCheck.message + ' Please use a different Aadhaar or reconnect with the linked wallet.');
        setCurrentStep('scan-method');
        return;
      }

      // If Aadhaar is already linked to current wallet, skip onboarding
      if (linkCheck.linkedWallet === wallet.publicKey.toString()) {
        console.log('ℹ️ This Aadhaar is already linked to your wallet. Redirecting to status page...');
        navigate('/status');
        return;
      }

      const parsedData = await parseAadhaarQR(qrData);

      if (!parsedData) {
        throw new Error('Invalid Aadhaar QR code');
      }

      console.log('✅ Aadhaar data parsed');

      const nationality = 'IN';
      const nonce = qrData.substring(qrData.length - 32);

      const proofInputs = {
        dateOfBirth: parsedData.dateOfBirth.split('/').reverse().join(''),
        nationality,
        aadhaarNumber: aadhaarHash,
        nonce
      };

      console.log('⚙️ Generating ZK proofs...');
      const proofResults = await generateAllProofs(proofInputs);

      if (proofResults.errors.length > 0) {
        throw new Error(`Proof generation errors: ${proofResults.errors.join(', ')}`);
      }

      const proofsToStore = {
        age: proofResults.ageProof || undefined,
        nationality: proofResults.nationalityProof || undefined,
        uniqueness: proofResults.uniquenessProof || undefined
      };

      console.log('✅ All proofs generated');

      await storeProofs(wallet.publicKey.toString(), proofsToStore);
      console.log('💾 Proofs stored locally');

      console.log('🔐 Generating commitment...');
      const commitment = await generateIdentityCommitment({
        name: parsedData.name,
        dateOfBirth: parsedData.dateOfBirth,
        gender: parsedData.gender,
        address: parsedData.address
      });

      console.log('⛓️ Registering identity on-chain...');
      const merkleRoot = 'mock-merkle-root';
      const success = await registerIdentity(commitment, merkleRoot);

      if (success) {
        console.log('✅ Registration complete!');

        recordOnboardingCompletion(wallet.publicKey.toString());
        linkAadhaarToWallet(aadhaarHash, wallet.publicKey.toString());

        setCurrentStep('complete');
      } else {
        throw new Error('Failed to register identity');
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error during onboarding:', error);
      setError(error.message || 'Failed to process QR code');
      setCurrentStep('scan-method');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCurrentStep('upload');
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const context = canvas.getContext('2d');

          if (!context) {
            setError('Failed to process image');
            setCurrentStep('scan-method');
            return;
          }

          context.drawImage(img, 0, 0);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code && code.data) {
            await handleQRScan(code.data);
          } else {
            setError('No QR code found in image');
            setCurrentStep('scan-method');
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch {
      setError('Failed to read file');
      setCurrentStep('scan-method');
    }
  };

  useEffect(() => {
    if (currentStep === 'camera') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [currentStep]);

  useEffect(() => {
    if (wallet.connected && currentStep === 'wallet') {
      setTimeout(() => setCurrentStep('scan-method'), 800);
    }
  }, [wallet.connected, currentStep]);

  // Check if user has already completed onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (wallet.publicKey) {
        const onboardedLocally = isOnboardingComplete(wallet.publicKey.toString());
        if (onboardedLocally) {
          navigate('/status');
        }
        await fetchIdentity(wallet.publicKey.toString());
      }
    };

    checkOnboarding();
  }, [wallet.publicKey, fetchIdentity, navigate]);

  // Handle skip parameter - if coming from main website with wallet already connected
  useEffect(() => {
    if (shouldSkipInitialSteps && wallet.connected && wallet.publicKey) {
      // Skip wallet step, go directly to scan-method
      setCurrentStep('scan-method');
    }
  }, [shouldSkipInitialSteps, wallet.connected, wallet.publicKey]);

  const ProgressDots = () => (
    <div className="flex justify-center gap-2 mb-12">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className={`w-2 h-2 rounded-full transition-all duration-300 ${index === getStepIndex()
              ? 'bg-white w-8'
              : index < getStepIndex()
                ? 'bg-white/60'
                : 'bg-white/20'
            }`}
        />
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-primary flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-xl px-6">
        <ProgressDots />

        {/* Wallet Connection Step */}
        {currentStep === 'wallet' && (
          <motion.div
            className="text-center space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl font-serif font-light text-text-primary mb-3">
              Connect your wallet
            </h1>
            <p className="text-text-secondary font-futuristic text-base">
              Link your Solana wallet to your identity
            </p>
            <div className="mt-8">
              {!wallet.connected ? (
                <WalletMultiButton className="!bg-vintage-grape-700 !text-text-primary !font-futuristic hover:!bg-vintage-grape-600 !transition-all !duration-300 !px-10 !py-3 !rounded-lg hover:!shadow-lg hover:!shadow-vintage-grape-500/20" />
              ) : (
                <motion.div
                  className="inline-flex items-center gap-3 px-6 py-3 bg-vintage-grape-800/50 border border-vintage-grape-600/50 text-text-primary rounded-lg"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="text-green-400">✓</span>
                  <span className="font-futuristic">Wallet connected</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Scan Method Selection */}
        {currentStep === 'scan-method' && (
          <motion.div
            className="text-center space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl font-serif font-light text-text-primary mb-3">
              Scan your Aadhaar QR code
            </h1>
            <p className="text-text-secondary font-futuristic text-base">
              Choose your preferred scanning method
            </p>

            {error && (
              <motion.div
                className="bg-red-900/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm font-futuristic"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {error}
              </motion.div>
            )}

            <div className="mt-8 space-y-3">
              <motion.button
                onClick={() => setCurrentStep('camera')}
                className="w-full px-8 py-4 bg-vintage-grape-800/50 border border-vintage-grape-600/50 text-text-primary hover:bg-vintage-grape-700/50 hover:border-vintage-grape-500/50 transition-all duration-300 rounded-lg font-futuristic"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Use camera
              </motion.button>
              <motion.button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-8 py-4 bg-vintage-grape-800/50 border border-vintage-grape-600/50 text-text-primary hover:bg-vintage-grape-700/50 hover:border-vintage-grape-500/50 transition-all duration-300 rounded-lg font-futuristic"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Upload image
              </motion.button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </motion.div>
        )}

        {/* Camera Scanning */}
        {currentStep === 'camera' && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-serif font-light text-text-primary">
                Scanning
              </h2>
              <p className="text-text-secondary text-sm mt-1 font-futuristic">Position QR code in frame</p>
            </div>

            <div className="relative">
              <video
                ref={videoRef}
                className="w-full aspect-video bg-secondary rounded-lg"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning Frame Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-4 border-vintage-grape-400/60 rounded-lg relative">
                  <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-vintage-grape-400"></div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-vintage-grape-400"></div>
                  <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-vintage-grape-400"></div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-vintage-grape-400"></div>
                </div>
              </div>
            </div>

            <motion.button
              onClick={() => {
                stopCamera();
                setCurrentStep('scan-method');
              }}
              className="w-full px-8 py-3 bg-vintage-grape-800/50 border border-vintage-grape-600/50 text-text-primary hover:bg-vintage-grape-700/50 transition-all duration-300 rounded-lg font-futuristic"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Back
            </motion.button>
          </motion.div>
        )}

        {/* Processing */}
        {(currentStep === 'processing' || currentStep === 'upload') && (
          <motion.div
            className="text-center space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-12 h-12 border-3 border-vintage-grape-700 border-t-vintage-grape-400 rounded-full animate-spin mx-auto"></div>
            <h1 className="text-xl font-serif font-light text-text-primary">
              Processing your identity
            </h1>
            <p className="text-text-secondary text-sm font-futuristic">
              Creating zero-knowledge proofs...
            </p>
          </motion.div>
        )}

        {/* Complete */}
        {currentStep === 'complete' && (
          <motion.div
            className="text-center space-y-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="w-16 h-16 mx-auto bg-green-500/10 border-2 border-green-500/60 rounded-full flex items-center justify-center text-green-400 text-3xl"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              ✓
            </motion.div>
            <h1 className="text-2xl font-serif font-light text-text-primary">
              Identity verified
            </h1>
            <p className="text-text-secondary text-base font-futuristic">
              Your privacy-preserving identity is ready
            </p>

            <div className="mt-8 space-y-2 text-left max-w-sm mx-auto">
              <motion.div
                className="flex items-center gap-3 text-text-secondary text-sm font-futuristic"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <span className="text-green-400">✓</span>
                <span>Zero-knowledge proofs generated</span>
              </motion.div>
              <motion.div
                className="flex items-center gap-3 text-text-secondary text-sm font-futuristic"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <span className="text-green-400">✓</span>
                <span>Identity registered on Solana</span>
              </motion.div>
              <motion.div
                className="flex items-center gap-3 text-text-secondary text-sm font-futuristic"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <span className="text-green-400">✓</span>
                <span>Wallet permanently linked</span>
              </motion.div>
            </div>

            <motion.button
              onClick={() => navigate('/status')}
              className="mt-8 px-10 py-3 bg-vintage-grape-600 text-text-primary font-futuristic hover:bg-vintage-grape-500 transition-all duration-300 rounded-lg hover:shadow-lg hover:shadow-vintage-grape-500/20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Continue
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
