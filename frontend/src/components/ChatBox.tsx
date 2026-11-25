import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link2, MessageCircle, Mic, Paperclip, Send, X } from 'lucide-react';
import { fileToDataUrl, getClientToken, schoolsApi, type TelegramBind } from '../lib/schools';

interface ChatMessage {
  id: string;
  projectId?: string;
  senderId?: string;
  senderName?: string;
  senderRole?: string;
  message?: string;
  read?: boolean;
  channel?: string;
  voiceFileId?: string;
  fileName?: string;
  mimeType?: string;
  createdAt?: string;
}

interface ChatBoxProps {
  projectId?: string;
  title?: string;
  compact?: boolean;
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the voice note.'));
    reader.readAsDataURL(blob);
  });
}

export default function ChatBox({ projectId, title = 'School support', compact = false }: ChatBoxProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [unseen, setUnseen] = useState(0);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [recording, setRecording] = useState(false);
  const [telegram, setTelegram] = useState<TelegramBind | null>(null);
  const [bind, setBind] = useState<TelegramBind | null>(null);
  const [chatId, setChatId] = useState('');
  const [busy, setBusy] = useState(false);

  const seenRef = useRef<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioUrlsRef = useRef<Record<string, string>>({});
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!getClientToken()) return;
    try {
      const data = await schoolsApi.getMessages();
      const list = Array.isArray(data?.messages) ? (data.messages as ChatMessage[]) : [];
      if (mountedRef.current) setMessages(list);
    } catch (refreshError) {
      if (mountedRef.current) setError(messageOf(refreshError));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!getClientToken()) return;
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 8000);
    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [refresh]);

  useEffect(() => {
    if (open) {
      messages.forEach((item) => seenRef.current.add(item.id));
      setUnseen(0);
      return;
    }
    const fresh = messages.filter((item) =>
      (item.senderRole === 'admin' || item.senderRole === 'telegram' || item.channel === 'telegram')
      && !item.read
      && !seenRef.current.has(item.id),
    );
    if (!fresh.length) return;
    fresh.forEach((item) => seenRef.current.add(item.id));
    setUnseen((value) => value + fresh.length);
  }, [messages, open]);

  useEffect(() => {
    if (!getClientToken()) return;
    let cancelled = false;
    const ids = Array.from(new Set(messages.map((item) => item.voiceFileId).filter((id): id is string => Boolean(id))));
    ids.forEach((id) => {
      if (audioUrlsRef.current[id]) return;
      void schoolsApi.fetchVoiceBlob(id).then((url) => {
        if (!mountedRef.current || cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        audioUrlsRef.current[id] = url;
        setAudioUrls({ ...audioUrlsRef.current });
      }).catch(() => undefined);
    });
    return () => { cancelled = true; };
  }, [messages]);

  useEffect(() => () => {
    Object.values(audioUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const connectTelegram = useCallback(async () => {
    if (!getClientToken()) {
      setError('Sign in to connect Telegram.');
      return;
    }
    setBusy(true);
    try {
      const status = await schoolsApi.getTelegramStatus();
      if (mountedRef.current) setTelegram(status);
      if (!status?.connected && !status?.client?.telegramChatId) {
        const created = await schoolsApi.createTelegramBindCode();
        if (mountedRef.current) setBind(created);
      }
    } catch (connectError) {
      if (mountedRef.current) setError(messageOf(connectError));
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }, []);

  const changeChatId = async (event: FormEvent) => {
    event.preventDefault();
    if (!chatId.trim()) {
      setError('Enter a valid Telegram chat ID.');
      return;
    }
    setBusy(true);
    try {
      const status = await schoolsApi.updateTelegram({ telegramChatId: chatId.trim(), telegramEnabled: true });
      if (mountedRef.current) setTelegram(status);
      setChatId('');
    } catch (saveError) {
      setError(messageOf(saveError));
    } finally {
      setBusy(false);
    }
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !getClientToken()) return;
    setBusy(true);
    try {
      await schoolsApi.sendMessage(text);
      setDraft('');
      await refresh();
    } catch (sendError) {
      setError(messageOf(sendError));
    } finally {
      setBusy(false);
    }
  };

  const attach = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const data = await fileToDataUrl(file);
      if (typeof schoolsApi.uploadDocument === 'function') {
        await schoolsApi.uploadDocument({
          title: file.name,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          category: 'other',
          data,
        });
      } else if (file.type.startsWith('audio/')) {
        await schoolsApi.sendVoice({ fileName: file.name, mimeType: file.type || 'audio/webm', data });
      } else {
        window.alert('Only PDF, images and audio files can be attached.');
        return;
      }
      await schoolsApi.sendMessage(`Attached: ${file.name}`);
      await refresh();
    } catch (attachError) {
      setError(messageOf(attachError));
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (streamRef.current === stream) streamRef.current = null;
        if (recorderRef.current === recorder) recorderRef.current = null;
        if (!mountedRef.current) return;
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        void (async () => {
          try {
            const data = await blobToDataUrl(blob);
            await schoolsApi.sendVoice({ fileName: 'voice-note.webm', mimeType: blob.type || 'audio/webm', data });
            await refresh();
          } catch (voiceError) {
            if (mountedRef.current) setError(messageOf(voiceError));
          }
        })();
      };
      recorder.start();
      setRecording(true);
    } catch (recordError) {
      setError(messageOf(recordError));
    }
  };

  const telegramConnected = Boolean(telegram?.connected || telegram?.chatId || telegram?.client?.telegramChatId || telegram?.client?.telegramEnabled);

  return (
    <>
      {open && (
        <section className={`chat-panel${compact ? ' chat-panel-compact' : ''}`} role="dialog" aria-label={title} data-project-id={projectId}>
          <header className="chat-header">
            <div className="chat-header-text">
              <strong>{title}</strong>
              <span>{telegramConnected ? 'Telegram connected' : getClientToken() ? 'We usually reply in a few minutes' : 'Sign in to chat'}</span>
            </div>
            <button type="button" className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={16} />
            </button>
          </header>

          <div className="chat-messages">
            {messages.map((item) => (
              <div key={item.id} className={`chat-bubble ${item.senderRole === 'client' ? 'chat-bubble-own' : 'chat-bubble-other'}`}>
                {item.senderName && item.senderRole !== 'client' && <span className="chat-bubble-sender">{item.senderName}</span>}
                {item.message && <span>{item.message}</span>}
                {item.voiceFileId && audioUrls[item.voiceFileId] && (
                  <audio className="chat-audio" controls src={audioUrls[item.voiceFileId]} />
                )}
                {item.fileName && <span className="chat-bubble-file">{item.fileName}</span>}
                {item.createdAt && <span className="chat-bubble-time">{new Date(item.createdAt).toLocaleString()}</span>}
              </div>
            ))}
            {!messages.length && <p className="chat-empty">No messages yet. Send a message to reach school support.</p>}
            {error && <p className="chat-error">{error}</p>}
          </div>

          <div className="chat-connect">
            {telegramConnected ? (
              <>
                <span className="chat-connect-label">Telegram connected</span>
                <form className="chat-connect-form" onSubmit={changeChatId}>
                  <input
                    className="input"
                    placeholder={telegram?.chatId ? `Chat ID: ${telegram.chatId}` : 'Change Telegram chat ID'}
                    value={chatId}
                    onChange={(event) => setChatId(event.target.value)}
                  />
                  <button type="submit" disabled={busy}>Save</button>
                </form>
              </>
            ) : (
              <>
                <button type="button" onClick={() => void connectTelegram()} disabled={busy}>
                  <Link2 size={13} /> Connect Telegram
                </button>
                {bind?.botUrl && <a href={bind.botUrl} target="_blank" rel="noreferrer">Open Telegram bot</a>}
                {bind?.code && <code>{bind.code}</code>}
              </>
            )}
          </div>

          <form className="chat-composer" onSubmit={send}>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*,audio/*"
              hidden
              onChange={(event) => void attach(event)}
            />
            <button type="button" className="chat-attach" onClick={() => fileRef.current?.click()} aria-label="Attach file">
              <Paperclip size={16} />
            </button>
            <button
              type="button"
              className={`chat-voice${recording ? ' chat-voice-active' : ''}`}
              onClick={() => void toggleRecording()}
              aria-label={recording ? 'Stop recording' : 'Record voice note'}
            >
              <Mic size={16} />
            </button>
            <input
              className="chat-input"
              placeholder="Write a message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit" className="chat-send" disabled={busy || !draft.trim()} aria-label="Send message">
              <Send size={16} />
            </button>
          </form>
        </section>
      )}

      <button type="button" className="chat-toggle" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close chat' : 'Open chat'}>
        <MessageCircle size={18} />
        <span>Chat</span>
        {unseen > 0 && <span className="chat-unread">{unseen}</span>}
      </button>
    </>
  );
}
