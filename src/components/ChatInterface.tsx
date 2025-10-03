import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Trash2, RotateCcw, Upload, X } from 'lucide-react';
import { Customer, ChatSession } from '../types';
import { AudioRecorder } from '../utils/audioRecorder';
import { uploadService } from '../utils/uploadService';

interface ChatInterfaceProps {
  customer: Customer;
  onClose: () => void;
  onSessionComplete: (session: ChatSession) => void;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export function ChatInterface({ customer, onClose, onSessionComplete }: ChatInterfaceProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState(0);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      recorderRef.current?.cleanup();
    };
  }, [audioUrl]);

  const startTimer = () => {
    timerRef.current = window.setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetTimer = () => {
    stopTimer();
    setRecordingTime(0);
  };

  const handleStartRecording = async () => {
    try {
      setStatusMessage('Initializing microphone...');
      recorderRef.current = new AudioRecorder();
      await recorderRef.current.initialize();
      recorderRef.current.start();
      setRecordingState('recording');
      setStatusMessage('Recording...');
      resetTimer();
      startTimer();
    } catch (error) {
      setStatusMessage('Error: ' + (error as Error).message);
    }
  };

  const handlePauseRecording = () => {
    if (recorderRef.current) {
      if (recordingState === 'recording') {
        recorderRef.current.pause();
        setRecordingState('paused');
        setStatusMessage('Recording paused');
        stopTimer();
      } else if (recordingState === 'paused') {
        recorderRef.current.resume();
        setRecordingState('recording');
        setStatusMessage('Recording...');
        startTimer();
      }
    }
  };

  const handleStopRecording = async () => {
    if (recorderRef.current) {
      try {
        const blob = await recorderRef.current.stop();
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setRecordingState('stopped');
        setStatusMessage('Recording complete. Review or upload.');
        stopTimer();
      } catch (error) {
        setStatusMessage('Error stopping recording: ' + (error as Error).message);
      }
    }
  };

  const handleDeleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl('');
    setTranscript('');
    setRecordingState('idle');
    setStatusMessage('');
    resetTimer();
    recorderRef.current?.cleanup();
  };

  const handleRedoRecording = () => {
    handleDeleteRecording();
    handleStartRecording();
  };

  const handleUpload = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    setUploadProgress(0);
    setStatusMessage('Uploading...');

    const sessionId = `${customer.id}_${Date.now()}`;

    try {
      const result = await uploadService.uploadAudio(
        sessionId,
        audioBlob,
        (progress) => setUploadProgress(progress)
      );

      if (result.success) {
        // Only show success when upload to Supabase actually succeeded.
        setStatusMessage('Upload successful!');
        setTranscript(result.transcript || '');

        const session: ChatSession = {
          id: sessionId,
          customerId: customer.id,
          customerName: customer.name,
          date: new Date().toISOString(),
          audioBlob,
          audioUrl: result.audioUrl || audioUrl,
          transcript: result.transcript || '',
          duration: recordingTime,
          status: 'uploaded',
        };

        onSessionComplete(session);

        setTimeout(() => {
          handleDeleteRecording();
          setStatusMessage('Session saved successfully!');
        }, 1500);
      } else {
        // Ensure we do NOT show success if upload/transcription failed.
        setStatusMessage(result.error || 'Upload failed');

        const session: ChatSession = {
          id: sessionId,
          customerId: customer.id,
          customerName: customer.name,
          date: new Date().toISOString(),
          audioBlob,
          audioUrl,
          transcript: 'Pending upload...',
          duration: recordingTime,
          status: 'pending',
        };

        onSessionComplete(session);
      }
    } catch (error) {
      setStatusMessage('Error: ' + (error as Error).message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Chat Session</h2>
            <p className="text-gray-600">{customer.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Voice Recording</h3>

            <div className="flex items-center justify-center gap-3 mb-4">
              {recordingState === 'idle' && (
                <button
                  onClick={handleStartRecording}
                  className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Mic className="w-5 h-5" />
                  Start Recording
                </button>
              )}

              {(recordingState === 'recording' || recordingState === 'paused') && (
                <>
                  <button
                    onClick={handlePauseRecording}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                      recordingState === 'paused'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    }`}
                  >
                    {recordingState === 'paused' ? (
                      <>
                        <Play className="w-5 h-5" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Square className="w-5 h-5" />
                        Pause
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleStopRecording}
                    className="flex items-center gap-2 bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <Square className="w-5 h-5" />
                    Stop
                  </button>
                </>
              )}

              {recordingState === 'stopped' && audioBlob && (
                <>
                  <button
                    onClick={handleRedoRecording}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Redo
                  </button>
                  <button
                    onClick={handleDeleteRecording}
                    className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-5 h-5" />
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                </>
              )}
            </div>

            {(recordingState === 'recording' || recordingState === 'paused') && (
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2">
                  {recordingState === 'recording' && (
                    <span className="inline-block w-3 h-3 bg-red-600 rounded-full animate-pulse"></span>
                  )}
                  <span className="text-2xl font-mono font-bold text-gray-800">
                    {formatTime(recordingTime)}
                  </span>
                </div>
              </div>
            )}

            {statusMessage && (
              <div
                className={`text-center py-2 px-4 rounded-lg mb-4 ${
                  statusMessage.includes('Error') || statusMessage.includes('failed')
                    ? 'bg-red-100 text-red-700'
                    : statusMessage.includes('successful')
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {statusMessage}
              </div>
            )}

            {isUploading && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-center text-sm text-gray-600 mt-1">
                  {Math.round(uploadProgress)}%
                </p>
              </div>
            )}

            {audioUrl && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-700 mb-2">Recorded Audio</h4>
                <audio src={audioUrl} controls className="w-full" />
                <p className="text-sm text-gray-600 mt-2">
                  Duration: {formatTime(recordingTime)}
                </p>
              </div>
            )}
          </div>

          {transcript && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Transcript</h3>
              <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                <p className="text-gray-700 whitespace-pre-wrap">{transcript}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
