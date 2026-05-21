import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, FileText, Printer, ArrowLeft, Eye } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const InvoicePage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const invoiceRef = useRef(null);

  useEffect(() => {
    if (bookingId) fetchInvoice();
  }, [bookingId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/invoices/${bookingId}`);
      const data = res.data?.invoice || res.data;
      if (!data || !data.booking) {
        setError('Invoice data not found');
        return;
      }
      setInvoice(data);
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to load invoice';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/invoices/${bookingId}/download`, { responseType: 'blob' });
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      window.print();
    }
  };

  const handleBackToBooking = () => {
    navigate(`/customer/bookings/${bookingId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral-500" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <button onClick={handleBackToBooking} className="flex items-center gap-2 px-3 py-2 rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-hover transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-center py-12 rounded-xl bg-surface-raised border border-surface-border">
          <FileText className="w-12 h-12 mx-auto text-content-muted mb-3" />
          <p className="text-content-secondary">{error || 'Invoice not available'}</p>
          <button onClick={fetchInvoice} className="mt-4 px-4 py-2 rounded-lg bg-coral-500 hover:bg-coral-600 text-white font-medium transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* ═══ HEADER LIKE REVIEW PAGE ═══ */}
      <header className="ip-header flex items-center justify-between mb-6 pb-4 border-b border-surface-border print:hidden">
        <div>
          <h1 className="text-26 font-700 text-content-primary">Invoice</h1>
          <p className="text-13 text-content-muted mt-1">Official billing document for your service</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-raised border border-surface-border text-content-secondary hover:text-content-primary transition-colors">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-coral-500 hover:bg-coral-600 text-white font-medium transition-colors">
            <Download className="w-4 h-4" /> Download
          </button>
        </div>
      </header>

      {/* ═══ BOOKING POST CARD (Like Review Page Write Review CTA) ═══ */}
      <div className="ip-booking-card mb-8 p-6 rounded-xl bg-gradient-to-br from-coral-500/10 to-coral-400/5 border-2 border-coral-500/30 print:border-0 print:bg-transparent print:p-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-content-primary flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-coral-500" />
              Invoice for Service
            </h2>
            <p className="text-sm text-content-muted mb-4">
              Booking ID: <span className="font-mono font-semibold text-content-primary">{invoice.booking._id || invoice.booking.id}</span>
            </p>

            {/* Service Details */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-content-muted mb-1">Service</p>
                <p className="font-medium text-content-primary">{invoice.service?.title || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-content-muted mb-1">Date</p>
                <p className="font-medium text-content-primary">{invoice.booking?.scheduledDate ? new Date(invoice.booking.scheduledDate).toLocaleDateString('en-IN') : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-content-muted mb-1">Time</p>
                <p className="font-medium text-content-primary">{invoice.booking?.scheduledTime?.start || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Right Section: Total + Action Button */}
          <div className="ml-6 text-right flex flex-col items-end gap-3 print:hidden">
            <div>
              <p className="text-2xl font-bold text-coral-500">₹{invoice.pricing?.total ? invoice.pricing.total.toLocaleString('en-IN') : 'N/A'}</p>
              <p className="text-xs text-content-muted">Total Amount</p>
            </div>
            <button onClick={handleBackToBooking} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-coral-500/12 border border-coral-500/30 text-coral-400 hover:bg-coral-500/20 transition-all font-medium text-13">
              <Eye className="w-4 h-4" /> View Booking
            </button>
          </div>
        </div>
      </div>

      {/* Top Bar: Back Button (Print Hidden) */}
      <div className="mb-4 print:hidden">
        <button onClick={handleBackToBooking}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-hover transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Booking
        </button>
      </div>

      {/* Invoice Document */}
      <div ref={invoiceRef} className="invoice-doc bg-surface-raised rounded-2xl border border-surface-border p-8 print:border-0 print:shadow-none print:p-0 print:bg-white">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b border-surface-border">
          <div>
            <h1 className="text-2xl font-bold text-content-primary">{invoice.company.name}</h1>
            <p className="text-sm text-content-muted">{invoice.company.tagline}</p>
            <p className="text-xs text-content-muted mt-1">{invoice.company.address}</p>
            <p className="text-xs text-content-muted">GSTIN: {invoice.company.gstin}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-coral-500">INVOICE</h2>
            <p className="text-sm text-content-muted mt-1">#{invoice.invoiceNumber}</p>
            <p className="text-xs text-content-muted">
              Date: {new Date(invoice.issueDate).toLocaleDateString('en-IN')}
            </p>
            <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              Paid
            </span>
          </div>
        </div>

        {/* Customer & Provider */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-content-muted mb-2">Bill To</h3>
            <p className="font-medium text-content-primary">{invoice.customer.name}</p>
            <p className="text-sm text-content-secondary">{invoice.customer.email}</p>
            <p className="text-sm text-content-secondary">{invoice.customer.phone}</p>
          </div>
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-content-muted mb-2">Service Provider</h3>
            <p className="font-medium text-content-primary">{invoice.provider.name}</p>
            <p className="text-sm text-content-secondary">{invoice.provider.email}</p>
            <p className="text-sm text-content-secondary">{invoice.provider.phone}</p>
          </div>
        </div>

        {/* Service Details Table */}
        <div className="mb-8 overflow-hidden rounded-xl border border-surface-border">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-hover">
                <th className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-wider text-content-muted">Service</th>
                <th className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-wider text-content-muted">Date</th>
                <th className="text-right py-3 px-4 text-[10px] font-semibold uppercase tracking-wider text-content-muted">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-4 px-4">
                  <p className="font-medium text-content-primary">{invoice.service.title}</p>
                  <p className="text-xs text-content-muted capitalize">{invoice.service.category}</p>
                  {invoice.service.description && (
                    <p className="text-xs text-content-muted mt-1">{invoice.service.description}</p>
                  )}
                </td>
                <td className="py-4 px-4 text-sm text-content-secondary">
                  {new Date(invoice.booking.scheduledDate).toLocaleDateString('en-IN')}
                  {invoice.booking.scheduledTime && (
                    <span className="block text-xs text-content-muted">
                      {typeof invoice.booking.scheduledTime === 'string'
                        ? invoice.booking.scheduledTime
                        : `${invoice.booking.scheduledTime.start || ''} - ${invoice.booking.scheduledTime.end || ''}`}
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 text-right font-semibold text-content-primary">
                  ₹{invoice.pricing.subtotal.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2 bg-surface-hover rounded-xl p-4">
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Subtotal</span>
              <span className="text-content-primary">₹{invoice.pricing.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Tax (GST {invoice.pricing.taxRate}%)</span>
              <span className="text-content-primary">₹{invoice.pricing.taxAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-2 mt-2 border-t border-surface-border">
              <span className="font-semibold text-content-primary">Total</span>
              <span className="font-bold text-lg text-coral-500">₹{invoice.pricing.total.toLocaleString('en-IN')}</span>
            </div>
            {invoice.pricing.paymentMethod && (
              <div className="flex justify-between text-xs pt-1">
                <span className="text-content-muted">Payment</span>
                <span className="text-content-muted capitalize">{invoice.pricing.paymentMethod}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-5 border-t border-surface-border text-center">
          <p className="text-xs text-content-muted">
            Thank you for using {invoice.company.name}! • {invoice.company.email}
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvoicePage;
