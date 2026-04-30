import { useState, useEffect } from 'react';
import { useAuth } from '../../store/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getRedirectPath = (userProfile: any) => {
    if (!userProfile) return '/login';
    if (userProfile.defaultPage) return userProfile.defaultPage;
    if (userProfile.role === 'admin') return '/dashboard';
    
    const modules = [
      { id: 'dashboard', path: '/dashboard' },
      { id: 'clients', path: '/clients' },
      { id: 'projects', path: '/projects' },
      { id: 'chat', path: '/chat' },
      { id: 'documents', path: '/documents' },
      { id: 'explorer', path: '/explorer' },
      { id: 'notes', path: '/notes' },
      { id: 'teams', path: '/teams' },
      { id: 'communication', path: '/communication' }
    ];

    const firstAccessible = modules.find(m => userProfile.permissions?.includes(m.id));
    return firstAccessible ? firstAccessible.path : '/profile';
  };

  useEffect(() => {
    if (user) {
      navigate(getRedirectPath(user));
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      // Let the useEffect handle the redirect to ensure profile data is loaded
    } catch (err: any) {
      console.error("Login failed", err);
      setError(err.message || 'Failed to login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg border border-slate-200 shadow-sm p-8">
        <div className="mb-8 text-center">
          <div className="inline-flex flex-col items-center mb-6">
             <div className="text-3xl font-bold text-slate-900 tracking-tighter">Nexus</div>
             <div className="text-[10px] uppercase font-bold tracking-[0.3em] text-blue-600">Enterprise</div>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Welcome Back</h2>
          <p className="text-sm text-slate-500 mt-1">Access your enterprise portal</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="admin@nexus.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50" 
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 italic">By signing in, you agree to our Terms of Service</p>
        </div>
      </div>
    </div>
  );
}

