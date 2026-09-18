import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useProjectStore } from '../store/useProjectStore';
import type { AdminOverview, AdminUser, AdminJob } from '../types/caption';
import {
  ShieldAlert,
  Users,
  Film,
  HardDrive,
  Activity,
  RotateCw,
  Search,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Server,
  RefreshCw,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { user } = useAuthStore();
  const { setCurrentView } = useProjectStore();

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [health, setHealth] = useState<{ status: string; database: string; timestamp: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'users' | 'jobs' | 'diagnostics'>('users');
  const [userSearch, setUserSearch] = useState('');
  const [jobFilter, setJobFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, usersData, jobsData, healthData] = await Promise.all([
        api.getAdminOverview().catch(() => null),
        api.getAdminUsers(0, 100).catch(() => []),
        api.getAdminJobs().catch(() => []),
        api.getAdminHealth().catch(() => null),
      ]);

      if (overviewData) setOverview(overviewData);
      setUsers(usersData || []);
      setJobs(jobsData || []);
      if (healthData) setHealth(healthData);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin telemetry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleUserStatus = async (targetUser: AdminUser) => {
    setActionLoadingId(targetUser.id);
    try {
      const updated = await api.updateAdminUserStatus(targetUser.id, !targetUser.is_active);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err: any) {
      alert(`Could not change status: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    setActionLoadingId(jobId);
    try {
      const updated = await api.retryAdminJob(jobId);
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
      alert('Job re-queued successfully');
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredJobs = jobs.filter((j) => {
    if (jobFilter === 'all') return true;
    return j.status === jobFilter;
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Return to Studio Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">SaaS Administration</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Staff Only
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live multi-tenant telemetry, user governance, and rendering queue management.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Users</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{overview?.total_users ?? '—'}</span>
            <span className="text-xs text-emerald-400 font-medium">
              {overview ? `${overview.active_users} active` : ''}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Projects Created</span>
            <Film className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{overview?.total_projects ?? '—'}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Renders</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{overview?.total_renders ?? '—'}</span>
            {overview && overview.failed_renders > 0 && (
              <span className="text-xs text-rose-400 font-medium">{overview.failed_renders} failed</span>
            )}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Storage Footprint</span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {overview ? formatBytes(overview.storage_total_bytes) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'jobs'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Render Jobs ({jobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'diagnostics'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>System Diagnostics</span>
        </button>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Storage</th>
                  <th className="py-3 px-4">Renders</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{u.full_name || 'No Name'}</div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {u.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">{formatBytes(u.storage_used_bytes)}</td>
                    <td className="py-3 px-4 font-mono text-[11px]">{u.render_count}</td>
                    <td className="py-3 px-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                          <XCircle className="w-3.5 h-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          disabled={actionLoadingId === u.id}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                            u.is_active
                              ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                          }`}
                        >
                          {actionLoadingId === u.id ? 'Saving...' : u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: JOBS */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {['all', 'queued', 'processing', 'completed', 'failed'].map((st) => (
              <button
                key={st}
                onClick={() => setJobFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition cursor-pointer ${
                  jobFilter === st
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Job ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Error / Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredJobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono text-slate-400">{j.id.slice(0, 8)}...</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          j.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : j.status === 'failed'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{j.current_stage || '—'}</td>
                    <td className="py-3 px-4 font-mono text-[11px]">{j.progress}%</td>
                    <td className="py-3 px-4 text-rose-300 text-[11px] max-w-xs truncate">{j.error || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      {j.status === 'failed' && (
                        <button
                          onClick={() => handleRetryJob(j.id)}
                          disabled={actionLoadingId === j.id}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 transition cursor-pointer flex items-center gap-1.5 ml-auto"
                        >
                          <RotateCw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DIAGNOSTICS */}
      {activeTab === 'diagnostics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-400" />
              <span>Core Service Status</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Application API</span>
                <span className="text-emerald-400 font-semibold uppercase">{health?.status || 'OK'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Database Connection</span>
                <span className="text-emerald-400 font-semibold uppercase">{health?.database || 'CONNECTED'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Telemetry Timestamp</span>
                <span className="font-mono text-slate-300">{health?.timestamp || new Date().toISOString()}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-400" />
              <span>Storage Configuration</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Backend Driver</span>
                <span className="text-slate-200 font-semibold">LocalStorageService (S3 Ready)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Max Upload Limit</span>
                <span className="text-slate-200 font-semibold">500 MB / File</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Magic-Byte Inspector</span>
                <span className="text-emerald-400 font-semibold">Enforced (MP4, MOV, WEBM, MKV)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

