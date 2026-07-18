import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Loader2, Activity, Trash2, ServerCrash, Terminal } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface Booking { id: string; room_id: string; user_id: string; start_time: string; end_time: string; status: string; }
interface Room { id: string; name: string; }

export function AdminDashboard() {
  const [locks, setLocks] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [locksRes, roomsRes] = await Promise.all([
          api.get('/api/bookings/admin/locks'),
          api.get('/api/bookings/list/all')
        ]);
        setLocks(locksRes.data);
        const roomMap: Record<string, string> = {};
        roomsRes.data.forEach((r: Room) => { roomMap[r.id] = r.name; });
        setRooms(roomMap);
      } catch (error) {
        console.error("Failed to fetch admin data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRevokeLock = async (id: string) => {
    if (!window.confirm("WARNING: Forcibly revoking this lock will terminate the user's session. Proceed?")) return;
    try {
      await api.delete(`/api/bookings/${id}`);
      setLocks(prev => prev.filter(lock => lock.id !== id));
    } catch (error) {
      alert("Failed to revoke lock.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          Global System Locks
          <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-1 rounded-md font-bold tracking-widest uppercase border border-rose-200 flex items-center gap-1">
            <Activity size={12} /> Root Access
          </span>
        </h1>
        <p className="text-slate-500 mt-2">Monitor and manage all hardware allocations across the grid.</p>
      </div>

      <Card className="overflow-hidden border-rose-100 shadow-lg shadow-rose-50/50">
        <CardHeader className="bg-slate-900 text-white border-b border-slate-800 p-4">
          <CardTitle className="text-base flex items-center gap-2 text-rose-400">
            <Terminal size={18} /> ACTIVE_ALLOCATIONS_TABLE
          </CardTitle>
        </CardHeader>
        
        {locks.length === 0 ? (
          <CardContent className="p-12 text-center text-slate-500 flex flex-col items-center">
             <ServerCrash size={32} className="mb-3 text-slate-300" />
             <p className="font-medium">No active hardware reservations detected.</p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-xs">
                <tr>
                  <th className="px-6 py-4">Target System</th>
                  <th className="px-6 py-4">User UUID</th>
                  <th className="px-6 py-4">Lock Expires</th>
                  <th className="px-6 py-4 text-right">Force Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {locks.map(lock => (
                  <tr key={lock.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                       {rooms[lock.room_id] || 'Unknown Zone'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        {lock.user_id.split('-')[0]}...
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {format(new Date(lock.end_time), 'MMM d, h:mm a')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleRevokeLock(lock.id)}
                        className="h-8 text-xs font-bold"
                      >
                        <Trash2 size={14} className="mr-1.5" /> Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
