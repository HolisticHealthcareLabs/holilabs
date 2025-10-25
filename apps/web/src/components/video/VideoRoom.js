"use strict";
/**
 * Video Room Component
 *
 * Beautiful, simple video telemedicine interface
 * Industry-grade WebRTC with innovative UX
 */
'use client';
/**
 * Video Room Component
 *
 * Beautiful, simple video telemedicine interface
 * Industry-grade WebRTC with innovative UX
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = VideoRoom;
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
function VideoRoom({ roomId, userName, userType, onLeave, }) {
    const [isMuted, setIsMuted] = (0, react_1.useState)(false);
    const [isVideoOff, setIsVideoOff] = (0, react_1.useState)(false);
    const [isScreenSharing, setIsScreenSharing] = (0, react_1.useState)(false);
    const [showControls, setShowControls] = (0, react_1.useState)(true);
    const [connectionQuality, setConnectionQuality] = (0, react_1.useState)('excellent');
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    const [remoteUserName, setRemoteUserName] = (0, react_1.useState)('');
    const [callDuration, setCallDuration] = (0, react_1.useState)(0);
    const localVideoRef = (0, react_1.useRef)(null);
    const remoteVideoRef = (0, react_1.useRef)(null);
    const localStreamRef = (0, react_1.useRef)(null);
    const hideControlsTimeoutRef = (0, react_1.useRef)(null);
    // Initialize media devices
    (0, react_1.useEffect)(() => {
        const initMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'user',
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                });
                localStreamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
                // Simulate connection (replace with actual WebRTC logic)
                setTimeout(() => {
                    setIsConnected(true);
                    setRemoteUserName(userType === 'clinician' ? 'María González' : 'Dr. García');
                }, 2000);
            }
            catch (error) {
                console.error('Error accessing media devices:', error);
            }
        };
        initMedia();
        return () => {
            // Cleanup
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, [userType]);
    // Call duration timer
    (0, react_1.useEffect)(() => {
        if (!isConnected)
            return;
        const interval = setInterval(() => {
            setCallDuration((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isConnected]);
    // Auto-hide controls after 3 seconds
    (0, react_1.useEffect)(() => {
        if (!showControls)
            return;
        if (hideControlsTimeoutRef.current) {
            clearTimeout(hideControlsTimeoutRef.current);
        }
        hideControlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
        }, 3000);
        return () => {
            if (hideControlsTimeoutRef.current) {
                clearTimeout(hideControlsTimeoutRef.current);
            }
        };
    }, [showControls]);
    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };
    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };
    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            // Stop screen sharing
            setIsScreenSharing(false);
        }
        else {
            // Start screen sharing
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                });
                setIsScreenSharing(true);
                // When user stops sharing via browser UI
                screenStream.getVideoTracks()[0].onended = () => {
                    setIsScreenSharing(false);
                };
            }
            catch (error) {
                console.error('Error sharing screen:', error);
            }
        }
    };
    const handleLeave = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        onLeave();
    };
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    const getConnectionColor = () => {
        switch (connectionQuality) {
            case 'excellent':
                return 'text-green-500';
            case 'good':
                return 'text-yellow-500';
            case 'poor':
                return 'text-red-500';
            default:
                return 'text-gray-500';
        }
    };
    return (<div className="relative w-full h-screen bg-gray-900 overflow-hidden" onMouseMove={() => setShowControls(true)}>
      {/* Remote Video (Main) */}
      <div className="absolute inset-0">
        {isConnected ? (<video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover"/>) : (<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <div className="text-center">
              <framer_motion_1.motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
              </framer_motion_1.motion.div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Conectando...
              </h3>
              <p className="text-gray-400">
                Esperando a que {userType === 'clinician' ? 'el paciente' : 'el médico'} se una
              </p>
            </div>
          </div>)}
      </div>

      {/* Local Video (Picture-in-Picture) */}
      <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute bottom-24 right-6 w-64 h-48 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20">
        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror"/>
        {isVideoOff && (<div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {userName[0].toUpperCase()}
              </span>
            </div>
          </div>)}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs font-medium text-white">
          Tú
        </div>
      </framer_motion_1.motion.div>

      {/* Top Bar */}
      <framer_motion_1.AnimatePresence>
        {showControls && (<framer_motion_1.motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getConnectionColor()}`}/>
                  <span className="text-white font-medium">
                    {connectionQuality === 'excellent' && 'Excelente'}
                    {connectionQuality === 'good' && 'Buena'}
                    {connectionQuality === 'poor' && 'Mala'}
                  </span>
                </div>
                {isConnected && (<div className="text-white/80 text-sm">
                    {formatDuration(callDuration)}
                  </div>)}
              </div>
              <div className="text-white font-medium">
                {remoteUserName || 'Conectando...'}
              </div>
            </div>
          </framer_motion_1.motion.div>)}
      </framer_motion_1.AnimatePresence>

      {/* Bottom Controls */}
      <framer_motion_1.AnimatePresence>
        {showControls && (<framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
            <div className="flex items-center justify-center gap-4">
              {/* Mute Button */}
              <framer_motion_1.motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isMuted
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'}`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMuted ? (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>) : (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z"/>)}
                </svg>
              </framer_motion_1.motion.button>

              {/* Video Button */}
              <framer_motion_1.motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleVideo} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isVideoOff
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'}`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isVideoOff ? (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>) : (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>)}
                </svg>
              </framer_motion_1.motion.button>

              {/* Screen Share Button */}
              {userType === 'clinician' && (<framer_motion_1.motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleScreenShare} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isScreenSharing
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'}`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </framer_motion_1.motion.button>)}

              {/* End Call Button */}
              <framer_motion_1.motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleLeave} className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"/>
                </svg>
              </framer_motion_1.motion.button>
            </div>
          </framer_motion_1.motion.div>)}
      </framer_motion_1.AnimatePresence>

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>);
}
//# sourceMappingURL=VideoRoom.js.map