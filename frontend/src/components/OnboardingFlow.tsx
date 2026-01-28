import { useState, useRef, useEffect } from 'react';
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

type OnboardingStep = 'welcome' | 'wallet' | 'scan-method' | 'camera' | 'upload' | 'processing' | 'complete';

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
      // Skip welcome and wallet steps, go directly to scan-method
      setCurrentStep('scan-method');
    }
  }, [shouldSkipInitialSteps, wallet.connected, wallet.publicKey]);

  const ProgressDots = () => (
    <div className="flex justify-center gap-2 mb-12">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            index === getStepIndex()
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
    <div className="fixed inset-0 bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-xl px-6">
        <ProgressDots />

        {/* Wallet Connection Step */}
        {currentStep === 'wallet' && (
          <div className="text-center space-y-6">
            <h1 className="text-2xl font-light text-gray-100 mb-3">
              Connect your wallet
            </h1>
            <p className="text-gray-400 text-base">
              Link your Solana wallet to your identity
            </p>
            <div className="mt-8">
              {!wallet.connected ? (
                <WalletMultiButton className="!bg-gray-700 !text-gray-100 !font-normal hover:!bg-gray-600 !transition-colors !px-10 !py-3 !rounded-md" />
              ) : (
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-700 border border-gray-600 text-gray-100 rounded-md">
                  <span className="text-green-400">✓</span>
                  <span className="font-normal">
                    Wallet connected
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scan Method Selection */}
        {currentStep === 'scan-method' && (
          <div className="text-center space-y-6">
            <h1 className="text-2xl font-light text-gray-100 mb-3">
              Scan your Aadhaar QR code
            </h1>
            <p className="text-gray-400 text-base">
              Choose your preferred scanning method
            </p>

            {error && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="mt-8 space-y-3">
              <button
                onClick={() => setCurrentStep('camera')}
                className="w-full px-8 py-4 bg-gray-700 border border-gray-600 text-gray-100 hover:bg-gray-600 transition-all rounded-md font-normal"
              >
                Use camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-8 py-4 bg-gray-700 border border-gray-600 text-gray-100 hover:bg-gray-600 transition-all rounded-md font-normal"
              >
                Upload image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Camera Scanning */}
        {currentStep === 'camera' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-light text-gray-100">
                Scanning
              </h2>
              <p className="text-gray-400 text-sm mt-1">Position QR code in frame</p>
            </div>

            <div className="relative">
              <video
                ref={videoRef}
                className="w-full aspect-video bg-gray-900 rounded"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scanning Frame Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-4 border-white/60 rounded-lg relative">
                  <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-white"></div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-white"></div>
                  <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-white"></div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-white"></div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                stopCamera();
                setCurrentStep('scan-method');
              }}
              className="w-full px-8 py-3 bg-gray-700 border border-gray-600 text-gray-100 hover:bg-gray-600 transition-all rounded-md font-normal"
            >
              Back
            </button>
          </div>
        )}

        {/* Processing */}
        {(currentStep === 'processing' || currentStep === 'upload') && (
          <div className="text-center space-y-6">
            <div className="w-12 h-12 border-3 border-gray-600 border-t-gray-300 rounded-full animate-spin mx-auto"></div>
            <h1 className="text-xl font-light text-gray-100">
              Processing your identity
            </h1>
            <p className="text-gray-400 text-sm">
              Creating zero-knowledge proofs...
            </p>
          </div>
        )}

        {/* Complete */}
        {currentStep === 'complete' && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-green-500/10 border-2 border-green-500/60 rounded-full flex items-center justify-center text-green-400 text-3xl">
              ✓
            </div>
            <h1 className="text-2xl font-light text-gray-100">
              Identity verified
            </h1>
            <p className="text-gray-400 text-base">
              Your privacy-preserving identity is ready
            </p>

            <div className="mt-8 space-y-2 text-left max-w-sm mx-auto">
              <div className="flex items-center gap-3 text-gray-300 text-sm">
                <span className="text-green-400">✓</span>
                <span>Zero-knowledge proofs generated</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300 text-sm">
                <span className="text-green-400">✓</span>
                <span>Identity registered on Solana</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300 text-sm">
                <span className="text-green-400">✓</span>
                <span>Wallet permanently linked</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/status')}
              className="mt-8 px-10 py-3 bg-gray-700 text-gray-100 font-normal hover:bg-gray-600 transition-colors rounded-md"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
