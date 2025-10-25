"use strict";
/**
 * Audio Recorder Component
 *
 * Simple, beautiful interface for recording consultations
 */
'use client';
/**
 * Audio Recorder Component
 *
 * Simple, beautiful interface for recording consultations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AudioRecorder;
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
function AudioRecorder({ appointmentId, patientId, patientName, onRecordingComplete, }) {
    const [isRecording, setIsRecording] = (0, react_1.useState)(false);
    const [recordingTime, setRecordingTime] = (0, react_1.useState)(0);
    const [isProcessing, setIsProcessing] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [recordingId, setRecordingId] = (0, react_1.useState)(null);
    const mediaRecorderRef = (0, react_1.useRef)(null);
    const audioChunksRef = (0, react_1.useRef)([]);
    const timerRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        return () => {
            if (timerRef.current)
                clearInterval(timerRef.current);
            if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);
    const startRecording = async () => {
        try {
            setError(null);
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Create MediaRecorder
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm',
            });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            // Collect audio data
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            // Handle recording stop
            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach((track) => track.stop());
                await handleRecordingStop();
            };
            // Start API recording session
            const response = await fetch('/api/recordings/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId, patientId }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Error al iniciar grabación');
            }
            setRecordingId(data.data.id);
            // Start recording
            mediaRecorder.start(1000); // Collect data every second
            setIsRecording(true);
            setRecordingTime(0);
            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Error al acceder al micrófono');
        }
    };
    const stopRecording = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };
    const handleRecordingStop = async () => {
        if (!recordingId)
            return;
        setIsProcessing(true);
        try {
            // Create audio blob
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            // Convert blob to base64 for simple storage (in production, upload to S3/R2)
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64Audio = reader.result;
                // Stop recording session
                const stopResponse = await fetch(`/api/recordings/${recordingId}/stop`, {
                    method: 'POST',
                });
                if (!stopResponse.ok) {
                    throw new Error('Error al detener grabación');
                }
                // Trigger transcription
                const transcribeResponse = await fetch(`/api/recordings/${recordingId}/transcribe`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        audioUrl: base64Audio,
                        generateSOAP: true,
                    }),
                });
                const transcribeData = await transcribeResponse.json();
                if (!transcribeResponse.ok || !transcribeData.success) {
                    throw new Error(transcribeData.error || 'Error al transcribir audio');
                }
                setIsProcessing(false);
                onRecordingComplete(recordingId);
            };
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Error al procesar grabación');
            setIsProcessing(false);
        }
    };
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    if (isProcessing) {
        return (<div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
        <framer_motion_1.motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-16 h-16 mx-auto mb-4">
          <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        </framer_motion_1.motion.div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Procesando con IA...
        </h3>
        <p className="text-gray-600 mb-4">
          Transcribiendo audio y generando notas SOAP
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <span>Esto puede tomar 1-2 minutos</span>
        </div>
      </div>);
    }
    return (<div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-xl border border-gray-200 p-8">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Grabación de Consulta
        </h3>
        <p className="text-gray-600">
          Paciente: <span className="font-semibold">{patientName}</span>
        </p>
      </div>

      {error && (<framer_motion_1.motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </framer_motion_1.motion.div>)}

      <div className="flex flex-col items-center gap-6">
        {/* Record Button */}
        <framer_motion_1.motion.button onClick={isRecording ? stopRecording : startRecording} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={`relative w-32 h-32 rounded-full shadow-2xl transition-all ${isRecording
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'}`}>
          {/* Pulsing animation when recording */}
          <framer_motion_1.AnimatePresence>
            {isRecording && (<framer_motion_1.motion.div initial={{ scale: 1, opacity: 0.5 }} animate={{ scale: 1.5, opacity: 0 }} exit={{ scale: 1, opacity: 0 }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 rounded-full bg-red-400"/>)}
          </framer_motion_1.AnimatePresence>

          {/* Icon */}
          <div className="relative z-10 flex items-center justify-center w-full h-full">
            {isRecording ? (<svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>) : (<svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
              </svg>)}
          </div>
        </framer_motion_1.motion.button>

        {/* Timer */}
        <framer_motion_1.AnimatePresence>
          {isRecording && (<framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="text-center">
              <div className="flex items-center gap-2 text-3xl font-mono font-bold text-gray-900">
                <framer_motion_1.motion.div animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-3 h-3 bg-red-500 rounded-full"/>
                {formatTime(recordingTime)}
              </div>
              <p className="text-sm text-gray-600 mt-2">Grabando...</p>
            </framer_motion_1.motion.div>)}
        </framer_motion_1.AnimatePresence>

        {/* Instructions */}
        {!isRecording && (<div className="text-center max-w-md">
            <p className="text-sm text-gray-700 mb-4">
              Presiona el botón para iniciar la grabación de la consulta. El audio será transcrito automáticamente y se generarán notas SOAP con IA.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-800">
                <strong>💡 Consejo:</strong> Asegúrate de tener buena conexión y un ambiente silencioso para mejor calidad de transcripción.
              </p>
            </div>
          </div>)}

        {isRecording && (<button onClick={stopRecording} className="px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all">
            Detener y Procesar
          </button>)}
      </div>
    </div>);
}
//# sourceMappingURL=AudioRecorder.js.map