import React, { useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import { login, getConfig, resetApp, restoreBackup } from '../../services/storage';
import { Scale, Wrench, RefreshCw, Upload, AlertTriangle, X, User, Lock } from 'lucide-react';

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
      if (!backupString || !backupString.trim()) {
          alert("El campo de código está vacío.");
          return;
      }
      try {
          const data = JSON.parse(backupString);
          if (confirm("¿Restaurar estos datos? Se sobrescribirá la información actual.")) {
              restoreBackup(data);
          }
      } catch (e: any) {
          alert("Error: El código no es un JSON válido.\n" + e.message);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden">
      {/* Abstract Corporate Background */}
      <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-900 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-900 rounded-full blur-[100px] opacity-20 translate-y-1/2 -translate-x-1/2"></div>
      </div>

      <div className="bg-white/10 backdrop-blur-xl p-8 md:p-12 rounded-3xl shadow-2xl border border-white/20 w-full max-w-md relative z-10 flex flex-col items-center">
        
        {/* Recovery Button (Top Right) */}
        <button 
            onClick={() => setShowRecovery(true)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-2"
            title="Herramientas de Recuperación"
        >
            <Wrench size={18} />
        </button>

        <div className="mb-8 flex flex-col items-center">
          <div className="bg-white p-4 rounded-2xl w-24 h-24 shadow-xl flex items-center justify-center mb-6 ring-4 ring-white/10">
            {config.logoUrl ? (
               <img src={config.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
            ) : (
               <Scale size={48} className="text-blue-900" />
            )}
          </div>
          <h1 className="text-3xl font-youthful font-black text-white text-center tracking-tight leading-tight uppercase">
            Sistema Barsa
          </h1>
          <div className="h-1.5 w-16 bg-blue-500 mt-4 mb-2 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
          <p className="text-blue-200 text-sm font-youthful font-medium tracking-wide">Control Avícola Integral</p>
        </div>
        
        {error && (
          <div className="w-full mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-100 rounded-xl text-sm text-center font-bold font-youthful shadow-inner backdrop-blur-sm">
            <AlertTriangle className="inline mr-2 mb-0.5" size={16}/>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 w-full">
          <div className="relative group">
            <label className="block text-xs font-youthful font-bold text-slate-300 mb-1.5 uppercase tracking-wide ml-1">Identificación de Usuario</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all font-bold text-lg shadow-sm"
                  placeholder="Ej. admin"
                  required
                />
            </div>
          </div>
          
          <div className="relative group">
            <label className="block text-xs font-youthful font-bold text-slate-300 mb-1.5 uppercase tracking-wide ml-1">Clave de Acceso</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all font-bold text-lg shadow-sm"
                  placeholder="••••••••"
                  required
                />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-youthful font-black py-4 rounded-xl transition-all shadow-lg shadow-blue-900/50 mt-4 active:scale-95 tracking-wide text-base border-t border-white/20"
          >
            INGRESAR AL SISTEMA
          </button>
        </form>
        
        <div className="mt-8 text-center text-[10px] text-slate-400/60 font-youthful">
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