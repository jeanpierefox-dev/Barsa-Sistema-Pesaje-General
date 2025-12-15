import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import { login, getConfig } from '../../services/storage';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 w-full max-w-md">
        <div className="text-center mb-8">
          {config.logoUrl ? (
             <img src={config.logoUrl} alt="Logo" className="h-24 mx-auto mb-4 object-contain" />
          ) : (
             <div className="h-20 w-20 bg-slate-900 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold text-2xl">AV</div>
          )}
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">AviControl Pro</h1>
          <p className="text-slate-500 mt-2">Iniciar Sesión</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all font-medium"
              placeholder="Ingrese su usuario"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all font-medium"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors shadow-lg"
          >
            INGRESAR
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;