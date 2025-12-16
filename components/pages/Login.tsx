import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import { login, getConfig } from '../../services/storage';
import { Scale } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const config = getConfig();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = login(username, password);
    if (user) {
      setUser(user);
      navigate('/');
    } else {
      setError('Credenciales inválidas');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-950 to-slate-900 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500 blur-3xl"></div>
          <div className="absolute top-1/2 right-0 w-64 h-64 rounded-full bg-indigo-500 blur-3xl"></div>
      </div>

      <div className="bg-white/10 backdrop-blur-md p-8 md:p-10 rounded-3xl shadow-2xl border border-white/20 w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="bg-white p-4 rounded-full w-24 h-24 mx-auto mb-6 shadow-lg flex items-center justify-center">
            {config.logoUrl ? (
               <img src={config.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
            ) : (
               <Scale size={48} className="text-blue-900" />
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight mb-2">
            SISTEMA DE GESTIÓN<br/>DE PESAJE BARSA
          </h1>
          <p className="text-blue-200 text-sm font-medium">Acceso Corporativo</p>
        </div>
        
        {error && (
          <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 text-red-100 rounded-xl text-sm text-center font-bold backdrop-blur-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-blue-200 mb-1 uppercase tracking-wide">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-blue-950/50 border border-blue-800 rounded-xl text-white placeholder-blue-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all font-medium"
              placeholder="Ingrese su usuario"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-blue-200 mb-1 uppercase tracking-wide">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-blue-950/50 border border-blue-800 rounded-xl text-white placeholder-blue-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all font-medium"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/50 mt-4 active:scale-95"
          >
            INICIAR SESIÓN
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs text-blue-400 opacity-60">
            &copy; {new Date().getFullYear()} Barsa Systems. Todos los derechos reservados.
        </div>
      </div>
    </div>
  );
};

export default Login;