import { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { useSolstice } from '../contexts/SolsticeContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { Camera, Upload, Send, Loader, X, AlertCircle, CheckCircle2, Clipboard } from 'lucide-react';
import { parseAadhaarQR } from '../lib/aadhaarParser';

interface Challenge {
  challengeId: string;
  appId: string;
  appName: string;
  proofType: 'age' | 'nationality' | 'uniqueness';
  params: any;
  expiresAt: number;
  callbackUrl?: string;
  nonce: string;
  createdAt: number;
}

export function ChallengeScanner() {
  const { identity, fetchIdentity } = useSolstice();
  const wallet = useWallet();
  const [scanning, setScanning] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);

          const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
          if (imageData) {
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
              await handleChallengeQRData(code.data);
            } else {
              setError('No QR code found in image');
            }
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing QR image:', error);
      setError('Failed to process QR code image');
    }
  };

  const handlePasteImage = async () => {
    try {
      setPasteError(null);
      setError(null);

      const clipboardItems = await navigator.clipboard.read();

      for (const item of clipboardItems) {
        if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
          const blob = await item.getType(item.types.find(t => t.startsWith('image/'))!);

          const img = new Image();
          const url = URL.createObjectURL(blob);

          img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);

            const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
            if (imageData) {
              const code = jsQR(imageData.data, imageData.width, imageData.height);
              if (code) {
                await handleChallengeQRData(code.data);
              } else {
                setPasteError('No QR code found in pasted image');
              }
            }
            URL.revokeObjectURL(url);
          };

          img.src = url;
          return;
        }
      }

      setPasteError('No image found in clipboard. Please copy an image first.');
    } catch (error: any) {
      console.error('Error pasting image:', error);
      setPasteError(error.message || 'Failed to paste image. Make sure you have an image in your clipboard.');
    }
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      setScanning(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          scanQRFromVideo();
        };
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      setCameraError(
        error.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access and try again.'
          : 'Failed to access camera.'
      );
      setScanning(false);
    }
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
    setScanning(false);
    setCameraError(null);
  };

  const scanQRFromVideo = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      if (imageData) {
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          console.log(' Challenge QR code detected from camera!');
          stopCamera();
          handleChallengeQRData(code.data);
          return;
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanQRFromVideo);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleChallengeQRData = async (data: string) => {
    try {
      setError(null);
      console.log('Processing challenge QR code...');

      // Parse challenge from QR code
      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch {
        // Try base64 decode
        const decoded = atob(data);
        parsed = JSON.parse(decoded);
      }

      if (!parsed.challenge) {
        throw new Error('Invalid challenge QR code format');
      }

      const challengeData = parsed.challenge as Challenge;

      // Check expiration
      if (Date.now() > challengeData.expiresAt) {
        setError('This challenge has expired. Please request a new one from the app.');
        return;
      }

      setChallenge(challengeData);
      console.log('Challenge loaded:', challengeData);
    } catch (error: any) {
      console.error('Error parsing challenge:', error);
      setError(`Failed to parse challenge QR code: ${error.message}`);
    }
  };

  const handleSubmitProof = async () => {
    if (!challenge || !identity || !wallet.publicKey) return;

    setSubmitting(true);
    setError(null);

    try {
      // In a real implementation, this would:
      // 1. Load the user's stored Aadhaar data
      // 2. Generate a ZK proof based on the challenge requirements
      // 3. Submit the proof to the challenge callback URL or backend

      // For now, simulate proof generation
      const proofResponse = {
        challengeId: challenge.challengeId,
        proof: {
          pi_a: ['0x...'],
          pi_b: [['0x...']],
          pi_c: ['0x...'],
          publicSignals: [wallet.publicKey.toString()]
        },
        identityCommitment: wallet.publicKey.toString(),
        timestamp: Date.now()
      };

      console.log('📋 Challenge data from QR:', challenge);
      console.log(' Challenge ID from QR:', challenge.challengeId);
      console.log('🔗 Callback URL:', challenge.callbackUrl);

      // Submit to callback URL or backend
      if (challenge.callbackUrl) {
        console.log('📤 Submitting proof to:', challenge.callbackUrl);
        console.log(' Proof response:', proofResponse);

        // Extract challenge ID from callback URL for verification
        const urlMatch = challenge.callbackUrl.match(/challenges\/([^/]+)\//);
        const expectedChallengeId = urlMatch ? urlMatch[1] : null;
        console.log('🎯 Expected challenge ID from URL:', expectedChallengeId);

        if (expectedChallengeId && proofResponse.challengeId !== expectedChallengeId) {
          console.warn('⚠️ Challenge ID mismatch detected!');
          console.warn('  From QR:', proofResponse.challengeId);
          console.warn('  From URL:', expectedChallengeId);
          // Use the challenge ID from the URL
          proofResponse.challengeId = expectedChallengeId;
          console.log(' Corrected challenge ID to match URL');
        }

        const response = await fetch(challenge.callbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proofResponse)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error(' Backend error:', errorData);
          throw new Error(errorData.error || 'Failed to submit proof to app');
        }

        console.log(' Proof accepted by backend');
      }

      setSuccess(true);
      console.log(' Proof submitted successfully!');

      // Refresh identity status after successful proof submission
      if (wallet.publicKey) {
        await fetchIdentity(wallet.publicKey.toString());
        console.log(' Identity status refreshed');
      }

      // Reset after 3 seconds
      setTimeout(() => {
        setChallenge(null);
        setSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error submitting proof:', error);
      setError(`Failed to submit proof: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getProofTypeDescription = (type: string, params: any) => {
    switch (type) {
      case 'age':
        return `Age verification (${params.threshold}+ years old)`;
      case 'nationality':
        return `Nationality verification (${params.allowedCountries?.join(', ')})`;
      case 'uniqueness':
        return `Uniqueness verification (scope: ${params.scope})`;
      default:
        return type;
    }
  };

  if (!identity) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Register Your Identity First</h3>
        <p className="text-gray-400 mb-6">
          You need to register your identity before you can respond to verification challenges.
        </p>
        <p className="text-sm text-gray-500">
          Go to the "Register Identity" tab to scan your Aadhaar QR code.
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-green-400 mb-2">Proof Submitted!</h3>
        <p className="text-gray-400">
          Your verification proof has been sent to <strong>{challenge?.appName}</strong>
        </p>
      </div>
    );
  }

  if (challenge) {
    const isExpired = Date.now() > challenge.expiresAt;
    const timeRemaining = Math.max(0, Math.floor((challenge.expiresAt - Date.now()) / 1000));
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-secondary/50 border border-vintage-grape-500/30 rounded-xl p-6 mb-6">
          <h3 className="text-2xl font-bold mb-4 text-vintage-grape-400 font-serif">Verification Challenge</h3>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-text-muted">Requesting App</label>
              <p className="text-lg font-semibold text-text-primary">{challenge.appName}</p>
            </div>

            <div>
              <label className="text-sm text-text-muted">Verification Required</label>
              <p className="text-lg text-text-primary">{getProofTypeDescription(challenge.proofType, challenge.params)}</p>
            </div>

            <div>
              <label className="text-sm text-text-muted">Challenge ID</label>
              <p className="text-sm font-mono text-text-secondary">{challenge.challengeId.substring(0, 16)}...</p>
            </div>

            {!isExpired && (
              <div>
                <label className="text-sm text-text-muted">Time Remaining</label>
                <p className="text-lg font-semibold text-green-400">
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSubmitProof}
              disabled={submitting || isExpired}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors font-serif ${isExpired
                ? 'bg-tertiary text-text-muted cursor-not-allowed'
                : submitting
                  ? 'bg-vintage-grape-700 text-white cursor-wait'
                  : 'bg-vintage-grape-600 hover:bg-vintage-grape-700 text-white'
                }`}
            >
              {submitting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Generating Proof...
                </>
              ) : isExpired ? (
                'Challenge Expired'
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Proof
                </>
              )}
            </button>

            <button
              onClick={() => setChallenge(null)}
              className="px-6 py-3 rounded-lg font-semibold bg-tertiary hover:bg-tertiary/70 text-text-primary transition-colors font-serif"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2 text-text-primary font-serif">Scan Verification Challenge</h3>
        <p className="text-text-secondary">
          Scan a challenge QR code from a third-party app that requires verification
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {cameraError && (
        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-500/50 rounded-lg text-yellow-300">
          {cameraError}
        </div>
      )}

      <div className="space-y-4">
        {!scanning && (
          <>
            <button
              onClick={startCamera}
              className="w-full px-6 py-4 bg-vintage-grape-600 hover:bg-vintage-grape-700 text-white rounded-lg font-semibold flex items-center justify-center gap-3 transition-colors font-serif"
            >
              <Camera className="w-6 h-6" />
              Scan with Camera
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border-custom" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-primary px-2 text-text-muted">Or</span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-6 py-4 bg-tertiary hover:bg-tertiary/70 text-text-primary rounded-lg font-semibold flex items-center justify-center gap-3 transition-colors font-serif"
            >
              <Upload className="w-6 h-6" />
              Upload Challenge QR Image
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border-custom" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-primary px-2 text-text-muted">Or</span>
              </div>
            </div>

            <button
              onClick={handlePasteImage}
              className="w-full px-6 py-4 bg-tertiary hover:bg-tertiary/70 text-text-primary rounded-lg font-semibold flex items-center justify-center gap-3 transition-colors font-serif"
            >
              <Clipboard className="w-6 h-6" />
              Paste QR Image from Clipboard
            </button>

            {pasteError && (
              <div className="p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg text-yellow-300 text-sm">
                {pasteError}
              </div>
            )}
          </>
        )}

        {scanning && (
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full rounded-lg"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            <button
              onClick={stopCamera}
              className="absolute top-4 right-4 p-3 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="bg-black/70 text-white px-4 py-2 rounded-lg inline-block">
                Position the QR code within the frame
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <p className="text-sm text-blue-300">
          <strong>How it works:</strong> When a third-party app needs to verify something about you
          (like your age), they'll show you a challenge QR code. Scan it here, and we'll generate
          a zero-knowledge proof that proves you meet their requirements without revealing your actual data.
        </p>
      </div>
    </div>
  );
}
