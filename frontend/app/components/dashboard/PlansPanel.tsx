'use client';

import { useEffect, useState } from 'react';
import { getAuthHeaders, handleAuthError } from '../../utils/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';
const STATS_FETCH_TIMEOUT_MS = 12000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = STATS_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

type PricingPlan = {
  _id: string;
  slug: string;
  name: string;
  monthlyPriceUsd: number;
  chatLimitPerMonth: number;
  tokenLimitPerMonth: number;
  allowOverage: boolean;
  overagePricePerChatUsd: number;
  isActive: boolean;
  sortOrder: number;
  description?: string;
};

type PlatformStats = {
  totalClients: number;
  totalChatsThisMonth: number;
  totalTokensThisMonth: number;
  totalEstimatedCostUsd: number;
  clientsOverLimit: number;
  byPlan: Array<{ plan: string; count: number; chatsUsed: number }>;
};

const emptyPlan = {
  slug: '',
  name: '',
  monthlyPriceUsd: 0,
  chatLimitPerMonth: 1000,
  tokenLimitPerMonth: 1000000,
  allowOverage: false,
  overagePricePerChatUsd: 0.25,
  isActive: true,
  sortOrder: 0,
  description: '',
};

export default function PlansPanel() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyPlan });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setError('');
    setIsLoadingPlans(true);
    setIsLoadingStats(true);
    setStatsError('');

    const plansPromise = fetch(`${API_BASE_URL}/api/usage/plans`, {
      headers: getAuthHeaders(),
    })
      .then(async (plansRes) => {
        if (handleAuthError(plansRes)) return;
        const plansData = await plansRes.json();
        if (plansData.success) setPlans(plansData.data);
      })
      .catch(() => setError('Failed to load plans'))
      .finally(() => setIsLoadingPlans(false));

    const statsPromise = fetchWithTimeout(
      `${API_BASE_URL}/api/usage/platform-stats`,
      { headers: getAuthHeaders() },
    )
      .then(async (statsRes) => {
        if (handleAuthError(statsRes)) return;
        const statsData = await statsRes.json();
        if (statsData.success) setPlatformStats(statsData.data);
        else setStatsError('Could not load platform stats');
      })
      .catch(() => {
        setStatsError('Platform stats timed out — restart the backend and click Refresh');
      })
      .finally(() => setIsLoadingStats(false));

    await Promise.all([plansPromise, statsPromise]);
  };

  const startEdit = (plan: PricingPlan) => {
    setEditingSlug(plan.slug);
    setEditForm({
      slug: plan.slug,
      name: plan.name,
      monthlyPriceUsd: plan.monthlyPriceUsd,
      chatLimitPerMonth: plan.chatLimitPerMonth,
      tokenLimitPerMonth: plan.tokenLimitPerMonth,
      allowOverage: plan.allowOverage,
      overagePricePerChatUsd: plan.overagePricePerChatUsd,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      description: plan.description || '',
    });
  };

  const savePlan = async () => {
    if (!editingSlug) return;
    setIsSaving(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/usage/plans/${editingSlug}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          monthlyPriceUsd: Number(editForm.monthlyPriceUsd),
          chatLimitPerMonth: Number(editForm.chatLimitPerMonth),
          tokenLimitPerMonth: Number(editForm.tokenLimitPerMonth),
          allowOverage: editForm.allowOverage,
          overagePricePerChatUsd: Number(editForm.overagePricePerChatUsd),
          isActive: editForm.isActive,
          sortOrder: Number(editForm.sortOrder),
          description: editForm.description,
        }),
      });
      if (handleAuthError(response)) return;
      const data = await response.json();
      if (data.success) {
        setSuccess('Plan updated.');
        setEditingSlug(null);
        await fetchData();
      } else {
        setError(data.error || 'Failed to save plan');
      }
    } catch {
      setError('Failed to save plan');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border rounded text-sm';
  const inputStyle = { borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--ink)' };

  if (isLoadingPlans && plans.length === 0) {
    return <div className="text-center py-12" style={{ color: 'var(--muted)' }}>Loading plans...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>Pricing Plans & Usage</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Configure chat limits, token limits, and pricing without code changes.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 text-sm rounded border"
          style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded border text-sm" style={{ borderColor: '#ef4444', color: '#ef4444' }}>{error}</div>
      )}
      {success && (
        <div className="p-3 rounded border text-sm" style={{ borderColor: 'var(--emerald)', color: 'var(--emerald)' }}>{success}</div>
      )}

      {isLoadingStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
              <div className="h-3 w-24 rounded mb-2" style={{ background: 'var(--line)' }} />
              <div className="h-8 w-16 rounded" style={{ background: 'var(--line)' }} />
            </div>
          ))}
        </div>
      ) : statsError ? (
        <div className="border rounded-lg p-4 text-sm" style={{ borderColor: '#f59e0b', color: '#f59e0b' }}>
          {statsError}
        </div>
      ) : platformStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active Clients" value={platformStats.totalClients} />
          <StatCard title="Chats This Month" value={platformStats.totalChatsThisMonth.toLocaleString()} />
          <StatCard title="Est. OpenAI Cost" value={`$${platformStats.totalEstimatedCostUsd.toFixed(2)}`} />
          <StatCard title="Over Limit" value={platformStats.clientsOverLimit} highlight={platformStats.clientsOverLimit > 0} />
        </div>
      ) : null}

      <div className="dashboard-table-shell">
        <div className="dashboard-table-scroll">
          <table className="dashboard-table" style={{ minWidth: '900px' }}>
            <thead style={{ background: 'var(--bg)' }}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--muted)' }}>Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--muted)' }}>Price/mo</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--muted)' }}>Chat Limit</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--muted)' }}>Token Limit</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--muted)' }}>Overage</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--muted)' }}>Clients</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase" style={{ color: 'var(--muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => {
                const planStats = platformStats?.byPlan.find((p) => p.plan === plan.slug);
                return (
                  <tr key={plan.slug} className="border-t" style={{ borderColor: 'var(--line)' }}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{plan.name}</div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>{plan.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink)' }}>${plan.monthlyPriceUsd}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink)' }}>{plan.chatLimitPerMonth.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink)' }}>{plan.tokenLimitPerMonth.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>
                      {plan.allowOverage ? `$${plan.overagePricePerChatUsd}/chat` : 'Blocked at limit'}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink)' }}>
                      {planStats ? `${planStats.count} (${planStats.chatsUsed} chats)` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => startEdit(plan)}
                        className="text-sm px-3 py-1 rounded border"
                        style={{ borderColor: 'var(--line)', color: 'var(--emerald)' }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingSlug && (
        <div className="border rounded-lg p-4 space-y-4" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>Edit Plan: {editingSlug}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Display name</label>
              <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Monthly price ($)</label>
              <input type="number" value={editForm.monthlyPriceUsd} onChange={(e) => setEditForm({ ...editForm, monthlyPriceUsd: Number(e.target.value) })} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Chat limit / month</label>
              <input type="number" value={editForm.chatLimitPerMonth} onChange={(e) => setEditForm({ ...editForm, chatLimitPerMonth: Number(e.target.value) })} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Token limit / month</label>
              <input type="number" value={editForm.tokenLimitPerMonth} onChange={(e) => setEditForm({ ...editForm, tokenLimitPerMonth: Number(e.target.value) })} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Overage price / chat ($)</label>
              <input type="number" step="0.01" value={editForm.overagePricePerChatUsd} onChange={(e) => setEditForm({ ...editForm, overagePricePerChatUsd: Number(e.target.value) })} className={inputClass} style={inputStyle} />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.allowOverage} onChange={(e) => setEditForm({ ...editForm, allowOverage: e.target.checked })} />
                <span className="text-sm" style={{ color: 'var(--ink)' }}>Allow overage billing</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />
                <span className="text-sm" style={{ color: 'var(--ink)' }}>Active</span>
              </label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Description</label>
              <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={savePlan}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-black rounded bg-gradient-emerald disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Plan'}
            </button>
            <button
              onClick={() => setEditingSlug(null)}
              className="px-4 py-2 text-sm rounded border"
              style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, highlight }: { title: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="border rounded-lg p-4" style={{ borderColor: highlight ? '#ef4444' : 'var(--line)', background: 'var(--panel)' }}>
      <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--muted)' }}>{title}</p>
      <p className="text-2xl font-bold" style={{ color: highlight ? '#ef4444' : 'var(--emerald)' }}>{value}</p>
    </div>
  );
}
