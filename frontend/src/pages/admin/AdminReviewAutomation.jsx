import React, { useState, useEffect } from 'react';
import { reviewAutomationAPI } from '../../services/api';
import { Bot, BarChart3, AlertTriangle, RefreshCw, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';

const AdminReviewAutomation = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const res = await reviewAutomationAPI.getInsights();
      if (res.data?.success) setInsights(res.data.data);
      else setError('Failed to load insights');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInsights(); }, []);

  const handleBatchAnalyze = async () => {
    try {
      setAnalyzing(true);
      await reviewAutomationAPI.batchAnalyze();
      await fetchInsights();
    } catch (e) {
      setError('Batch analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 bg-surface-border rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-surface-border rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const sentimentDist = insights?.sentimentDistribution || {};
  const totalReviews = insights?.totalReviews || 0;
  const flagged = insights?.flaggedReviews || 0;
  const avgSentiment = insights?.averageSentimentScore?.toFixed(2) || '0.00';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-content-primary flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" /> Review Automation & Sentiment
          </h1>
          <p className="text-sm text-content-muted mt-1">AI-powered sentiment analysis and automated review moderation</p>
        </div>
        <button
          onClick={handleBatchAnalyze}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-all text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
          {analyzing ? 'Analyzing...' : 'Run Batch Analysis'}
        </button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-overlay border border-surface-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-content-muted uppercase tracking-wide">Total Reviews</span>
          </div>
          <p className="text-2xl font-bold text-content-primary">{totalReviews}</p>
        </div>

        <div className="bg-surface-overlay border border-surface-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <ThumbsUp className="w-5 h-5 text-green-400" />
            <span className="text-xs text-content-muted uppercase tracking-wide">Positive</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{sentimentDist.positive || 0}</p>
        </div>

        <div className="bg-surface-overlay border border-surface-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <ThumbsDown className="w-5 h-5 text-red-400" />
            <span className="text-xs text-content-muted uppercase tracking-wide">Negative</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{sentimentDist.negative || 0}</p>
        </div>

        <div className="bg-surface-overlay border border-surface-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span className="text-xs text-content-muted uppercase tracking-wide">Flagged</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{flagged}</p>
        </div>
      </div>

      {/* Sentiment breakdown */}
      <div className="bg-surface-overlay border border-surface-border rounded-xl p-6">
        <h2 className="text-sm font-bold text-content-primary mb-4">Sentiment Distribution</h2>
        <div className="space-y-3">
          {[
            { label: 'Positive', count: sentimentDist.positive || 0, color: 'bg-green-400', icon: <ThumbsUp className="w-3.5 h-3.5" /> },
            { label: 'Neutral', count: sentimentDist.neutral || 0, color: 'bg-gray-400', icon: <Minus className="w-3.5 h-3.5" /> },
            { label: 'Negative', count: sentimentDist.negative || 0, color: 'bg-red-400', icon: <ThumbsDown className="w-3.5 h-3.5" /> },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="w-20 text-xs text-content-secondary flex items-center gap-1.5">{item.icon}{item.label}</span>
              <div className="flex-1 h-3 bg-surface-border rounded-full overflow-hidden">
                <div className={`h-full ${item.color} rounded-full transition-all duration-500`}
                  style={{ width: totalReviews > 0 ? `${(item.count / totalReviews) * 100}%` : '0%' }} />
              </div>
              <span className="text-xs font-medium text-content-primary w-8 text-right">{item.count}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-surface-border flex items-center justify-between">
          <span className="text-xs text-content-muted">Average sentiment score</span>
          <span className="text-sm font-bold text-content-primary">{avgSentiment}</span>
        </div>
      </div>

      {/* Aspect insights */}
      {insights?.aspectInsights && Object.keys(insights.aspectInsights).length > 0 && (
        <div className="bg-surface-overlay border border-surface-border rounded-xl p-6">
          <h2 className="text-sm font-bold text-content-primary mb-4">Aspect Insights</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(insights.aspectInsights).map(([aspect, data]) => (
              <div key={aspect} className="text-center p-3 bg-surface-raised rounded-lg border border-surface-border">
                <p className="text-[11px] text-content-muted capitalize mb-1">{aspect}</p>
                <p className="text-lg font-bold text-content-primary">{data.average?.toFixed(1) || '—'}</p>
                <p className="text-[10px] text-content-muted">{data.count || 0} mentions</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReviewAutomation;
