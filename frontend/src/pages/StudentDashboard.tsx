import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Server, Users, Loader2, CalendarClock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '../components/ui/Input';
import { useNavigate } from 'react-router-dom';

interface Room { id: string; name: string; building: string; capacity: number; features: string[]; }

export function StudentDashboard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api.get('/api/bookings/list/all');
        setRooms(res.data);
      } catch (error) {
        console.error("Failed to fetch rooms", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    setSubmitting(true);
    try {
      await api.post('/api/bookings', {
        room_id: selectedRoom.id,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      });
      setSelectedRoom(null);
      setStartTime('');
      setEndTime('');
      navigate('/sessions'); // Redirect to sessions on success
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to book room');
    } finally {
      setSubmitting(false);
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
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Hardware Grid</h1>
        <p className="text-slate-500 mt-2">Select a zone to request hardware allocation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room, idx) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
          >
            <Card className="h-full flex flex-col hover:shadow-lg transition-all border-slate-200/60 hover:border-brand-300">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                    <Server size={20} />
                  </div>
                  <span className="bg-brand-50 text-brand-700 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 border border-brand-100">
                    <Users size={12} /> {room.capacity} Max
                  </span>
                </div>
                <CardTitle className="text-xl">{room.name}</CardTitle>
                <p className="text-sm text-slate-500 font-medium">{room.building}</p>
              </CardHeader>
              <CardContent className="flex-grow">
                 <div className="flex flex-wrap gap-2">
                    {Array.isArray(room.features) && room.features.map(f => (
                       <span key={f} className="text-[10px] uppercase tracking-wider font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                         {f}
                       </span>
                    ))}
                 </div>
              </CardContent>
              <CardFooter className="pt-4 border-t border-slate-100 mt-auto">
                <Button 
                  onClick={() => setSelectedRoom(room)} 
                  className="w-full font-semibold group"
                >
                  <CalendarClock size={16} className="mr-2 group-hover:scale-110 transition-transform" /> 
                  Reserve Station
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedRoom && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md"
            >
              <Card className="shadow-2xl">
                <CardHeader>
                  <CardTitle>Reserve {selectedRoom.name}</CardTitle>
                  <p className="text-sm text-slate-500">Select your required timeframe.</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBookingSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Start Time</label>
                      <Input 
                        type="datetime-local" 
                        required 
                        min={new Date().toISOString().slice(0, 16)} 
                        value={startTime} 
                        onChange={(e) => setStartTime(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">End Time</label>
                      <Input 
                        type="datetime-local" 
                        required 
                        min={startTime || new Date().toISOString().slice(0, 16)} 
                        value={endTime} 
                        onChange={(e) => setEndTime(e.target.value)} 
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setSelectedRoom(null)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1" isLoading={submitting}>
                        Confirm Session
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
