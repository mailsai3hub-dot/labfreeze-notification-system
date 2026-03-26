import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';

type ScheduleItem = {
  id: string;
  staff_name?: string;
  staff_email?: string;
  staff_phone?: string;
  date?: string;
  status?: string;
  type?: string;
  message?: string;
  createdAt?: string;
};

const NotificationCenter: React.FC = () => {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'inventory_schedules'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ScheduleItem[];

      setItems(data);
    } catch (error) {
      console.error('Error loading notification center:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const stats = useMemo(() => {
    const pending = items.filter(i => i.status === 'pending').length;
    const sent = items.filter(i => i.status === 'sent').length;
    const failed = items.filter(i => i.status === 'failed').length;
    return { pending, sent, failed };
  }, [items]);

  const latestItems = useMemo(() => items.slice(0, 5), [items]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-black">Notification Center</h2>
          <p className="text-sm text-slate-500 font-semibold">
            Track scheduled reminders and delivery status
          </p>
        </div>

        <button
          onClick={loadSchedules}
          className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-bold hover:bg-cyan-600 transition-all"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-700">Pending</p>
          <p className="text-3xl font-black text-amber-900">{stats.pending}</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-700">Sent</p>
          <p className="text-3xl font-black text-emerald-900">{stats.sent}</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-bold text-rose-700">Failed</p>
          <p className="text-3xl font-black text-rose-900">{stats.failed}</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-black text-black mb-4">Latest Notifications</h3>

        {loading ? (
          <div className="text-slate-500 font-semibold">Loading...</div>
        ) : latestItems.length === 0 ? (
          <div className="text-slate-500 font-semibold">No notifications found.</div>
        ) : (
          <div className="space-y-3">
            {latestItems.map(item => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div className="space-y-1">
                  <p className="font-black text-black">
                    {item.staff_name || 'Unknown staff'}
                  </p>
                  <p className="text-sm text-slate-600 font-semibold">
                    {item.message || 'No message'}
                  </p>
                  <p className="text-xs text-slate-500 font-bold">
                    {item.date || '-'} • {item.type || '-'}
                  </p>
                </div>

                <div className="flex flex-col items-start md:items-end gap-1">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                      item.status === 'sent'
                        ? 'bg-emerald-100 text-emerald-700'
                        : item.status === 'failed'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {item.status || 'pending'}
                  </span>

                  <span className="text-xs text-slate-500 font-bold">
                    {item.staff_phone || item.staff_email || 'No contact'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;