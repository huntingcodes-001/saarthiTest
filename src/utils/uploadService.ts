import { storageUtils } from './storage';
import { supabase, STORAGE_BUCKET } from './supabaseClient';

export class UploadService {
  private maxRetries = 3;
  private retryDelay = 2000;

  // Gemini API key should be set in .env.local as:
  // VITE_GEMINI_API_KEY=your_gemini_api_key
  private geminiApiKey: string | undefined = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

  async checkServerConnection(): Promise<boolean> {
    try {
      // Check Supabase Storage bucket listing (metadata only). If bucket is missing, report unreachable.
      const { error: listError } = await supabase.storage.from(STORAGE_BUCKET).list('', { limit: 1 });
      if (listError) {
        console.warn('Supabase storage check failed:', listError.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async uploadAudio(
    sessionId: string,
    audioBlob: Blob,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; transcript?: string; audioUrl?: string; error?: string }> {
    const isConnected = await this.checkServerConnection();

    if (!isConnected) {
      storageUtils.addPendingUpload(sessionId, audioBlob);
      return {
        success: false,
        error: 'Supabase is not reachable. Recording saved for later upload.',
      };
    }

    return this.attemptUpload(sessionId, audioBlob, 0, onProgress);
  }

  private async attemptUpload(
    sessionId: string,
    audioBlob: Blob,
    retryCount: number,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; transcript?: string; audioUrl?: string; error?: string }> {
    try {
      // Upload to Supabase Storage
      // Store inside a folder named 'recordings' in the bucket
      const filePath = `recordings/${sessionId}/recording.webm`;
      const file = new File([audioBlob], 'recording.webm', { type: audioBlob.type || 'audio/webm' });

      // Note: Supabase js v2 does not provide per-byte progress for storage upload; we set pseudo progress
      onProgress?.(10);
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type,
      });
      if (uploadError) throw uploadError;
      onProgress?.(60);

      // Try to get a public URL; if bucket is not public, fall back to a signed URL
      const { data: publicUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
      let publicUrl = publicUrlData.publicUrl;
      if (!publicUrl) {
        const { data: signedData, error: signedError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(filePath, 60 * 60); // 1 hour
        if (!signedError) {
          publicUrl = signedData.signedUrl;
        }
      }

      // Generate transcript with Gemini after successful upload
      const transcript = await this.generateTranscriptWithGemini(audioBlob);
      onProgress?.(100);

      storageUtils.removePendingUpload(sessionId);
      return { success: true, transcript, audioUrl: publicUrl };
    } catch (error: any) {
      console.error('Upload attempt failed:', error);

      // Provide a clear message for common misconfiguration
      const errorMessage = typeof error?.message === 'string' ? error.message : String(error);
      if (errorMessage.toLowerCase().includes('bucket not found')) {
        return {
          success: false,
          error:
            `Supabase bucket "${STORAGE_BUCKET}" not found. Create this bucket in Supabase Storage (Dashboard → Storage → New bucket) and set its public access or adjust policies.`,
        };
      }

      if (retryCount < this.maxRetries) {
        await this.sleep(this.retryDelay * (retryCount + 1));
        return this.attemptUpload(sessionId, audioBlob, retryCount + 1, onProgress);
      } else {
        storageUtils.addPendingUpload(sessionId, audioBlob);
        return {
          success: false,
          error: `Upload failed after ${this.maxRetries} attempts. Recording saved locally. ${errorMessage}`,
        };
      }
    }
  }

  async retryPendingUploads(onProgress?: (sessionId: string, status: string) => void): Promise<void> {
    const pending = storageUtils.getPendingUploads();

    for (const upload of pending) {
      onProgress?.(upload.sessionId, 'retrying');

      const audioBlob = await storageUtils.getAudioBlob(upload.sessionId);
      if (audioBlob) {
        const result = await this.uploadAudio(upload.sessionId, audioBlob);

        if (result.success) {
          onProgress?.(upload.sessionId, 'success');
        } else {
          onProgress?.(upload.sessionId, 'failed');
        }
      }
    }
  }

  private async generateTranscriptWithGemini(audioBlob: Blob): Promise<string> {
    // Configure this environment variable in your Vite env (e.g., .env.local):
    // VITE_GEMINI_API_KEY=your_gemini_api_key
    if (!this.geminiApiKey) {
      console.warn('VITE_GEMINI_API_KEY not set. Skipping transcription.');
      return '';
    }

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = this.arrayBufferToBase64(arrayBuffer);

      // Gemini audio transcription via REST (multimodal prompt)
      // Use v1 endpoint and a supported model name
      // See docs: https://ai.google.dev/gemini-api/docs
      const model = 'gemini-2.5-flash';
      const response = await fetch('https://generativelanguage.googleapis.com/v1/models/' + model + ':generateContent?key=' + this.geminiApiKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: 'Transcribe the following audio to text. Return only the transcript in plain English without extra commentary.' },
                {
                  inline_data: {
                    mime_type: audioBlob.type || 'audio/webm',
                    data: base64,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error('Gemini API error: ' + errText);
      }

      const result = await response.json();
      // Extract text from candidates; handle both array of parts and single part
      const parts = result?.candidates?.[0]?.content?.parts || [];
      const text = parts
        .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
        .join(' ')
        .trim();
      return text || '';
    } catch (err) {
      console.error('Gemini transcription failed:', err);
      return '';
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const uploadService = new UploadService();
