import React, { useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import { login, getConfig, resetApp, restoreBackup } from '../../services/storage';
import { Scale, Wrench, RefreshCw, Upload, AlertTriangle, X } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [backupString, setBackupString] = useState('');
  
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

  const handleFactoryReset = () => {
      if (confirm("PELIGRO: Esto borrará TODOS los datos de este dispositivo y lo dejará como nuevo.\n\n¿Estás seguro?")) {
          if(confirm("Confirma por segunda vez: ¿BORRAR TODO?")) {
              resetApp();
          }
      }
  };

  const handleRestore = () => {
      try {
          if (!backupString) return;
          const data = JSON.parse(backupString);
          if (confirm("¿Restaurar estos datos? Se sobrescribirá la información actual.")) {
              restoreBackup(data);
          }
      } catch (e) {
          alert("El código de respaldo no es válido.");
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden">
      {/* Abstract Corporate Background */}
      <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-900 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-900 rounded-full blur-[100px] opacity-20 translate-y-1/2 -translate-x-1/2"></div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-2xl shadow-2xl border border-white/10 w-full max-w-md relative z-10 flex flex-col items-center">
        
        {/* Recovery Button (Top Right) */}
        <button 
            onClick={() => setShowRecovery(true)}
            className="absolute top-4 right-4 text-slate-500 hover:text-blue-400 transition-colors p-2"
            title="Herramientas de Recuperación"
        >
            <Wrench size={16} />
        </button>

        <div className="mb-8 flex flex-col items-center">
          <div className="bg-white p-4 rounded-xl w-20 h-20 shadow-lg flex items-center justify-center mb-6">
            {config.logoUrl ? (
               <img src={config.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
            ) : (
               <Scale size={40} className="text-slate-900" />
            )}
          </div>
          <h1 className="text-3xl font-youthful font-black text-white text-center tracking-tight leading-tight uppercase">
            Sistema Barsa
          </h1>
          <div className="h-1.5 w-16 bg-blue-500 mt-4 mb-2 rounded-full"></div>
          <p className="text-blue-200/90 text-sm font-youthful font-medium tracking-wide">Control Avícola Integral</p>
        </div>
        
        {error && (
          <div className="w-full mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-200 rounded-lg text-xs text-center font-bold font-youthful">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          <div>
            <label className="block text-xs font-youthful font-bold text-slate-400 mb-2 uppercase tracking-wide">Identificación de Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-youthful font-medium"
              placeholder="Ej. admin"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-youthful font-bold text-slate-400 mb-2 uppercase tracking-wide">Clave de Acceso</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-youthful font-medium"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-youthful font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/40 mt-2 active:scale-95 tracking-wide text-sm"
          >
            INGRESAR AL SISTEMA
          </button>
        </form>
        
        <div className="mt-10 text-center text-[10px] text-slate-500 font-youthful">
            Technology Solutions &copy; {new Date().getFullYear()}
        </div>
      </div>

      {/* RECOVERY MODAL */}
      {showRecovery && (
          <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
                  <button onClick={() => setShowRecovery(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  
                  <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2">
                      <Wrench className="text-blue-600"/> Recuperación
                  </h3>
                  <p className="text-xs text-slate-500 mb-6">Herramientas de emergencia para restaurar el sistema.</p>

                  <div className="space-y-4">
                      {/* Restore Backup */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <label className="block text-xs font-bold text-slate-700 mb-2 uppercase">Cargar Copia de Seguridad</label>
                          <textarea 
                              value={backupString}
                              onChange={e => setBackupString(e.target.value)}
                              className="w-full h-20 text-[10px] p-2 border rounded-lg bg-white mb-2 font-mono"
                              placeholder='Pegar código JSON aquí...'
                          />
                          <button onClick={handleRestore} className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center hover:bg-blue-700">
                              <Upload size={14} className="mr-2"/> Restaurar Datos
                          </button>
                      </div>

                      <div className="relative flex py-2 items-center">
                          <div className="flex-grow border-t border-slate-200"></div>
                          <span className="flex-shrink-0 mx-4 text-gray-300 text-xs font-bold">ZONA DE PELIGRO</span>
                          <div className="flex-grow border-t border-slate-200"></div>
                      </div>

                      {/* Factory Reset */}
                      <button onClick={handleFactoryReset} className="w-full bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl text-xs font-bold flex items-center justify-center hover:bg-red-100 transition-colors">
                          <AlertTriangle size={16} className="mr-2"/> RESTABLECER DE FÁBRICA
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Login;