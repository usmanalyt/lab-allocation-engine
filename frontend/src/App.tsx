import { useState, useEffect } from 'react';
import { Server, Users, CheckCircle2, AlertTriangle, X, Shield, Activity, Lock, Mail, Key, LogOut, Trash2, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import api from './utils/api';

interface Room { id: string; name: string; building: string; capacity: number; features: string[]; }
interface Booking { id: string; room_id: string; user_id: string; start_time: string; end_time: string; status: string; }
interface AuthResponse { token: string; userId: string; isAdmin: boolean; }

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const data = (error as { response?: { data?: { message?: string; error?: string } } }).response?.data;
    return data?.message || data?.error || fallback;
  }
  return fallback;
};

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('lab_token'));
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('lab_is_admin') === 'true');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');

  // Added 'my-bookings' to the view modes!
  const [viewMode, setViewMode] = useState<'student' | 'my-bookings' | 'admin'>('student');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allLocks, setAllLocks] = useState<Booking[]>([]);
  const [myLocks, setMyLocks] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [txStatus, setTxStatus] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = authMode === 'login' ? { email: authEmail, password: authPassword } : { email: authEmail, password: authPassword, name: authName };
      const res = await api.post<AuthResponse>(endpoint, payload);
      localStorage.setItem('lab_token', res.data.token);
      localStorage.setItem('lab_is_admin', String(res.data.isAdmin));
      setIsAdmin(res.data.isAdmin);
      setToken(res.data.token);
    } catch (error) {
      setAuthError(getErrorMessage(error, 'Authentication failed.'));
    }
  };
  const handleLogout = () => {
    localStorage.removeItem('lab_token');
    localStorage.removeItem('lab_is_admin');
    setToken(null);
    setIsAdmin(false);
    setViewMode('student');
  };

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const roomsRes = await api.get('/api/bookings/list/all');
        setRooms(roomsRes.data);
        
        if (viewMode === 'admin') {
          const locksRes = await api.get('/api/bookings/admin/locks');
          setAllLocks(locksRes.data);
        } else if (viewMode === 'my-bookings') {
          const myLocksRes = await api.get('/api/bookings/me');
          setMyLocks(myLocksRes.data);
        }
      } catch (error) {
        setTxStatus({ type: 'error', title: 'Unable to load data', message: getErrorMessage(error, 'Please try again shortly.') });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [viewMode, refreshKey, token]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    setSubmitting(true);
    setTxStatus(null);
    try {
      await api.post('/api/bookings', {
        room_id: selectedRoom.id,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      });
      setTxStatus({ type: 'success', title: 'Reservation confirmed', message: 'Your lab session has been scheduled.' });
      setSelectedRoom(null); setStartTime(''); setEndTime('');
      setViewMode('my-bookings');
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setTxStatus({ type: 'error', title: 'Reservation unavailable', message: getErrorMessage(error, 'Unable to create the reservation.') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeLock = async (lockId: string) => {
    if (!window.confirm("Are you sure you want to terminate this hardware lock?")) return;
    try {
      await api.delete(`/api/bookings/${lockId}`);
      setAllLocks(prev => prev.filter(lock => lock.id !== lockId));
      setMyLocks(prev => prev.filter(lock => lock.id !== lockId));
      setTxStatus({ type: 'success', title: 'Reservation cancelled', message: 'The session has been removed.' });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setTxStatus({ type: 'error', title: 'Cancellation failed', message: getErrorMessage(error, 'Unable to cancel the reservation.') });
    }
  };

  const getRoomName = (id: string) => rooms.find(r => r.id === id)?.name || 'Unknown Zone';

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-xl">
          <div className="flex justify-center mb-6"><div className="bg-slate-900 p-3 rounded-xl text-white"><Lock size={28} /></div></div>
          <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">Lab Allocation Terminal</h1>
          <p className="text-center text-slate-500 mb-8 font-medium">{authMode === 'login' ? 'Authenticate to access hardware.' : 'Register for grid access.'}</p>
          {authError && <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm font-medium mb-4 flex items-center gap-2"><AlertTriangle size={16} /> {authError}</div>}
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label><input required type="text" value={authName} onChange={e => setAuthName(e.target.value)} className="w-full border p-2.5 rounded-lg text-sm" /></div>}
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Mail size={12}/> Email</label><input required type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full border p-2.5 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Key size={12}/> Password</label><input required type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full border p-2.5 rounded-lg text-sm" /></div>
            <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg mt-6">{authMode === 'login' ? 'Initialize Session' : 'Request Access'}</button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6"><button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="font-bold text-slate-900 hover:underline">{authMode === 'login' ? 'Register here' : 'Login here'}</button></p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium animate-pulse">Synchronizing Data...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8 relative">
      <header className="max-w-5xl mx-auto mb-8 border-b border-slate-200 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 flex items-center gap-3">Lab Allocation Terminal {viewMode === 'admin' && <span className="text-sm bg-rose-100 text-rose-700 px-3 py-1 rounded-full flex items-center gap-1"><Shield size={14}/> ADMIN</span>}</h1>
          <p className="text-slate-500 mt-2">Secure hardware reservation and concurrency engine.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <button onClick={handleLogout} className="text-sm font-bold text-slate-400 hover:text-slate-800 flex items-center gap-1 transition-colors"><LogOut size={14} /> Terminate Session</button>
          <div className="bg-slate-200 p-1 rounded-lg flex gap-1">
            <button onClick={() => setViewMode('student')} className={`px-4 py-2 text-sm font-bold rounded-md ${viewMode === 'student' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Hardware Grid</button>
            <button onClick={() => setViewMode('my-bookings')} className={`px-4 py-2 text-sm font-bold rounded-md ${viewMode === 'my-bookings' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>My Sessions</button>
            {isAdmin && <button onClick={() => setViewMode('admin')} className={`px-4 py-2 text-sm font-bold rounded-md ${viewMode === 'admin' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Admin</button>}
          </div>
        </div>
      </header>

      {txStatus && (
        <div className={`max-w-5xl mx-auto mb-6 p-4 rounded-xl border flex gap-3 items-start ${txStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          {txStatus.type === 'success' ? <CheckCircle2 className="shrink-0 mt-0.5" /> : <AlertTriangle className="shrink-0 mt-0.5" />}
          <div><h3 className="font-bold text-sm uppercase">{txStatus.title}</h3><p className="text-sm mt-0.5 opacity-90">{txStatus.message}</p></div>
          <button onClick={() => setTxStatus(null)} className="ml-auto opacity-60 hover:opacity-100"><X size={18} /></button>
        </div>
      )}

      {/* 1. HARDWARE GRID (STUDENT VIEW) */}
      {viewMode === 'student' && (
        <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {rooms.map((room) => (
            <div key={room.id} className="bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-800 mb-1">{room.name}</h2>
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-md font-bold mb-4 inline-flex items-center gap-1"><Users size={14} /> {room.capacity} Max</span>
              </div>
              <button onClick={() => { setSelectedRoom(room); setTxStatus(null); }} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 px-4 rounded-lg mt-4 flex items-center justify-center gap-2"><Server size={18} /> Reserve Station</button>
            </div>
          ))}
        </main>
      )}

      {/* 2. MY SESSIONS (STUDENT PORTAL) */}
      {viewMode === 'my-bookings' && (
        <main className="max-w-5xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 p-4 border-b border-slate-200 flex items-center gap-2">
              <CalendarDays size={18} className="text-slate-600" />
              <h2 className="font-bold tracking-wide text-slate-800">MY ALLOCATED SESSIONS</h2>
            </div>
            {myLocks.length === 0 ? (
              <p className="p-8 text-center text-slate-500 font-medium">You have no active hardware reservations.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b">
                  <tr><th className="p-4">Location</th><th className="p-4">Start Time</th><th className="p-4">End Time</th><th className="p-4 text-right">Manage</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myLocks.map(lock => (
                    <tr key={lock.id} className="hover:bg-slate-50">
                      <td className="p-4 font-semibold text-slate-900">{getRoomName(lock.room_id)}</td>
                      <td className="p-4 text-slate-700">{format(new Date(lock.start_time), 'MMM d, h:mm a')}</td>
                      <td className="p-4 text-slate-700">{format(new Date(lock.end_time), 'MMM d, h:mm a')}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleRevokeLock(lock.id)} className="text-rose-500 hover:text-rose-700 font-medium flex items-center justify-end gap-1 w-full">
                          <Trash2 size={16} /> Cancel Session
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      )}

      {/* 3. ADMIN VIEW */}
      {viewMode === 'admin' && (
        <main className="max-w-5xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 p-4 text-white flex items-center gap-2">
              <Activity size={18} className="text-emerald-400" />
              <h2 className="font-bold tracking-wide">GLOBAL SYSTEM LOCKS</h2>
            </div>
            {allLocks.length === 0 ? (
              <p className="p-8 text-center text-slate-500 font-medium">No active hardware reservations detected.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b">
                  <tr><th className="p-4">Target System</th><th className="p-4">User UUID</th><th className="p-4">Lock Expires</th><th className="p-4 text-right">Force Action</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allLocks.map(lock => (
                    <tr key={lock.id} className="hover:bg-slate-50">
                      <td className="p-4 font-semibold text-slate-900">{getRoomName(lock.room_id)}</td>
                      <td className="p-4 font-mono text-xs text-slate-500">{lock.user_id.split('-')[0]}...</td>
                      <td className="p-4 text-slate-700">{format(new Date(lock.end_time), 'MMM d, h:mm a')}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleRevokeLock(lock.id)} className="text-rose-500 hover:text-rose-700 font-medium flex items-center justify-end gap-1 w-full">
                          <Trash2 size={16} /> Revoke Lock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      )}

      {/* BOOKING MODAL */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border w-full max-w-md p-6 relative">
            <button onClick={() => setSelectedRoom(null)} className="absolute top-4 right-4 text-slate-400"><X size={20} /></button>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Reserve {selectedRoom.name}</h2>
            <form onSubmit={handleBookingSubmit} className="space-y-4 mt-4">
              <label className="block text-sm font-medium text-slate-700">Start time<input type="datetime-local" required min={new Date().toISOString().slice(0, 16)} value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 w-full border p-2.5 rounded-lg text-sm bg-slate-50" /></label>
              <label className="block text-sm font-medium text-slate-700">End time<input type="datetime-local" required min={startTime || new Date().toISOString().slice(0, 16)} value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 w-full border p-2.5 rounded-lg text-sm bg-slate-50" /></label>
              <button type="submit" disabled={submitting} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-lg">{submitting ? 'Locking...' : 'Confirm Session'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
