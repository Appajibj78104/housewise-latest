import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Image as ImageIcon, CheckCheck, Check, Loader2 } from 'lucide-react';
import { chatAPI } from '../../services/api';
import { getSocket } from '../../hooks/useSocket';

/**
 * BookingChat (`bc-*` namespace)
 * Slide-in drawer with real-time chat between customer and provider for a single booking.
 * Subscribes to Socket.io room `booking:{id}` and listens for `chat:message`/`chat:read`/`chat:typing`.
 */
export default function BookingChat({ bookingId, currentUser, counterpart, open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [isCounterpartTyping, setIsCounterpartTyping] = useState(false);
  const listRef = useRef(null);
  const fileRef = useRef(null);
  const typingTimeout = useRef(null);

  const me = useMemo(() => String(currentUser?._id || currentUser?.id || ''), [currentUser]);
  const them = useMemo(() => String(counterpart?._id || counterpart?.id || ''), [counterpart]);

  // Load history + subscribe socket
  useEffect(() => {
    if (!open || !bookingId) return;
    let cancelled = false;
    setLoading(true);
    setErr('');
    (async () => {
      try {
        const res = await chatAPI.getMessages(bookingId);
        if (cancelled) return;
        setMessages(res.data?.messages || []);
        chatAPI.markRead(bookingId).catch(() => {});
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Failed to load chat');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const socket = getSocket();
    if (socket) {
      socket.emit('booking:subscribe', bookingId);
      const onMsg = (m) => {
        if (String(m.bookingId) !== String(bookingId)) return;
        setMessages(prev => {
          // Dedup if we already added it (sender path)
          if (prev.some(x => String(x._id) === String(m._id))) return prev;
          return [...prev, m];
        });
        if (String(m.from) !== me) {
          chatAPI.markRead(bookingId).catch(() => {});
        }
      };
      const onTyping = (p) => {
        if (String(p.bookingId) !== String(bookingId)) return;
        if (String(p.userId) === me) return;
        setIsCounterpartTyping(p.isTyping);
      };
      socket.on('chat:message', onMsg);
      socket.on('chat:typing', onTyping);
      return () => {
        cancelled = true;
        socket.emit('booking:unsubscribe', bookingId);
        socket.off('chat:message', onMsg);
        socket.off('chat:typing', onTyping);
      };
    }
    return () => { cancelled = true; };
  }, [open, bookingId, me]);

  // Auto-scroll bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isCounterpartTyping]);

  const emitTyping = (isTyping) => {
    const socket = getSocket();
    if (socket && bookingId) {
      socket.emit('chat:typing', { bookingId, isTyping });
    }
  };

  const handleType = (v) => {
    setText(v);
    emitTyping(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => emitTyping(false), 1500);
  };

  const send = async (e) => {
    e?.preventDefault();
    if (!text.trim() && !file) return;
    setSending(true);
    setErr('');
    try {
      const res = await chatAPI.sendMessage(bookingId, { message: text, image: file });
      const msg = res.data;
      if (msg?._id) {
        setMessages(prev => [...prev, msg]);
      }
      setText('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      emitTyping(false);
    } catch (e2) {
      setErr(e2?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="bc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="bc-drawer" role="dialog" aria-label="Booking chat">
        <header className="bc-head">
          <div className="bc-counterpart">
            <div className="bc-avatar">
              {counterpart?.profileImage
                ? <img src={counterpart.profileImage} alt={counterpart.name || ''} />
                : <span>{(counterpart?.name || '?').slice(0, 1).toUpperCase()}</span>}
            </div>
            <div className="bc-counterpart-info">
              <strong>{counterpart?.name || 'Conversation'}</strong>
              <span className="bc-sub">Booking chat</span>
            </div>
          </div>
          <button className="bc-close" onClick={onClose} aria-label="Close chat"><X size={18} /></button>
        </header>

        <div ref={listRef} className="bc-list">
          {loading && (
            <div className="bc-loading"><Loader2 size={18} className="bc-spin" /> Loading…</div>
          )}
          {!loading && messages.length === 0 && (
            <div className="bc-empty">Say hi to {counterpart?.name || 'them'}!</div>
          )}
          {messages.map((m, i) => {
            const mine = String(m.from?._id || m.from) === me;
            return (
              <div key={m._id || i} className={`bc-msg ${mine ? 'me' : 'them'}`}>
                {m.photos?.[0] && (
                  <img src={m.photos[0]} alt="attachment" className="bc-msg-img" />
                )}
                {m.message && <span className="bc-msg-text">{m.message}</span>}
                <span className="bc-msg-meta">
                  {new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  {mine && (
                    (m.readBy || []).map(String).includes(them)
                      ? <CheckCheck size={12} className="bc-msg-read" />
                      : <Check size={12} className="bc-msg-sent" />
                  )}
                </span>
              </div>
            );
          })}
          {isCounterpartTyping && <div className="bc-typing">typing…</div>}
        </div>

        {err && <div className="bc-err">{err}</div>}

        <form className="bc-composer" onSubmit={send}>
          <label className="bc-attach" title="Attach a photo">
            <ImageIcon size={18} />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          {file && <span className="bc-attach-name">{file.name.slice(0, 18)}</span>}
          <input
            type="text"
            value={text}
            onChange={(e) => handleType(e.target.value)}
            placeholder="Write a message…"
            className="bc-input"
            maxLength={2000}
          />
          <button type="submit" className="bc-send" disabled={sending || (!text.trim() && !file)}>
            {sending ? <Loader2 size={16} className="bc-spin" /> : <Send size={16} />}
          </button>
        </form>
      </aside>
    </div>,
    document.body
  );
}
