import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Loader2, CalendarDays, Trash2, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';

interface Booking { id: string; room_id: string; start_time: string; end_time: string; status: string; }
interface Room { id: string; name: string; }

export function MySessions() {
  const [locks, setLocks] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [locksRes, roomsRes] = await Promise.all([
          api.get('/api/bookings/me'),
          api.get('/api/bookings/list/all')
        ]);
        setLocks(locksRes.data);
        const roomMap: Record<string, string> = {};
        roomsRes.data.forEach((r: Room) => { roomMap[r.id] = r.name; });
        setRooms(roomMap);
      } catch (error) {
        console.error("Failed to fetch sessions", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCancel = async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel this session?")) return;
    try {
      await api.delete(`/api/bookings/${id}`);
      setLocks(prev => prev.filter(lock => lock.id !== id));
    } catch (error) {
      alert("Failed to cancel session.");
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Sessions</h1>
        <p className="text-slate-500 mt-2">Manage your active hardware locks.</p>
      </div>

      {locks.length === 0 ? (
        <Card className="border-dashed border-2 bg-slate-50/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-slate-200/50 p-4 rounded-full mb-4 text-slate-400">
              <CalendarDays size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No Active Sessions</h3>
            <p className="text-slate-500 mt-1 max-w-sm">You haven't requested any hardware allocations yet. Head to the grid to lock a station.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {locks.map((lock, idx) => (
            <motion.div
              key={lock.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
            >
              <Card className="hover:shadow-md transition-shadow overflow-hidden group">
                <div className="flex flex-col sm:flex-row items-center">
                  <div className="p-6 flex-grow w-full">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-brand-100 text-brand-700 p-1.5 rounded-md">
                        <MapPin size={16} />
                      </span>
                      <h3 className="text-lg font-bold text-slate-900">{rooms[lock.room_id] || 'Unknown Zone'}</h3>
                    </div>
                    
                    <div className="flex flex-wrap gap-x-8 gap-y-2 mt-2">
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <Clock size={14} className="text-slate-400" />
                        <span className="font-medium">Start:</span> 
                        {format(new Date(lock.start_time), 'MMM d, h:mm a')}
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <Clock size={14} className="text-slate-400" />
                        <span className="font-medium">End:</span> 
                        {format(new Date(lock.end_time), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-6 sm:border-l border-slate-100 w-full sm:w-auto flex justify-end">
                    <Button 
                      variant="destructive" 
                      onClick={() => handleCancel(lock.id)}
                      className="w-full sm:w-auto"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Cancel Lock
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
