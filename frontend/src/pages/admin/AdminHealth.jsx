import React, { useState, useEffect } from 'react';
import { Activity, Database, Server, Clock, Cpu, HardDrive, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { adminAPIService } from '../../services/adminAPI';
import AdminSkeleton from '../../components/admin/AdminSkeleton';

const AdminHealth = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const response = await adminAPIService.getHealthCheck();
      if (response.success) {
        setHealth(response.data);
      } else {
        setHealth({ status: 'degraded', message: response.message });
      }
    } catch (err) {
      setHealth({ status: 'down', message: err.message || 'Unable to reach server' });
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && !health) return <AdminSkeleton type="cards" />;

  const statusColor = {
    healthy: 'text-green-400 bg-green-500/10',
    degraded: 'text-yellow-400 bg-yellow-500/10',
    down: 'text-red-400 bg-red-500/10',
  };

  const status = health?.status || 'down';
  const uptime = health?.uptime ? formatUptime(health.uptime) : 'Unknown';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-content-primary">System Health</h1>
          <p className="text-body text-content-muted mt-1">Real-time system status and metrics</p>
        </div>
        <div className="flex items-center gap-3">
          {lastChecked && <span className="text-[10px] text-content-muted">Last checked: {lastChecked.toLocaleTimeString()}</span>}
          <button onClick={fetchHealth} className="btn btn-secondary btn-sm flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Status Banner */}
      <div className={`card p-5 border ${status === 'healthy' ? 'border-green-500/20' : status === 'degraded' ? 'border-yellow-500/20' : 'border-red-500/20'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${statusColor[status]} flex items-center justify-center`}>
            {status === 'healthy' ? <Wifi className="w-6 h-6" /> : status === 'degraded' ? <Activity className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
          </div>
          <div>
            <h2 className={`text-lg font-bold capitalize ${status === 'healthy' ? 'text-green-400' : status === 'degraded' ? 'text-yellow-400' : 'text-red-400'}`}>
              System {status}
            </h2>
            <p className="text-xs text-content-muted">{health?.message || 'All systems operational'}</p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Clock} label="Uptime" value={uptime} color="blue" />
        <MetricCard icon={Server} label="Environment" value={health?.environment || 'development'} color="purple" />
        <MetricCard icon={Cpu} label="Memory Used" value={health?.memory ? `${Math.round(health.memory.heapUsed / 1024 / 1024)}MB` : 'N/A'} sub={health?.memory ? `/ ${Math.round(health.memory.heapTotal / 1024 / 1024)}MB` : ''} color="orange" />
        <MetricCard icon={Database} label="Database" value={health?.database || 'Unknown'} color={health?.database === 'connected' ? 'green' : 'red'} />
      </div>

      {/* Services Status */}
      {health?.services && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-content-primary mb-4">Service Status</h3>
          <div className="space-y-3">
            {Object.entries(health.services).map(([name, info]) => (
              <div key={name} className="flex items-center justify-between py-2 border-b border-surface-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${info.status === 'up' || info.status === 'connected' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-sm text-content-primary capitalize">{name}</span>
                </div>
                <div className="flex items-center gap-3">
                  {info.responseTime && <span className="text-xs text-content-muted">{info.responseTime}ms</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${info.status === 'up' || info.status === 'connected' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {info.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Rate / Throttle Info */}
      {health?.rateLimits && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-content-primary mb-4">Rate Limiting</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-surface-raised">
              <p className="text-xs text-content-muted">Requests/min (avg)</p>
              <p className="text-lg font-bold text-content-primary">{health.rateLimits.avgPerMin || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-raised">
              <p className="text-xs text-content-muted">Throttled (last hour)</p>
              <p className="text-lg font-bold text-yellow-400">{health.rateLimits.throttled || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-raised">
              <p className="text-xs text-content-muted">Blocked IPs</p>
              <p className="text-lg font-bold text-red-400">{health.rateLimits.blocked || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* System Info */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-content-primary mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {health?.nodeVersion && <InfoRow label="Node.js" value={health.nodeVersion} />}
          {health?.platform && <InfoRow label="Platform" value={health.platform} />}
          {health?.pid && <InfoRow label="Process ID" value={health.pid} />}
          {health?.timestamp && <InfoRow label="Server Time" value={new Date(health.timestamp).toLocaleString()} />}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, sub, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    orange: 'bg-orange-500/10 text-orange-400',
    purple: 'bg-purple-500/10 text-purple-400',
    red: 'bg-red-500/10 text-red-400',
  };
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div>
          <p className="text-[10px] text-content-muted uppercase tracking-wider">{label}</p>
          <p className="text-sm font-bold text-content-primary capitalize">{value}{sub && <span className="text-content-muted font-normal"> {sub}</span>}</p>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between py-2 px-3 rounded bg-surface-raised">
    <span className="text-content-muted">{label}</span>
    <span className="text-content-primary font-mono">{value}</span>
  </div>
);

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default AdminHealth;
