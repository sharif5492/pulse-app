import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, Camera, Upload, Copy, Check, Sparkles, UserPlus, 
  MessageCircle, Phone, Video, RefreshCw, X, Shield, ArrowRight, 
  Download, Flashlight, FlipHorizontal, AlertCircle, CheckCircle2
} from 'lucide-react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { audioUtils } from '../lib/audioUtils';
import { usersDiscoveryService } from '../lib/supabase';
import { areUserIdsEqual, normalizeUserId } from '../utils/userIdUtils';

interface FriendBarcodeCenterProps {
  onClose?: () => void;
  defaultMode?: 'my_barcode' | 'scan';
}

export const FriendBarcodeCenter: React.FC<FriendBarcodeCenterProps> = ({ 
  onClose,
  defaultMode = 'scan' 
}) => {
  const { 
    getConnectionStatusWith, 
    sendConnectionRequest, 
    acceptConnectionRequest,
    openConversation,
    startCall,
    setActiveTab,
    isUserOnline,
    conversations,
  } = useApp();
  const { user } = useAuth();

  const [mode, setMode] = useState<'my_barcode' | 'scan'>(defaultMode);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedId, setCopiedId] = useState(false);
  const [scannedResult, setScannedResult] = useState<User | null>(null);
  const [scannedRawCode, setScannedRawCode] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [requestSentNotice, setRequestSentNotice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentUserId = user?.id || 'usr_current';
  const currentUsername = user?.username || 'pulse_creator';
  const currentName = user?.name || 'Pulse User';
  const currentAvatar = user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';

  // 1. Generate My Barcode / QR Code
  useEffect(() => {
    const payload = `pulse://user/${currentUserId}`;
    QRCode.toDataURL(payload, {
      width: 320,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.warn('QR generation error:', err);
      });
  }, [currentUserId]);

  // 2. Camera scanner start/stop
  const stopCamera = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsScanning(true);
        requestAnimationFrame(tickScan);
      }
    } catch (err: any) {
      console.warn('Camera start error:', err);
      const msg = err?.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera or upload a barcode screenshot below.'
        : err?.message || 'Unable to access camera on this device.';
      setCameraError(msg);
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (mode === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode, facingMode]);

  // 3. Scan frame loop using jsQR
  const tickScan = () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          handleDetectedCode(code.data);
          return; // pause loop on detection
        }
      }
    }

    scanLoopRef.current = requestAnimationFrame(tickScan);
  };

  // 4. Handle barcode detection (either from camera, photo upload or manual input)
  const handleDetectedCode = async (rawString: string) => {
    if (!rawString || !rawString.trim()) return;
    const cleanRaw = rawString.trim();
    setScannedRawCode(cleanRaw);

    // Audio & Haptic feedback
    audioUtils.playBarcodeScanSuccess();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {}
    }

    // Stop live scanning once detected
    stopCamera();
    setIsLookingUp(true);

    // Parse ID or username
    let targetIdOrUsername = cleanRaw;
    if (cleanRaw.startsWith('pulse://user/')) {
      targetIdOrUsername = cleanRaw.replace('pulse://user/', '');
    }

    try {
      const foundUser = await usersDiscoveryService.lookupUser(targetIdOrUsername);
      if (foundUser) {
        setScannedResult(foundUser);
      } else {
        // Create optimistic user representation for immediate connection
        const cleanId = targetIdOrUsername.trim().replace(/^[@#]/, '');
        const fallbackUser: User = {
          id: cleanId,
          name: cleanId.length > 12 ? `Pulse User (${cleanId.slice(0, 8)})` : cleanId,
          username: cleanId,
          avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`,
          bio: 'Discovered via Barcode Scan',
          followersCount: 10,
          followingCount: 5,
          likesCount: 20,
        };
        setScannedResult(fallbackUser);
      }
    } catch (err) {
      console.warn('Lookup error after scan:', err);
    } finally {
      setIsLookingUp(false);
    }
  };

  // 5. Image upload barcode scanner fallback
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleDetectedCode(code.data);
          } else {
            setCameraError('No Pulse Barcode or QR code could be found in that photo. Please try a clearer screenshot.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset file input value
    e.target.value = '';
  };

  // Copy User ID
  const handleCopyId = () => {
    audioUtils.playPop();
    navigator.clipboard.writeText(currentUserId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Save Barcode as Image
  const handleSaveBarcodeImage = () => {
    if (!qrDataUrl) return;
    audioUtils.playPop();
    const link = document.createElement('a');
    link.download = `Pulse_Barcode_${currentUserId}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  // Send friend connection request to scanned user
  const handleSendRequestToScanned = async (targetUser: User) => {
    audioUtils.playPop();
    await sendConnectionRequest(targetUser);
    setRequestSentNotice(`Friend request sent to @${targetUser.username}!`);
    setTimeout(() => setRequestSentNotice(null), 3000);
  };

  // Open direct chat with scanned friend
  const handleOpenChat = (targetUser: User) => {
    audioUtils.playPop();
    onClose?.();
    const existing = conversations.find((c) => c.participant.id === targetUser.id);
    if (existing) {
      openConversation(existing);
    } else {
      openConversation({
        id: `conv_${targetUser.id}`,
        participant: targetUser,
        lastMessage: 'Connected via Barcode Scan on Pulse',
        lastMessageTime: 'Just now',
        unreadCount: 0,
        isOnline: isUserOnline(targetUser.id),
        messages: [],
      });
    }
    setActiveTab('dms');
  };

  return (
    <div className="flex flex-col h-full select-none">
      {/* Mode Switcher Buttons */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2">
        <button
          onClick={() => {
            audioUtils.playPop();
            setScannedResult(null);
            setMode('scan');
          }}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
            mode === 'scan'
              ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md shadow-fuchsia-950/50'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Scan Friend Barcode</span>
        </button>

        <button
          onClick={() => {
            audioUtils.playPop();
            setMode('my_barcode');
          }}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
            mode === 'my_barcode'
              ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md shadow-fuchsia-950/50'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>My Barcode & QR</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {mode === 'my_barcode' ? (
          /* ========================================================
             VIEW 1: MY BARCODE & QR CODE
             ======================================================== */
          <div className="space-y-4">
            {/* Styled Pulse Friend ID Barcode Card */}
            <div className="relative mx-auto max-w-xs bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-3xl p-5 border-2 border-fuchsia-500/40 shadow-2xl shadow-fuchsia-950/40 text-center overflow-hidden group">
              {/* Ambient Glow */}
              <div className="absolute -top-10 -right-10 w-36 h-36 bg-fuchsia-500/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

              {/* Top Branding */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse" />
                  <span className="font-black italic tracking-wider text-xs bg-gradient-to-r from-fuchsia-400 to-indigo-300 bg-clip-text text-transparent">
                    PULSE FRIEND PASS
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                  ACTIVE
                </span>
              </div>

              {/* User Avatar & Identity */}
              <div className="pt-4 flex flex-col items-center">
                <div className="relative">
                  <img
                    src={currentAvatar}
                    alt={currentName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-fuchsia-400 shadow-lg shadow-fuchsia-500/20"
                  />
                  <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                </div>

                <h4 className="font-extrabold text-white text-base mt-2 leading-tight">
                  {currentName}
                </h4>
                <p className="text-xs text-fuchsia-400 font-mono">@{currentUsername}</p>
              </div>

              {/* High-Resolution QR Code Block */}
              <div className="mt-4 p-3 bg-white rounded-2xl shadow-inner max-w-[210px] mx-auto flex items-center justify-center border-4 border-slate-900">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Pulse Friend QR Code"
                    className="w-44 h-44 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-fuchsia-600" />
                  </div>
                )}
              </div>

              {/* Graphic Barcode Display */}
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-center gap-[3px] h-9 px-4 bg-slate-950/80 rounded-xl border border-slate-800/80 py-1">
                  {/* Decorative Barcode Striping */}
                  {[
                    3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 3
                  ].map((w, idx) => (
                    <div
                      key={idx}
                      className="h-full bg-slate-200 group-hover:bg-fuchsia-300 transition-colors"
                      style={{ width: `${w}px` }}
                    />
                  ))}
                </div>

                {/* User ID String */}
                <div className="mt-1.5 flex items-center justify-center gap-1.5 font-mono text-xs text-slate-300 font-bold tracking-wider">
                  <span>ID:</span>
                  <span className="text-fuchsia-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                    {currentUserId}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons for Sharing */}
            <div className="flex items-center gap-2 max-w-xs mx-auto">
              <button
                onClick={handleCopyId}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/40 text-fuchsia-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                {copiedId ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">ID Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy User ID</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSaveBarcodeImage}
                className="py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                title="Download Barcode Image"
              >
                <Download className="w-4 h-4" />
                <span>Save</span>
              </button>
            </div>

            {/* Instruction Banner in Urdu & English */}
            <div className="p-3.5 bg-gradient-to-r from-fuchsia-950/40 to-slate-900 border border-fuchsia-900/50 rounded-2xl text-center space-y-1 max-w-xs mx-auto">
              <p className="text-xs font-semibold text-white">
                Dusre mobile se ye Barcode scan karein! 📱
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Open "Scan Friend Barcode" on your other phone and point its camera right here to connect instantly.
              </p>
            </div>
          </div>
        ) : (
          /* ========================================================
             VIEW 2: SCAN FRIEND BARCODE / QR
             ======================================================== */
          <div className="space-y-4">
            {/* Scanned Result Card (If code already scanned) */}
            {scannedResult ? (
              <div className="p-4 bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/50 rounded-3xl space-y-3 shadow-xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Friend Barcode Recognized!</span>
                  </div>
                  <button
                    onClick={() => {
                      setScannedResult(null);
                      startCamera();
                    }}
                    className="text-[11px] font-semibold text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Scan Another</span>
                  </button>
                </div>

                {/* Profile Card */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="relative shrink-0">
                    <img
                      src={scannedResult.avatar}
                      alt={scannedResult.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-emerald-400 shadow-md"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border border-slate-950" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-extrabold text-white text-sm truncate">
                      {scannedResult.name}
                    </h4>
                    <p className="text-xs text-fuchsia-400 font-mono">@{scannedResult.username}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>ID:</span>
                      <span className="bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">
                        {scannedResult.id}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notice Alert */}
                {requestSentNotice && (
                  <div className="p-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-center text-xs text-emerald-300 font-semibold animate-in fade-in">
                    {requestSentNotice}
                  </div>
                )}

                {/* Connection Status & Action Buttons */}
                {(() => {
                  const connInfo = getConnectionStatusWith(scannedResult.id);
                  const isConnected = connInfo.status === 'accepted';
                  const isPending = connInfo.status === 'pending';
                  const isSelf = scannedResult.id === currentUserId;

                  if (isSelf) {
                    return (
                      <div className="p-3 bg-slate-800/80 rounded-2xl text-center text-xs text-slate-300">
                        This is your own barcode! Please scan the barcode on your second phone.
                      </div>
                    );
                  }

                  if (isConnected) {
                    return (
                      <div className="space-y-2 pt-1">
                        <div className="p-2 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-center text-xs text-emerald-300 font-bold">
                          ✓ You are already connected friends!
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleOpenChat(scannedResult)}
                            className="py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Direct Chat</span>
                          </button>
                          <button
                            onClick={() => {
                              onClose?.();
                              startCall(scannedResult, 'video');
                            }}
                            className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                          >
                            <Video className="w-4 h-4 text-emerald-400" />
                            <span>Video Call</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (isPending) {
                    if (connInfo.isIncoming) {
                      return (
                        <div className="space-y-2 pt-1">
                          <p className="text-xs text-center text-fuchsia-300 font-semibold">
                            Sent you a friend request!
                          </p>
                          <button
                            onClick={async () => {
                              if (connInfo.connectionId) {
                                await acceptConnectionRequest(connInfo.connectionId);
                              } else {
                                await acceptConnectionRequest(scannedResult.id);
                              }
                              setRequestSentNotice(`Friend request accepted!`);
                            }}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50"
                          >
                            <Check className="w-4 h-4" />
                            <span>Accept Friend Request</span>
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-2xl text-center space-y-1">
                        <p className="text-xs font-bold text-amber-300">Friend Request Pending</p>
                        <p className="text-[11px] text-amber-400/80">
                          Waiting for @{scannedResult.username} to accept on their device.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="pt-1">
                      <button
                        onClick={() => handleSendRequestToScanned(scannedResult)}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-950/60 transition-transform active:scale-95"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Send Friend Request Now</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            ) : null}

            {/* Live Camera Viewfinder Box */}
            <div className="relative w-full max-w-xs mx-auto aspect-square rounded-3xl overflow-hidden bg-black border-2 border-slate-800 shadow-2xl flex items-center justify-center group">
              {/* Hidden Canvas for Decoding */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Video Feed */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />

              {/* Laser Scanline & Target Brackets */}
              <div className="absolute inset-6 border border-white/20 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
                {/* Corner Accents */}
                <div className="flex justify-between">
                  <span className="w-6 h-6 border-t-2 border-l-2 border-fuchsia-500 rounded-tl-lg" />
                  <span className="w-6 h-6 border-t-2 border-r-2 border-fuchsia-500 rounded-tr-lg" />
                </div>

                {/* Animated Horizontal Laser Scanner Line */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent shadow-lg shadow-fuchsia-500/80 animate-pulse" />

                <div className="flex justify-between">
                  <span className="w-6 h-6 border-b-2 border-l-2 border-fuchsia-500 rounded-bl-lg" />
                  <span className="w-6 h-6 border-b-2 border-r-2 border-fuchsia-500 rounded-br-lg" />
                </div>
              </div>

              {/* Camera Status Overlay */}
              {!isScanning && !cameraError && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center space-y-2">
                  <Camera className="w-8 h-8 text-fuchsia-400 animate-bounce" />
                  <p className="text-xs font-semibold text-white">Starting Camera Scanner...</p>
                  <p className="text-[10px] text-slate-400">Please point at your friend's Pulse barcode</p>
                </div>
              )}

              {/* Camera Error Message */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-400" />
                  <p className="text-xs font-bold text-white">Camera Access Notice</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="px-3 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl text-xs font-bold transition-colors mt-1"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* Floating Camera Flip Control */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                <button
                  onClick={() => {
                    audioUtils.playPop();
                    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
                  }}
                  className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white/90 hover:text-white border border-white/10 shadow-md"
                  title="Flip Camera"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Fallback Option 1: Upload Photo / Screenshot */}
            <div className="max-w-xs mx-auto space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Upload className="w-4 h-4 text-fuchsia-400" />
                <span>Upload Barcode Screenshot / Photo</span>
              </button>
            </div>

            {/* Fallback Option 2: Manual Barcode / User ID Entry */}
            <div className="max-w-xs mx-auto pt-2 border-t border-slate-800/80 space-y-2">
              <p className="text-[11px] font-semibold text-slate-400 text-center">
                Or type Barcode ID directly:
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualCodeInput.trim()) {
                    handleDetectedCode(manualCodeInput.trim());
                  }
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value)}
                  placeholder="Enter User ID (e.g. usr_123)..."
                  className="flex-1 bg-slate-900 border border-slate-800 focus:border-fuchsia-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!manualCodeInput.trim() || isLookingUp}
                  className="px-3 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white text-xs font-bold transition-colors"
                >
                  {isLookingUp ? '...' : 'Connect'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
