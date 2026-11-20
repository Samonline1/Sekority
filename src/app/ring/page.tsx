"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Contact {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email?: string | null;
  relationship?: string | null;
  isPrimary: boolean;
  verified: boolean;
  notifyByTelegram: boolean;
  notifyByEmail: boolean;
  notifyBySMS: boolean;
  createdAt: string;
}

export default function RingPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal / Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("Family");
  const [isPrimary, setIsPrimary] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Fetch Contacts
  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts");
      const data = await res.json();
      if (data.success) {
        setContacts(data.contacts || []);
      }
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // 2. Add Contact
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setFormError("Name and phone number are required.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          relationship: relationship.trim(),
          isPrimary,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowAddModal(false);
        setName("");
        setPhone("");
        setEmail("");
        setRelationship("Family");
        setIsPrimary(false);
        fetchContacts();
      } else {
        setFormError(data.error || "Failed to add contact.");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Delete Contact
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this trusted contact?")) return;

    try {
      await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      fetchContacts();
    } catch (err) {
      console.error("Failed to delete contact:", err);
    }
  };

  // 4. Toggle Primary
  const handleTogglePrimary = async (id: string, currentPrimary: boolean) => {
    try {
      await fetch(`/api/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: !currentPrimary }),
      });
      fetchContacts();
    } catch (err) {
      console.error("Failed to toggle primary:", err);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-neutral-200 bg-white sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="text-xs font-bold text-neutral-500 hover:text-black uppercase tracking-wider"
            >
              ← Alert
            </Link>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-tight text-black">
                Trusted Circle
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded font-bold text-neutral-700">
                RING
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/gps"
              className="text-xs font-bold px-3 py-1.5 border border-neutral-300 rounded-lg hover:border-black transition-colors"
            >
              GPS 📍
            </Link>
            <Link
              href="/trip"
              className="text-xs font-bold px-3 py-1.5 border border-neutral-300 rounded-lg hover:border-black transition-colors"
            >
              Trip 🚗
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 flex flex-col space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black">
              Emergency Contacts
            </h1>
            <p className="text-sm text-neutral-600 mt-1">
              Your trusted inner circle. When an emergency alert or journey escalation triggers, these contacts receive immediate updates.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="h-11 px-4 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-colors shrink-0 shadow-xs"
          >
            + Add Contact
          </button>
        </div>

        {/* Contacts List */}
        <section aria-label="Trusted Contacts List" className="space-y-3">
          {isLoading ? (
            <p className="text-xs text-neutral-400 py-8 text-center font-mono">
              Loading emergency contacts...
            </p>
          ) : contacts.length === 0 ? (
            <div className="p-8 bg-[#F6F6F6] border-2 border-dashed border-neutral-300 rounded-2xl flex flex-col items-center text-center space-y-3">
              <span className="text-3xl">👥</span>
              <div>
                <h2 className="text-base font-bold text-black">No Trusted Contacts Added</h2>
                <p className="text-xs text-neutral-500 max-w-xs mt-1">
                  Add family members, trusted friends, or medical responders who should be contacted during safety incidents.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="h-11 px-5 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-colors"
              >
                + Add First Contact
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map((c) => (
                <div
                  key={c.id}
                  className={`p-5 rounded-2xl border-2 transition-all ${
                    c.isPrimary
                      ? "bg-white border-black shadow-sm"
                      : "bg-[#F6F6F6] border-neutral-200 hover:border-black"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-extrabold text-black tracking-tight">
                          {c.name}
                        </h3>
                        {c.isPrimary && (
                          <span className="text-[10px] font-extrabold uppercase font-mono px-2 py-0.5 bg-black text-white rounded">
                            PRIMARY
                          </span>
                        )}
                        <span className="text-xs text-neutral-500 font-medium bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                          {c.relationship}
                        </span>
                      </div>
                      <p className="text-xs font-mono font-bold text-neutral-700 mt-1">
                        📞 {c.phone}
                      </p>
                      {c.email && (
                        <p className="text-xs text-neutral-500 font-mono mt-0.5">
                          ✉️ {c.email}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleTogglePrimary(c.id, c.isPrimary)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                          c.isPrimary
                            ? "bg-neutral-100 border-neutral-300 text-neutral-600"
                            : "bg-white border-neutral-300 text-black hover:border-black"
                        }`}
                      >
                        {c.isPrimary ? "Starred" : "Set Primary"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="text-xs font-bold text-red-600 hover:text-red-800 px-2 py-1"
                        title="Remove contact"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Channel Notification Badges */}
                  <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-neutral-200 text-[10px] uppercase font-mono font-bold text-neutral-500">
                    <span className="text-neutral-400">Alert Channels:</span>
                    <span className="px-1.5 py-0.5 bg-neutral-200 rounded text-neutral-800">
                      Telegram Push
                    </span>
                    {c.email && (
                      <span className="px-1.5 py-0.5 bg-neutral-200 rounded text-neutral-800">
                        Email
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Nav Footer Pills */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
          <Link
            href="/trip"
            className="px-3 py-1.5 bg-neutral-100 border border-neutral-300 rounded-lg hover:border-black font-semibold transition"
          >
            🚗 Safe Trip
          </Link>
          <Link
            href="/gps"
            className="px-3 py-1.5 bg-neutral-100 border border-neutral-300 rounded-lg hover:border-black font-semibold transition"
          >
            📍 GPS Share
          </Link>
          <Link
            href="/chk"
            className="px-3 py-1.5 bg-neutral-100 border border-neutral-300 rounded-lg hover:border-black font-semibold transition"
          >
            ⏱️ Check-in
          </Link>
          <Link
            href="/chat"
            className="px-3 py-1.5 bg-black text-white rounded-lg hover:bg-neutral-800 font-semibold transition"
          >
            💬 Chat
          </Link>
        </div>

        {/* ========================================================= */}
        {/* ADD CONTACT MODAL */}
        {/* ========================================================= */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 border-2 border-black shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                <h2 className="text-lg font-extrabold text-black">Add Trusted Contact</h2>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-xs font-bold text-neutral-500 hover:text-black"
                >
                  ✕ Close
                </button>
              </div>

              <form onSubmit={handleAddContact} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Sharma"
                    className="w-full h-11 px-3 bg-[#F6F6F6] border border-neutral-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Phone Number (with Country Code) *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full h-11 px-3 bg-[#F6F6F6] border border-neutral-300 rounded-xl text-sm font-mono text-black focus:outline-none focus:ring-2 focus:ring-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@example.com"
                    className="w-full h-11 px-3 bg-[#F6F6F6] border border-neutral-300 rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Relationship
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F6F6F6] border border-neutral-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="Family">Family Member / Guardian</option>
                    <option value="Friend">Trusted Friend</option>
                    <option value="Doctor">Doctor / Medical Caretaker</option>
                    <option value="Colleague">Colleague / Work</option>
                    <option value="Neighbor">Neighbor</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    id="primary-check"
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 accent-black"
                  />
                  <label htmlFor="primary-check" className="text-xs font-bold text-neutral-800">
                    Set as Primary Emergency Contact
                  </label>
                </div>

                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
                    {formError}
                  </div>
                )}

                <div className="pt-2 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 h-12 bg-white border border-neutral-300 text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 h-12 bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-800 shadow-sm"
                  >
                    {isSaving ? "Saving..." : "Save Contact"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-4 mt-auto">
        <div className="max-w-2xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 space-y-2 sm:space-y-0">
          <span>Trusted Circle Emergency Directory</span>
          <span className="font-mono">Neon DB Encrypted Storage</span>
        </div>
      </footer>
    </div>
  );
}
