import { useEffect, useState } from 'react';
import { quotesAPI } from '../../services/api';
import { Tag, CheckCircle, X as XIcon, Loader2, Send, ChevronRight } from 'lucide-react';

/**
 * QuoteThread (`qt-*` namespace)
 * Renders a back-and-forth offer thread for a quote_pending booking.
 * Both customer and provider can post counter offers; either can accept the
 * latest offer made by the other party, or close the negotiation.
 */
export default function QuoteThread({ booking, currentUser, onUpdate }) {
  const [offers, setOffers] = useState(booking?.quote?.offers || []);
  const [budget] = useState(booking?.quote?.requestedBudget);
  const [requestMsg] = useState(booking?.quote?.requestedMessage);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    setOffers(booking?.quote?.offers || []);
  }, [booking]);

  const meId = String(currentUser?._id || currentUser?.id || '');
  const isCustomer = String(booking?.customer?._id || booking?.customer) === meId;
  const isProvider = String(booking?.provider?._id || booking?.provider) === meId;
  const status = booking?.status;
  const isOpen = status === 'quote_pending';

  const last = offers[offers.length - 1];
  const lastByMe = last && (
    (isCustomer && last.byRole === 'customer') ||
    (isProvider && last.byRole === 'housewife')
  );
  const canAcceptLast = isOpen && last && !lastByMe;

  const fmt = (d) => new Date(d).toLocaleString('en-IN', { day: 'short', month: 'short', hour: '2-digit', minute: '2-digit' });

  const submitOffer = async (e) => {
    e.preventDefault();
    setErr('');
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setErr('Enter a valid amount');
      return;
    }
    try {
      setBusy(true);
      await quotesAPI.addOffer(booking._id, { amount: Number(amount), message });
      setAmount('');
      setMessage('');
      onUpdate?.();
    } catch (e2) {
      setErr(e2?.message || e2?.response?.data?.message || 'Failed to send offer');
    } finally {
      setBusy(false);
    }
  };

  const acceptLast = async () => {
    setErr('');
    try {
      setBusy(true);
      await quotesAPI.accept(booking._id);
      onUpdate?.();
    } catch (e2) {
      setErr(e2?.message || 'Failed to accept');
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!confirm('Close this negotiation? You can no longer counter-offer.')) return;
    setErr('');
    try {
      setBusy(true);
      await quotesAPI.reject(booking._id, 'Closed by user');
      onUpdate?.();
    } catch (e2) {
      setErr(e2?.message || 'Failed to close');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="qt-card">
      <div className="qt-head">
        <Tag size={14} />
        <h3>Quote &amp; Negotiation</h3>
        <span className={`qt-status qt-status-${status}`}>{status?.replace('_', ' ')}</span>
      </div>

      {budget != null && (
        <div className="qt-budget">
          <span>Customer's budget</span>
          <strong>₹{Number(budget).toLocaleString('en-IN')}</strong>
        </div>
      )}
      {requestMsg && (
        <div className="qt-message qt-message-req">
          <strong>Request:</strong> <span>{requestMsg}</span>
        </div>
      )}

      <div className="qt-thread">
        {offers.length === 0 && (
          <div className="qt-empty">No offers yet — make the first one.</div>
        )}
        {offers.map((o, i) => {
          const mine = (isCustomer && o.byRole === 'customer') || (isProvider && o.byRole === 'housewife');
          return (
            <div key={i} className={`qt-offer ${mine ? 'me' : 'them'}`}>
              <div className="qt-offer-head">
                <span className="qt-amount">₹{Number(o.amount).toLocaleString('en-IN')}</span>
                <span className="qt-by">{o.byRole === 'customer' ? 'Customer' : 'Provider'}</span>
                <span className="qt-when">{fmt(o.at)}</span>
              </div>
              {o.message && <p className="qt-offer-msg">{o.message}</p>}
              {o.accepted && <span className="qt-accepted"><CheckCircle size={12} /> Accepted</span>}
            </div>
          );
        })}
      </div>

      {isOpen && (
        <>
          {canAcceptLast && (
            <button className="qt-accept-btn" onClick={acceptLast} disabled={busy}>
              {busy ? <Loader2 size={14} className="qt-spin" /> : <CheckCircle size={14} />}
              Accept ₹{Number(last.amount).toLocaleString('en-IN')} <ChevronRight size={14} />
            </button>
          )}
          <form className="qt-composer" onSubmit={submitOffer}>
            <input
              type="number" min="0" step="50"
              className="qt-amount-input"
              placeholder="Counter ₹"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              type="text"
              className="qt-message-input"
              placeholder="Message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
            />
            <button type="submit" className="qt-send-btn" disabled={busy}>
              {busy ? <Loader2 size={14} className="qt-spin" /> : <Send size={14} />}
              Send
            </button>
          </form>
          <button className="qt-reject-btn" onClick={reject} disabled={busy} type="button">
            <XIcon size={14} /> Close negotiation
          </button>
        </>
      )}

      {err && <div className="qt-err">{err}</div>}
    </div>
  );
}
