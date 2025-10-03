import { Customer, ChatSession, PendingUpload } from '../types';

const CUSTOMERS_KEY = 'rm_customers';
const SESSIONS_KEY = 'rm_chat_sessions';
const PENDING_UPLOADS_KEY = 'rm_pending_uploads';
const AUDIO_BLOBS_KEY = 'rm_audio_blobs';

export const storageUtils = {
  getCustomers(): Customer[] {
    const data = localStorage.getItem(CUSTOMERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveCustomers(customers: Customer[]): void {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
  },

  getSessions(): ChatSession[] {
    const data = localStorage.getItem(SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveSessions(sessions: ChatSession[]): void {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  },

  getPendingUploads(): PendingUpload[] {
    const data = localStorage.getItem(PENDING_UPLOADS_KEY);
    return data ? JSON.parse(data) : [];
  },

  savePendingUploads(uploads: PendingUpload[]): void {
    localStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(uploads));
  },

  async saveAudioBlob(sessionId: string, blob: Blob): Promise<void> {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const blobs = this.getAudioBlobs();
        blobs[sessionId] = base64;
        localStorage.setItem(AUDIO_BLOBS_KEY, JSON.stringify(blobs));
        resolve();
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  getAudioBlobs(): Record<string, string> {
    const data = localStorage.getItem(AUDIO_BLOBS_KEY);
    return data ? JSON.parse(data) : {};
  },

  async getAudioBlob(sessionId: string): Promise<Blob | null> {
    const blobs = this.getAudioBlobs();
    const base64 = blobs[sessionId];
    if (!base64) return null;

    const response = await fetch(base64);
    return await response.blob();
  },

  deleteAudioBlob(sessionId: string): void {
    const blobs = this.getAudioBlobs();
    delete blobs[sessionId];
    localStorage.setItem(AUDIO_BLOBS_KEY, JSON.stringify(blobs));
  },

  addPendingUpload(sessionId: string, audioBlob: Blob): void {
    const uploads = this.getPendingUploads();
    const blobData = URL.createObjectURL(audioBlob);

    uploads.push({
      sessionId,
      audioBlob,
      retryCount: 0,
      lastAttempt: new Date().toISOString(),
    });
    this.savePendingUploads(uploads);
    this.saveAudioBlob(sessionId, audioBlob);
  },

  removePendingUpload(sessionId: string): void {
    const uploads = this.getPendingUploads();
    const filtered = uploads.filter(u => u.sessionId !== sessionId);
    this.savePendingUploads(filtered);
  },
};
