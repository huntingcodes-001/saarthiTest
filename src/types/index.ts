export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  audioBlob?: Blob;
  audioUrl?: string;
  transcript: string;
  duration: number;
  status: 'pending' | 'uploaded' | 'failed';
}

export interface PendingUpload {
  sessionId: string;
  audioBlob: Blob;
  retryCount: number;
  lastAttempt: string;
}
