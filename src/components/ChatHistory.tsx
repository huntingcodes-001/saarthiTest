import { useState, useEffect } from 'react';
import { History, ChevronDown, ChevronUp, Play, Calendar, Clock, AlertCircle } from 'lucide-react';
import { ChatSession } from '../types';
import { storageUtils } from '../utils/storage';

interface ChatHistoryProps {
  sessions: ChatSession[];
}

export function ChatHistory({ sessions }: ChatHistoryProps) {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadAudioUrls = async () => {
      const urls: Record<string, string> = {};
      for (const session of sessions) {
        if (session.audioUrl) {
          urls[session.id] = session.audioUrl;
        } else {
          const blob = await storageUtils.getAudioBlob(session.id);
          if (blob) {
            urls[session.id] = URL.createObjectURL(blob);
          }
        }
      }
      setAudioUrls(urls);
    };

    loadAudioUrls();

    return () => {
      Object.values(audioUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [sessions]);

  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const groupedSessions = sessions.reduce((acc, session) => {
    const key = `${session.customerName}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(session);
    return acc;
  }, {} as Record<string, ChatSession[]>);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: ChatSession['status']) => {
    switch (status) {
      case 'uploaded':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            Uploaded
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Pending Upload
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2 mb-4 sm:mb-6">
        <History className="w-6 h-6" />
        Chat History
      </h2>

      {sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <History className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p>No chat sessions yet. Start a chat with a customer to begin.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedSessions).map(([customerName, customerSessions]) => (
            <div key={customerName} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">{customerName}</h3>
                <p className="text-sm text-gray-600">{customerSessions.length} session(s)</p>
              </div>
              <div className="divide-y divide-gray-200">
                {customerSessions
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((session) => (
                    <div key={session.id} className="bg-white">
                      <button
                        onClick={() => toggleSession(session.id)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Play className="w-4 h-4 text-gray-400" />
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-sm text-gray-600">
                                <Calendar className="w-3 h-3" />
                                {formatDate(session.date)}
                              </span>
                              <span className="flex items-center gap-1 text-sm text-gray-600">
                                <Clock className="w-3 h-3" />
                                {formatTime(session.date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                Duration: {formatDuration(session.duration)}
                              </span>
                              {getStatusBadge(session.status)}
                            </div>
                          </div>
                        </div>
                        {expandedSessions.has(session.id) ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      {expandedSessions.has(session.id) && (
                        <div className="px-4 pb-4 space-y-4 bg-gray-50">
                          {audioUrls[session.id] && (
                            <div>
                              <h4 className="font-medium text-gray-700 mb-2 text-sm">
                                Recording
                              </h4>
                              <audio
                                src={audioUrls[session.id]}
                                controls
                                className="w-full"
                              />
                            </div>
                          )}

                          {session.transcript && (
                            <div>
                              <h4 className="font-medium text-gray-700 mb-2 text-sm">
                                Transcript
                              </h4>
                              <div className="bg-white border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {session.transcript}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
