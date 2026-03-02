'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  LayoutDashboard, 
  Clock, 
  FileText, 
  CheckSquare, 
  MessageSquare, 
  Settings, 
  LogOut, 
  UserPlus,
  Bell,
  Search,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs,
} from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// --- CONFIGURATION & INITIALIZATION ---
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const appId = 'control-flow-v1';

// --- CONTEXT FOR SESSION MANAGEMENT ---
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// --- COMPONENTS ---

const LoginPage = ({ onLogin }) => {
  const [formData, setFormData] = useState({ orgId: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // WARNING: Storing and querying plaintext passwords is a major security risk.
      // This implementation is for demonstration purposes only and should be replaced
      // with a secure authentication system like Firebase Authentication.
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      const q = query(
        usersRef, 
        where('orgId', '==', formData.orgId),
        where('username', '==', formData.username),
        where('password', '==', formData.password)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
        onLogin(userData);
      } else {
        setError('Invalid credentials or Organization ID.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error. Please check your database rules.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-indigo-600/20 rounded-xl mb-4">
            <LayoutDashboard className="text-indigo-500 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ControlFlow</h1>
          <p className="text-slate-400 text-sm mt-1">Mission Control Login</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Organization ID</label>
            <input 
              type="text" required
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="e.g. ORG_001"
              value={formData.orgId}
              onChange={(e) => setFormData({...formData, orgId: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Username</label>
            <input 
              type="text" required
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="admin_user"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Password</label>
            <input 
              type="password" required
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center">{error}</div>}

          <button 
            type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Enter Command Center'}
          </button>
        </form>
      </div>
    </div>
  );
};

const Sidebar = ({ activePage, setActivePage, user, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'attendance', icon: Clock, label: 'Attendance' },
    { id: 'requisitions', icon: FileText, label: 'Requisitions' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  if (user.role === 'ORG_ADMIN') {
    menuItems.splice(5, 0, { id: 'admin', icon: UserPlus, label: 'Management' });
  }

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <LayoutDashboard className="text-white w-5 h-5" />
          </div>
          <div>
            <h2 className="text-white font-bold leading-none tracking-tight">ControlFlow</h2>
            <p className="text-[10px] text-indigo-400 font-mono mt-1 uppercase tracking-tighter">{user.orgId}</p>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activePage === item.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 p-4 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold">
              {user.displayName?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-sm font-semibold truncate">{user.displayName}</p>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-slate-400 hover:text-red-400 transition-colors border border-slate-700 rounded-lg hover:border-red-400/30"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </div>
    </aside>
  );
};

// --- MAIN APP ---

export default function Page() {
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('controlflow_session');
    if (savedUser) setUser(JSON.parse(savedUser));
    setInitializing(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('controlflow_session', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('controlflow_session');
  };

  if (initializing) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="animate-spin text-indigo-500 w-12 h-12" />
    </div>
  );

  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <AuthContext.Provider value={{ user, db, appId }}>
      <div className="min-h-screen bg-slate-950 flex">
        <Sidebar 
          activePage={activePage} 
          setActivePage={setActivePage} 
          user={user} 
          onLogout={handleLogout} 
        />
        
        <main className="flex-1 ml-64 p-8">
          <header className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {activePage.charAt(0).toUpperCase() + activePage.slice(1)}
              </h1>
              <p className="text-slate-500 text-sm">Welcome back, {user.displayName}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Global Command Search..." 
                  className="bg-slate-900 border border-slate-800 text-white text-sm rounded-xl pl-10 pr-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-64"
                />
              </div>
              <button className="p-2.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl hover:text-indigo-400 transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full"></span>
              </button>
            </div>
          </header>

          <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {activePage === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Clock-in Status', value: user.status || 'Offline', icon: Clock, color: 'text-emerald-400' },
                  { label: 'Active Tasks', value: '0', icon: CheckSquare, color: 'text-indigo-400' },
                  { label: 'Pending Reqs', value: '0', icon: FileText, color: 'text-amber-400' },
                  { label: 'Colleagues Online', value: '1', icon: MessageSquare, color: 'text-purple-400' },
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-2xl">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-xl bg-slate-800 ${stat.color}`}>
                        <stat.icon size={24} />
                      </div>
                      <ChevronRight className="text-slate-600" size={16} />
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
                  </div>
                ))}
                
                <div className="lg:col-span-3 bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-2xl min-h-[300px] flex flex-col items-center justify-center text-center">
                   <div className="bg-slate-800 p-4 rounded-full mb-4">
                      <LayoutDashboard className="text-slate-600 w-12 h-12" />
                   </div>
                   <h2 className="text-xl font-bold text-white">System Initialized</h2>
                   <p className="text-slate-500 max-w-sm mt-2">The core shell is ready. Use the Admin Management tab to populate your organization with staff members.</p>
                </div>

                <div className="lg:col-span-1 bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-2xl">
                   <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                     <Bell size={18} className="text-indigo-400" /> Announcements
                   </h2>
                   <div className="space-y-4">
                      <div className="p-4 bg-slate-900/50 rounded-xl border border-indigo-500/20">
                        <p className="text-xs text-indigo-400 font-bold mb-1 uppercase">Pinned</p>
                        <p className="text-sm text-slate-300">Welcome to ControlFlow. System modules are coming online.</p>
                      </div>
                   </div>
                </div>
              </div>
            )}

            {activePage !== 'dashboard' && (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl text-center">
                 <h2 className="text-white font-bold text-xl uppercase tracking-widest">Module Offline</h2>
                 <p className="text-slate-500 mt-2">This specific feature ({activePage}) is scheduled for the next deployment turn.</p>
              </div>
            )}
          </section>
        </main>
      </div>
    </AuthContext.Provider>
  );
}
