import React, { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const SocialShare = ({ title, description, url, image, className = '' }) => {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const shareUrl = url || window.location.href;
  const shareTitle = title || 'Check out this service on HouseWise!';
  const shareDescription = description || 'Professional home services at your doorstep.';

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareTitle}\n${shareDescription}\n${shareUrl}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareTitle)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareDescription, url: shareUrl });
      } catch (e) {
        if (e.name !== 'AbortError') setIsOpen(true);
      }
    } else {
      setIsOpen(true);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleNativeShare}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
          bg-surface-raised hover:bg-surface-hover border border-surface-border
          text-content-secondary hover:text-content-primary transition-all duration-200"
      >
        <Share2 className="w-4 h-4" />
        <span>Share</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-56 p-3 rounded-xl bg-surface-raised border border-surface-border shadow-xl">
            <p className="text-xs text-content-muted mb-2 font-medium">Share via</p>
            <div className="grid grid-cols-4 gap-2 mb-3">
              <a href={shareLinks.whatsapp} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-surface-hover transition-colors">
                <span className="text-lg">💬</span>
                <span className="text-[10px] text-content-muted">WhatsApp</span>
              </a>
              <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-surface-hover transition-colors">
                <span className="text-lg">📘</span>
                <span className="text-[10px] text-content-muted">Facebook</span>
              </a>
              <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-surface-hover transition-colors">
                <span className="text-lg">🐦</span>
                <span className="text-[10px] text-content-muted">Twitter</span>
              </a>
              <a href={shareLinks.telegram} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-surface-hover transition-colors">
                <span className="text-lg">✈️</span>
                <span className="text-[10px] text-content-muted">Telegram</span>
              </a>
            </div>
            <button
              onClick={copyToClipboard}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm
                bg-surface-hover hover:bg-surface-active text-content-secondary transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SocialShare;
