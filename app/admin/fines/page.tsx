"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type Fine = {
  id: string;
  user_id: string;
  month: number;
  year: number;
  amount: number;
  reason?: string | null;
  status: string;
  created_at?: string;
};

type FineSettings = {
  id: number;
  enabled: boolean;
  fine_amount: number;
  grace_days_after_warning: number;
};

export default function AdminFinesPage() {
  const [items, setItems] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [settings, setSettings] = useState<FineSettings>({ id: 1, enabled: false, fine_amount: 50, grace_days_after_warning: 0 });
  const [savingSettings, setSavingSettings] = useState(false);

  const [userId, setUserId] = useState("");
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState("");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<{ fines: Fine[] }>("/api/admin/fines", { method: "GET" });
      setItems(data.fines || []);

      const s = await apiFetch<{ settings: FineSettings }>("/api/admin/fine-settings", { method: "GET" });
      if (s?.settings) setSettings(s.settings);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveFineSettings() {
    setErr(null);
    setSavingSettings(true);
    try {
      if (settings.fine_amount < 0) throw new Error("Fine amount must be >= 0");
      if (settings.grace_days_after_warning < 0) throw new Error("Grace days must be >= 0");
      const r = await apiFetch<{ settings: FineSettings }>("/api/admin/fine-settings", {
        method: "POST",
        body: JSON.stringify({
          enabled: settings.enabled,
          fine_amount: Number(settings.fine_amount),
          grace_days_after_warning: Number(settings.grace_days_after_warning),
        }),
      });
      if (r?.settings) setSettings(r.settings);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setSavingSettings(false);
    }
  }

  async function addFine() {
    setErr(null);
    try {
      if (!userId) throw new Error("User ID required");
      if (!amount || amount <= 0) throw new Error("Amount must be > 0");
      await apiFetch("/api/admin/fines", {
        method: "POST",
        body: JSON.stringify({ user_id: userId, month, year, amount, reason }),
      });
      setAmount(0);
      setReason("");
      await load();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="pro-card p-5">
        <h2 className="text-lg font-semibold">Auto Fine Settings (after Warning)</h2>
        <p className="text-sm opacity-80 mt-1">
          Optional automation: after an official warning expires and the member still hasn’t paid, the system can auto-apply a monthly fine.
        </p>

        {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings((p) => ({ ...p, enabled: e.target.checked }))}
            />
            Enable auto fines
          </label>
          <div>
            <div className="text-xs opacity-70 mb-1">Fine amount (৳)</div>
            <input
              className="pro-input"
              type="number"
              min={0}
              value={settings.fine_amount}
              onChange={(e) => setSettings((p) => ({ ...p, fine_amount: Number(e.target.value) }))}
            />
          </div>
          <div>
            <div className="text-xs opacity-70 mb-1">Grace days after warning</div>
            <input
              className="pro-input"
              type="number"
              min={0}
              value={settings.grace_days_after_warning}
              onChange={(e) => setSettings((p) => ({ ...p, grace_days_after_warning: Number(e.target.value) }))}
            />
          </div>
          <button className="pro-btn" onClick={saveFineSettings} disabled={savingSettings}>
            {savingSettings ? "Saving..." : "Save Settings"}
          </button>
        </div>

        <div className="mt-3 text-xs opacity-70">
          Cron endpoint: <span className="font-mono">POST /api/cron/fines</span> (run hourly/daily). Uses <span className="font-mono">CRON_SECRET</span> if set.
        </div>
      </div>

      <div className="pro-card p-5">
        <h1 className="text-2xl font-semibold">Admin Fine Center</h1>
        <p className="text-sm opacity-80">Manual (admin-controlled) fines per member and month.</p>

        {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <input className="pro-input" placeholder="Member user_id (uuid)" value={userId} onChange={(e)=>setUserId(e.target.value)} />
          <input className="pro-input" type="number" min={1} max={12} value={month} onChange={(e)=>setMonth(Number(e.target.value))} />
          <input className="pro-input" type="number" min={2025} value={year} onChange={(e)=>setYear(Number(e.target.value))} />
          <input className="pro-input" type="number" min={0} value={amount} onChange={(e)=>setAmount(Number(e.target.value))} />
          <button className="pro-btn" onClick={addFine}>Add Fine</button>
        </div>
        <textarea className="pro-input mt-3" placeholder="Reason (optional)" value={reason} onChange={(e)=>setReason(e.target.value)} />
      </div>

      <div className="pro-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Fines</h2>
          <button className="pro-btn-outline" onClick={load} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="pro-table w-full">
            <thead>
              <tr>
                <th>Member</th>
                <th>Month</th>
                <th>Year</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {items.map((f) => (
                <tr key={f.id}>
                  <td className="truncate max-w-[260px]">{f.user_id}</td>
                  <td>{f.month}</td>
                  <td>{f.year}</td>
                  <td>৳{Number(f.amount).toLocaleString()}</td>
                  <td>{f.status}</td>
                  <td className="truncate max-w-[300px]">{f.reason || ""}</td>
                </tr>
              ))}
              {!items.length && !loading && (
                <tr><td colSpan={6} className="text-center opacity-70 py-6">No fines yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
