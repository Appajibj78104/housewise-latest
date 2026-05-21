import React, { useState, useEffect, useCallback } from 'react';
import {
  Headphones, MessageCircle, Clock, AlertTriangle, CheckCircle,
  Send, Filter, ChevronDown, User,
} from 'lucide-react';
import { adminAPIService } from '../../services/adminAPI';
import AdminSkeleton from '../../components/admin/AdminSkeleton';

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-yellow-500/10 text-yellow-400' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/10 text-blue-400' },
  awaiting_response: { label: 'Awaiting Response', color: 'bg-purple-500/10 text-purple-400' },
  resolved: { label: 'Resolved', color: 'bg-green-500/10 text-green-400' },
  closed: { label: 'Closed', color: 'bg-gray-500/10 text-gray-400' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-gray-400' },
  medium: { label: 'Medium', color: 'text-yellow-400' },
  high: { label: 'High', color: 'text-orange-400' },
  urgent: { label: 'Urgent', color: 'text-red-400' },
};

const AdminSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [filter, setFilter] = useState({ status: '', priority: '' });
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  const [sending, setSending] = useState(false);

  const fetchTickets = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (filter.status) params.status = filter.status;
      if (filter.priority) params.priority = filter.priority;

      const response = await adminAPIService.getSupportTickets(params);
      if (response.success) {
        setTickets(response.data.tickets);
        setStatusCounts(response.data.statusCounts || {});
        setPagination(response.data.pagination);
      }
    } catch (err) {
      console.error('Fetch tickets error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const openTicket = async (ticket) => {
    setSelectedTicket(ticket);
    try {
      const response = await adminAPIService.getTicketDetail(ticket._id);
      if (response.success) setTicketDetail(response.data);
    } catch (err) {
      console.error('Ticket detail error:', err);
    }
  };

  const handleReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    try {
      setSending(true);
      const response = await adminAPIService.respondToTicket(selectedTicket._id, { message: replyMessage });
      if (response.success) {
        setReplyMessage('');
        setTicketDetail(response.data);
        fetchTickets(pagination.current);
      }
    } catch (err) {
      console.error('Reply error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (ticketId, status) => {
    try {
      await adminAPIService.updateTicketStatus(ticketId, { status });
      fetchTickets(pagination.current);
      if (ticketDetail?._id === ticketId) {
        setTicketDetail(prev => ({ ...prev, status }));
      }
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-content-primary">Support Tickets</h1>
          <p className="text-body text-content-muted mt-1">Handle customer complaints and inquiries</p>
        </div>
        <div className="flex items-center gap-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <span key={status} className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[status]?.color || ''}`}>
              {STATUS_CONFIG[status]?.label}: {count}
            </span>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filter.status}
          onChange={e => setFilter(prev => ({...prev, status: e.target.value}))}
          className="form-input"
        >
          <option value="">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <select
          value={filter.priority}
          onChange={e => setFilter(prev => ({...prev, priority: e.target.value}))}
          className="form-input"
        >
          <option value="">All Priority</option>
          {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      {/* Tickets Layout: List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-2">
          {loading ? (
            <AdminSkeleton type="table" rows={5} cols={4} />
          ) : tickets.length > 0 ? (
            <div className="card overflow-hidden divide-y divide-surface-border">
              {tickets.map(ticket => (
                <div
                  key={ticket._id}
                  onClick={() => openTicket(ticket)}
                  className={`p-4 cursor-pointer hover:bg-surface-hover/50 transition-colors ${selectedTicket?._id === ticket._id ? 'bg-surface-hover/80 border-l-2 border-l-accent-blue-light' : ''}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-sm font-medium text-content-primary truncate">{ticket.subject}</h4>
                    <span className={`ml-2 text-xs font-medium ${PRIORITY_CONFIG[ticket.priority]?.color}`}>
                      {ticket.priority?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-content-muted">{ticket.user?.name || 'Unknown'} · {ticket.category}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_CONFIG[ticket.status]?.color}`}>
                      {STATUS_CONFIG[ticket.status]?.label}
                    </span>
                  </div>
                  <p className="text-xs text-content-muted mt-1">
                    {ticket.ticketId} · {new Date(ticket.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <Headphones className="w-10 h-10 text-content-muted mx-auto mb-3" />
              <p className="text-content-muted">No tickets found</p>
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="flex justify-between mt-3">
              <button onClick={() => fetchTickets(pagination.current - 1)} disabled={pagination.current <= 1} className="btn btn-secondary btn-sm">Prev</button>
              <span className="text-xs text-content-muted self-center">Page {pagination.current}/{pagination.pages}</span>
              <button onClick={() => fetchTickets(pagination.current + 1)} disabled={pagination.current >= pagination.pages} className="btn btn-secondary btn-sm">Next</button>
            </div>
          )}
        </div>

        {/* Ticket Detail */}
        <div className="lg:col-span-3">
          {ticketDetail ? (
            <div className="card p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-heading text-content-primary">{ticketDetail.subject}</h3>
                  <p className="text-xs text-content-muted mt-0.5">
                    {ticketDetail.ticketId} · {ticketDetail.category} · 
                    Created {new Date(ticketDetail.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <select
                  value={ticketDetail.status}
                  onChange={e => handleStatusChange(ticketDetail._id, e.target.value)}
                  className="form-input text-xs"
                >
                  {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-hover/50">
                <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center">
                  <User className="w-4 h-4 text-content-muted" />
                </div>
                <div>
                  <p className="text-sm font-medium text-content-primary">{ticketDetail.user?.name}</p>
                  <p className="text-xs text-content-muted">{ticketDetail.user?.email} · {ticketDetail.user?.role}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {ticketDetail.messages?.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                      msg.sender === 'admin'
                        ? 'bg-accent-blue-muted text-accent-blue-light'
                        : 'bg-surface-hover text-content-secondary'
                    }`}>
                      <p>{msg.message}</p>
                      <p className="text-xs opacity-60 mt-1">
                        {msg.senderName || msg.sender} · {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              {ticketDetail.status !== 'closed' && ticketDetail.status !== 'resolved' && (
                <div className="flex gap-2 pt-2 border-t border-surface-border">
                  <input
                    type="text"
                    value={replyMessage}
                    onChange={e => setReplyMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleReply()}
                    className="form-input flex-1"
                    placeholder="Type your reply..."
                  />
                  <button
                    onClick={handleReply}
                    disabled={sending || !replyMessage.trim()}
                    className="btn btn-primary"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Resolution */}
              {ticketDetail.resolution?.summary && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs font-medium text-green-400">Resolved</span>
                  </div>
                  <p className="text-sm text-content-secondary">{ticketDetail.resolution.summary}</p>
                  <p className="text-xs text-content-muted mt-1">by {ticketDetail.resolution.resolvedBy} · {new Date(ticketDetail.resolution.resolvedAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <MessageCircle className="w-10 h-10 text-content-muted mx-auto mb-3" />
              <p className="text-content-muted">Select a ticket to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupport;
