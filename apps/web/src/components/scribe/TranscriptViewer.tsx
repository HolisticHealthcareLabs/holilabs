'use client';

interface TranscriptSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
}

export default function TranscriptViewer({ segments }: TranscriptViewerProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-700';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  if (!segments || segments.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No hay transcripción disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
      {segments.map((segment, idx) => (
        <div
          key={idx}
          className={`p-4 rounded-lg border transition-all ${
            segment.speaker === 'Doctor'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          {/* Speaker Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                  segment.speaker === 'Doctor'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-white'
                }`}
              >
                {segment.speaker === 'Doctor' ? '👨‍⚕️' : '🧑'} {segment.speaker}
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {formatTime(segment.startTime)} → {formatTime(segment.endTime)}
              </span>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded font-medium ${getConfidenceColor(
                segment.confidence
              )}`}
            >
              {Math.round(segment.confidence * 100)}%
            </span>
          </div>

          {/* Transcript Text */}
          <p className="text-gray-900 leading-relaxed">{segment.text}</p>
        </div>
      ))}
    </div>
  );
}
