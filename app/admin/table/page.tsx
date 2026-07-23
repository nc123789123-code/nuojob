"use client";

import { useState, useEffect, useCallback } from "react";

interface TableSession {
  id: string;
  dateISO: string;
  date: string;
  time: string;
  location: string;
  theme: string;
  capacity: number;
  spotsLeft: number;
  description: string;
}

const EMPTY_FORM = {
  dateISO: "", date: "", time: "11:00 AM – 1:00 PM ET",
  location: "NYC – Midtown", theme: "", capacity: 8, spotsLeft: 8, description: "",
};

export default function AdminTablePage() {
  const [secret, setSecret]       = useState("");
  const [authed, setAuthed]       = useState(false);
  const [authErr, setAuthErr]     = useState("");
  const [sessions, setSessions]   = useState<TableSession[]>([]);
  const [loading, setLoading]     = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState<{ ok: boolean; text: string } | null>(null);

  const headers = { "Content-Type": "application/json", "x-admin-secret": secret };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/sessions", { headers });
    if (res.status === 401) { setAuthed(false); return; }
    setSessions(await res.json());
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  const login = async () => {
    setAuthErr("");
    const res = await fetch("/api/admin/sessions", { headers: { "x-admin-secret": secret } });
    if (res.ok) { setAuthed(true); setSessions(await res.json()); }
    else setAuthErr("Wrong password.");
  };

  const addSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    const res = await fetch("/api/admin/sessions", { method: "POST", headers, body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) { setMsg({ ok: true, text: "Session added." }); setForm(EMPTY_FORM); load(); }
    else setMsg({ ok: false, text: data.error || "Failed." });
    setSaving(false);
  };

  const deleteSession = async (id: string) => {
    if (!confirm("Delete this session?")) return;
    const res = await fetch("/api/admin/sessions", { method: "DELETE", headers, body: JSON.stringify({ id }) });
    if (res.ok) load();
  };

  const updateSpots = async (id: string, spotsLeft: number) => {
    await fetch("/api/admin/sessions", { method: "PATCH", headers, body: JSON.stringify({ id, spotsLeft }) });
    load();
  };

  useEffect(() => { if (authed) load(); }, [authed, load]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#14101E] flex items-center justify-center">
        <div className="bg-[#14101E] border border-[#2A2438] rounded-2xl p-8 w-full max-w-sm shadow-sm">
          <h1 className="text-lg font-bold text-[#F4F0FA] mb-1">Onlu Admin</h1>
          <p className="text-sm text-[#9A93AC] mb-5">Table session manager</p>
          <input
            type="password"
            placeholder="Admin password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            className="w-full border border-[#2A2438] rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#396477]"
          />
          {authErr && <p className="text-red-500 text-xs mb-2">{authErr}</p>}
          <button onClick={login} className="w-full bg-[#7C3AED] text-white text-sm font-semibold py-2 rounded-lg hover:bg-[#171226]">
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#14101E] p-6" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <div className="max-w-2xl mx-auto space-y-8">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#F4F0FA]">Onlu Table — Sessions</h1>
            <p className="text-sm text-[#9A93AC] mt-0.5">Add, edit, or remove upcoming sessions</p>
          </div>
          <button onClick={() => setAuthed(false)} className="text-xs text-[#8A8398] hover:text-[#9A93AC]">Sign out</button>
        </div>

        {/* Existing sessions */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#8A8398] uppercase tracking-widest">Upcoming ({sessions.length})</p>
          {loading && <p className="text-sm text-[#8A8398]">Loading…</p>}
          {!loading && sessions.length === 0 && <p className="text-sm text-[#8A8398]">No upcoming sessions.</p>}
          {sessions.map((s) => (
            <div key={s.id} className="bg-[#14101E] border border-[#2A2438] rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#F4F0FA]">{s.date} · {s.theme}</p>
                <p className="text-xs text-[#9A93AC] mt-0.5">{s.time} · {s.location}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-[#9A93AC]">Spots left:</span>
                  <select
                    value={s.spotsLeft}
                    onChange={(e) => updateSpots(s.id, Number(e.target.value))}
                    className="text-xs border border-[#2A2438] rounded px-1.5 py-0.5 focus:outline-none"
                  >
                    {Array.from({ length: s.capacity + 1 }, (_, i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                  <span className="text-xs text-[#8A8398]">/ {s.capacity}</span>
                </div>
              </div>
              <button onClick={() => deleteSession(s.id)} className="text-xs text-red-400 hover:text-[#FB7185] flex-shrink-0 mt-1">
                Delete
              </button>
            </div>
          ))}
        </div>

        {/* Add new session */}
        <div className="bg-[#14101E] border border-[#2A2438] rounded-xl p-6">
          <p className="text-xs font-semibold text-[#8A8398] uppercase tracking-widest mb-5">Add New Session</p>
          <form onSubmit={addSession} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#9A93AC] mb-1 block">Date (ISO) *</label>
                <input required type="date" value={form.dateISO}
                  onChange={(e) => setForm({ ...form, dateISO: e.target.value })}
                  className="w-full border border-[#2A2438] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#396477]" />
              </div>
              <div>
                <label className="text-xs text-[#9A93AC] mb-1 block">Display Date *</label>
                <input required placeholder="Saturday, May 17" value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-[#2A2438] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#396477]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#9A93AC] mb-1 block">Time *</label>
                <input required value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full border border-[#2A2438] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#396477]" />
              </div>
              <div>
                <label className="text-xs text-[#9A93AC] mb-1 block">Location *</label>
                <input required value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full border border-[#2A2438] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#396477]" />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#9A93AC] mb-1 block">Theme *</label>
              <input required placeholder="Private Credit & Direct Lending" value={form.theme}
                onChange={(e) => setForm({ ...form, theme: e.target.value })}
                className="w-full border border-[#2A2438] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#396477]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#9A93AC] mb-1 block">Capacity</label>
                <input type="number" min={1} max={20} value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: Number(e.target.value), spotsLeft: Number(e.target.value) })}
                  className="w-full border border-[#2A2438] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#396477]" />
              </div>
              <div>
                <label className="text-xs text-[#9A93AC] mb-1 block">Spots Left</label>
                <input type="number" min={0} max={form.capacity} value={form.spotsLeft}
                  onChange={(e) => setForm({ ...form, spotsLeft: Number(e.target.value) })}
                  className="w-full border border-[#2A2438] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#396477]" />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#9A93AC] mb-1 block">Description *</label>
              <textarea required rows={3} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-[#2A2438] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#396477] resize-none" />
            </div>
            {msg && <p className={`text-xs ${msg.ok ? "text-[#5EE6B5]" : "text-red-500"}`}>{msg.text}</p>}
            <button type="submit" disabled={saving}
              className="w-full bg-[#7C3AED] text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-[#171226] disabled:opacity-50">
              {saving ? "Saving…" : "Add Session"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
