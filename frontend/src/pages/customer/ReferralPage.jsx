import React, { useState, useEffect } from 'react';
import { Copy, Check, Gift, Users, TrendingUp, Share2, MessageCircle, UserPlus, ShoppingBag, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { referralsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
  registered: { text: 'Joined', color: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  first_booking: { text: 'Booked', color: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
  rewarded: { text: '₹50 Earned', color: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
};

const STEPS = [
  { icon: Share2, title: 'Share Code', desc: 'Share your unique code with friends' },
  { icon: UserPlus, title: 'Friend Joins', desc: 'They sign up using your code' },
  { icon: ShoppingBag, title: 'First Booking', desc: 'They complete their first service' },
  { icon: Award, title: 'You Earn ₹50', desc: 'Reward credited to your account' },
];

const ReferralPage = () => {
  const { user } = useAuth();
  const [referralData, setReferralData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const [codeRes, statsRes] = await Promise.all([
        referralsAPI.getMyCode(),
        referralsAPI.getStats()
      ]);
      // axios response interceptor already unwraps response.data,
      // so codeRes = { success, data: { referralCode, ... } }
      setReferralData({
        ...(codeRes.data || {}),
        ...(statsRes.data || {})
      });
    } catch (error) {
      console.error('Referral fetch error:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!referralData?.referralCode) return;
    try {
      await navigator.clipboard.writeText(referralData.referralCode);
      setCopied(true);
      toast.success('Referral code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const shareText = `Join HouseWise Services using my referral code: ${referralData?.referralCode}\nGet professional home services at your doorstep! Sign up now.`;

  const shareReferral = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Join HouseWise', text: shareText }); } catch {}
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success('Share text copied!');
    }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-coral-500 to-orange-500 flex items-center justify-center shadow-lg shadow-coral-500/20">
          <Gift className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-content-primary">Refer & Earn</h1>
        <p className="text-content-secondary mt-1">Invite friends, earn ₹50 for each successful referral</p>
      </div>

      {/* How It Works */}
      <div className="bg-surface-raised rounded-2xl border border-surface-border p-5">
        <h3 className="text-sm font-semibold text-content-primary mb-4 text-center">How It Works</h3>
        <div className="grid grid-cols-4 gap-3">
          {STEPS.map((step, i) => (
            <div key={i} className="text-center">
              <div className="w-10 h-10 mx-auto rounded-xl bg-coral-500/10 flex items-center justify-center mb-2">
                <step.icon className="w-5 h-5 text-coral-500" />
              </div>
              <p className="text-[11px] font-medium text-content-primary leading-tight">{step.title}</p>
              <p className="text-[10px] text-content-muted mt-0.5 leading-tight">{step.desc}</p>
              {i < 3 && <div className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 text-content-muted">→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Referral Code Card */}
      <div className="bg-surface-raised rounded-2xl border border-surface-border p-6 text-center">
        <p className="text-sm text-content-muted mb-2">Your Referral Code</p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-3xl font-bold font-mono tracking-wider text-coral-500 select-all">
            {referralData?.referralCode || '---'}
          </span>
          <button onClick={copyCode}
            className="p-2 rounded-lg bg-surface-hover hover:bg-surface-active transition-colors"
            title="Copy code">
            {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-content-secondary" />}
          </button>
        </div>
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={shareReferral}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-coral-500 hover:bg-coral-600 text-white font-medium transition-colors text-sm">
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button onClick={shareWhatsApp}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors text-sm">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-raised rounded-xl border border-surface-border p-4 text-center">
          <Users className="w-6 h-6 mx-auto text-blue-400 mb-1" />
          <p className="text-2xl font-bold text-content-primary">{referralData?.totalReferrals || 0}</p>
          <p className="text-xs text-content-muted">Friends Invited</p>
        </div>
        <div className="bg-surface-raised rounded-xl border border-surface-border p-4 text-center">
          <TrendingUp className="w-6 h-6 mx-auto text-emerald-400 mb-1" />
          <p className="text-2xl font-bold text-content-primary">{referralData?.successfulReferrals || 0}</p>
          <p className="text-xs text-content-muted">Completed</p>
        </div>
        <div className="bg-surface-raised rounded-xl border border-surface-border p-4 text-center">
          <Gift className="w-6 h-6 mx-auto text-amber-400 mb-1" />
          <p className="text-2xl font-bold text-content-primary">₹{referralData?.totalRewardsEarned || 0}</p>
          <p className="text-xs text-content-muted">Rewards Earned</p>
        </div>
      </div>

      {/* Referred Users */}
      <div className="bg-surface-raised rounded-2xl border border-surface-border p-6">
        <h3 className="font-semibold text-content-primary mb-3">Referred Friends</h3>
        {referralData?.referredUsers?.length > 0 ? (
          <div className="space-y-2">
            {referralData.referredUsers.map((ref, idx) => {
              const st = STATUS_LABELS[ref.status] || STATUS_LABELS.registered;
              return (
                <div key={idx} className="flex items-center justify-between py-2.5 border-b border-surface-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-coral-500/20 to-orange-500/20 flex items-center justify-center text-sm font-semibold text-coral-500">
                      {ref.user?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-content-primary block">{ref.user?.name || 'User'}</span>
                      {ref.joinedAt && <span className="text-[10px] text-content-muted">{new Date(ref.joinedAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${st.color}`}>
                    {st.text}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-10 h-10 mx-auto text-content-muted/30 mb-2" />
            <p className="text-sm text-content-muted">No referrals yet. Share your code to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralPage;
