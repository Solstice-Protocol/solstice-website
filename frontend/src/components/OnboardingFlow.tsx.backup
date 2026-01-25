import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useSolstice } from '../contexts/SolsticeContext';
import { CheckCircle, Loader, Shield, QrCode, ChevronRight, AlertCircle, Camera, Upload, X } from 'lucide-react';
import jsQR from 'jsqr';
import { generateAllProofs, storeProofs } from '../lib/proofGenerator';
import { parseAadhaarQR } from '../lib/aadhaarParser';
import { 
  isOnboardingComplete, 
  recordOnboardingCompletion, 
  linkAadhaarToWallet,
  verifyAadhaarWalletLink 
} from '../lib/onboarding';

type OnboardingStep = 'wallet' | 'verify' | 'complete';

export function OnboardingFlow() {
  const navigate = useNavigate();
  const wallet = useWallet();
  const { identity, fetchIdentity, registerIdentity, parseQRCode } = useSolstice();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('wallet');
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aadhaarData, setAadhaarData] = useState<any>(null);
  const [scanMethod, setScanMethod] = useState<'camera' | 'upload' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check if user has already completed onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (wallet.publicKey) {
        const onboardedLocally = isOnboardingComplete(wallet.publicKey.toString());
        await fetchIdentity(wallet.publicKey.toString());
      }
    };

    checkOnboarding();
  }, [wallet.publicKey, fetchIdentity]);

  // Auto-advance steps
  useEffect(() => {
    if (wallet.connected && wallet.publicKey && currentStep === 'wallet') {
      const onboarded = isOnboardingComplete(wallet.publicKey.toString());
      if (onboarded && identity) {
        navigate('/status');
      } else {
        setCurrentStep('verify');
      }
    }
  }, [wallet.connected, wallet.publicKey, currentStep, identity, navigate]);

  const handleQRScan = async (qrData: string) => {
    if (processing) return;
    
    setProcessing(true);
    setError(null);
    setScanMethod(null);
    setScanning(false);

    try {
      console.log('📱 Processing Aadhaar QR code...');
      
      const parsedData = await parseAadhaarQR(qrData);
      
      if (!parsedData) {
        throw new Error('Invalid Aadhaar QR code');
      }

      setAadhaarData(parsedData);
      console.log(' Aadhaar data parsed');

      const nationality = 'IN';
      const aadhaarHash = qrData.substring(0, 12);
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
      
      console.log(' All proofs generated');

      await storeProofs(wallet.publicKey!.toString(), proofsToStore);
      console.log('💾 Proofs stored locally');

      console.log(' Generating commitment...');
      const { commitment } = await parseQRCode(qrData);

      console.log('⛓️ Registering identity on-chain...');
      const merkleRoot = 'mock-merkle-root';
      const success = await registerIdentity(commitment, merkleRoot);

      if (success) {
        console.log(' Registration complete!');
        
        recordOnboardingCompletion(wallet.publicKey!.toString());
        linkAadhaarToWallet(aadhaarHash, wallet.publicKey!.toString());
        
        setCurrentStep('complete');
      } else {
        throw new Error('Failed to register identity');
      }
    } catch (err: any) {
      console.error('Error during onboarding:', err);
      setError(err.message || 'Failed to process QR code');
      setScanning(false);
    } finally {
      setProcessing(false);
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
        scanFromCamera();
      }
    } catch (err: any) {
      setError('Camera access denied. Please allow camera access or upload an image.');
      console.error('Camera error:', err);
    }
  };

  const scanFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const scan = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          stopCamera();
          handleQRScan(code.data);
          return;
        }
      }

      animationFrameRef.current = requestAnimationFrame(scan);
    };

    scan();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
            return;
          }

          context.drawImage(img, 0, 0);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code && code.data) {
            await handleQRScan(code.data);
          } else {
            setError('No QR code found in image. Please try again with a clearer image.');
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError('Failed to read file. Please try again.');
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (scanMethod === 'camera') {
      startCamera();
    }
    return () => {
      if (scanMethod === 'camera') {
        stopCamera();
      }
    };
  }, [scanMethod]);

  const handleComplete = () => {
    navigate('/status');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-vintage-grape-950 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            {(['wallet', 'verify', 'complete'] as const).map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                  currentStep === step 
                    ? 'bg-vintage-grape-600 border-vintage-grape-400 text-white' 
                    : index < ['wallet', 'verify', 'complete'].indexOf(currentStep)
                      ? 'bg-vintage-grape-600/50 border-vintage-grape-500 text-white'
                      : 'bg-black border-white/20 text-gray-500'
                }`}>
                  {index + 1}
                </div>
                {index < 2 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    index < ['wallet', 'verify', 'complete'].indexOf(currentStep)
                      ? 'bg-vintage-grape-600'
                      : 'bg-white/20'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-16 mt-4">
            <span className="text-sm text-white font-medium">Connect Wallet</span>
            <span className="text-sm text-white font-medium">Verify Identity</span>
            <span className="text-sm text-white font-medium">Complete</span>
          </div>
        </div>

        {/* Main Content Card (Styled like eth-delhi) */}
        <div className="bg-gradient-to-br from-vintage-grape-900/50 to-stone-brown-900/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 md:p-12">
          {currentStep === 'wallet' && (
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-vintage-grape-600/30 rounded-full mb-4">
                  <Shield className="w-10 h-10 text-vintage-grape-400" />
                </div>
                <h2 className="text-4xl font-bold text-white font-serif">
                  Welcome to Solstice
                </h2>
                <p className="text-lg text-gray-300 max-w-xl mx-auto">
                  Connect your Solana wallet to begin your identity verification journey
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                {!wallet.connected ? (
                  <WalletMultiButton className="!bg-vintage-grape-600 hover:!bg-vintage-grape-700 !font-serif !rounded-lg !text-lg !px-8 !py-4" />
                ) : (
                  <div className="flex items-center gap-3 bg-black/40 px-6 py-4 rounded-lg border border-white/10">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <span className="text-white font-medium">Wallet Connected</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 'verify' && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-vintage-grape-600/30 rounded-full mb-4">
                  <QrCode className="w-10 h-10 text-vintage-grape-400" />
                </div>
                <h2 className="text-4xl font-bold text-white font-serif">
                  Verify Your Identity
                </h2>
                <p className="text-lg text-gray-300 max-w-xl mx-auto">
                  Scan your Aadhaar QR code to create your privacy-preserving identity
                </p>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {processing ? (
                <div className="text-center py-12">
                  <Loader className="w-12 h-12 animate-spin text-vintage-grape-400 mx-auto mb-4" />
                  <p className="text-white font-medium">Processing your identity...</p>
                  <p className="text-sm text-gray-400 mt-2">This may take a moment</p>
                </div>
              ) : scanning ? (
                <div className="space-y-6">
                  {!scanMethod ? (
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-white text-center mb-6">
                        Choose Scan Method
                      </h3>
                      
                      <button
                        onClick={() => {
                          setScanMethod('camera');
                          setError(null);
                        }}
                        className="w-full bg-black border-2 border-white/20 hover:border-white/40 text-white px-8 py-6 rounded-lg transition-all duration-200 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-vintage-grape-600/30 rounded-lg flex items-center justify-center group-hover:bg-vintage-grape-600/50 transition-colors">
                            <Camera className="w-6 h-6 text-vintage-grape-400" />
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-lg">Use Camera</div>
                            <div className="text-sm text-gray-400">Scan QR code live</div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                      </button>

                      <button
                        onClick={() => {
                          setScanMethod('upload');
                          setError(null);
                          fileInputRef.current?.click();
                        }}
                        className="w-full bg-black border-2 border-white/20 hover:border-white/40 text-white px-8 py-6 rounded-lg transition-all duration-200 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-vintage-grape-600/30 rounded-lg flex items-center justify-center group-hover:bg-vintage-grape-600/50 transition-colors">
                            <Upload className="w-6 h-6 text-vintage-grape-400" />
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-lg">Upload Image</div>
                            <div className="text-sm text-gray-400">Select QR image from device</div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />

                      <button
                        onClick={() => setScanning(false)}
                        className="w-full text-gray-400 hover:text-white transition-colors text-sm py-3"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : scanMethod === 'camera' ? (
                    <div className="relative">
                      <div className="bg-black rounded-xl overflow-hidden border-2 border-white/20">
                        <div className="relative aspect-video bg-gray-900">
                          <video
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            playsInline
                            muted
                          />
                          <canvas ref={canvasRef} className="hidden" />
                          
                          {/* Scanning overlay */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-64 h-64 border-4 border-vintage-grape-500 rounded-2xl relative animate-pulse">
                              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                            </div>
                          </div>

                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                            <p className="text-white text-center text-sm">
                              Position the QR code within the frame
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => {
                            stopCamera();
                            setScanMethod(null);
                          }}
                          className="flex-1 bg-black border-2 border-white/20 hover:border-white/40 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => {
                            stopCamera();
                            setScanning(false);
                            setScanMethod(null);
                          }}
                          className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Loader className="w-12 h-12 animate-spin text-vintage-grape-400 mx-auto mb-4" />
                      <p className="text-gray-300">Processing image...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-center">
                  <button
                    onClick={() => setScanning(true)}
                    className="bg-vintage-grape-600 hover:bg-vintage-grape-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl"
                  >
                    <QrCode className="w-6 h-6" />
                    Scan Aadhaar QR Code
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600/30 rounded-full mb-4 animate-bounce">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-4xl font-bold text-white font-serif">
                  Identity Verified!
                </h2>
                <p className="text-lg text-gray-300 max-w-xl mx-auto">
                  Your privacy-preserving identity has been successfully created
                </p>
              </div>

              <div className="bg-vintage-grape-900/40 border border-vintage-grape-600/30 rounded-lg p-6 space-y-3">
                <div className="flex items-center gap-3 text-white">
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                  <span>Zero-knowledge proofs generated</span>
                </div>
                <div className="flex items-center gap-3 text-white">
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                  <span>Identity registered on Solana</span>
                </div>
                <div className="flex items-center gap-3 text-white">
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                  <span>Wallet permanently linked</span>
                </div>
              </div>

              <button
                onClick={handleComplete}
                className="bg-vintage-grape-600 hover:bg-vintage-grape-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center gap-3 mx-auto shadow-lg hover:shadow-xl"
              >
                Continue to Dashboard
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-400 text-sm">
          <p>Your privacy is protected. All data is processed securely.</p>
        </div>
      </div>
    </div>
  );
}
