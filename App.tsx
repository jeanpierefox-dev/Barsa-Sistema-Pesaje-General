import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { User, UserRole } from './types';
import { LogOut, ArrowLeft, Cloud, CloudOff, X, Zap, Flame, ExternalLink, Settings, Check, Save, Globe, Database, Key, Box, Hash, Server, ShieldAlert, Loader2, Play, Power } from 'lucide-react';
import { isFirebaseConfigured, initCloudSync, getConfig, saveConfig, validateConfig, seedCloudDatabase } from './services/storage';

// Pages
import LoginPage from './components/pages/Login';
import Dashboard from './components/pages/Dashboard';
import UserManagement from './components/pages/UserManagement';
import BatchList from './components/pages/BatchList';
import WeighingStation from './components/pages/WeighingStation';
import Collections from './components/pages/Collections';
import Reports from './components/pages/Reports';
import Configuration from './components/pages/Configuration';

// Context
export const AuthContext = React.createContext<{
  user: User | null;
  setUser: (u: User | null) => void;
  logout: () => void;
}>({ user: null, setUser: () => {}, logout: () => {} });

// Simple Container Layout without Sidebar
const Container: React.FC<{ children: React.ReactNode; title?: string; showBack?: boolean }> = ({ children, title, showBack }) => {
  const { user, logout } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const [isCloudConnected, setIsCloudConnected] = useState(isFirebaseConfigured());
  
  // Connection Modal State
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [orgIdInput, setOrgIdInput] = useState(getConfig().organizationId || '');
  
  // States for Process/Connect split
  const [isProcessing, setIsProcessing] = useState(false); // Validating
  const [isConnecting, setIsConnecting] = useState(false); // Seeding/Saving
  const [processSuccess, setProcessSuccess] = useState(false); // Validation passed
  const [tempConfig, setTempConfig] = useState<any>(null); // Store valid config temporarily
  const [testError, setTestError] = useState('');
  
  // Tab State: 'code' or 'manual'
  const [connectionTab, setConnectionTab] = useState<'code' | 'manual'>('manual');

  // Manual Inputs
  const [manualApiKey, setManualApiKey] = useState('');
  const [manualAuthDomain, setManualAuthDomain] = useState('');
  const [manualDbUrl, setManualDbUrl] = useState('');
  const [manualProjectId, setManualProjectId] = useState('');
  const [manualAppId, setManualAppId] = useState('');

  // Code Input
  const [rawConfigInput, setRawConfigInput] = useState('');

  // Listen for config changes to update badge
  useEffect(() => {
    const interval = setInterval(() => {
        setIsCloudConnected(isFirebaseConfigured());
    }, 2000);
    
    // Pre-fill manual inputs if config exists
    const cfg = getConfig().firebaseConfig;
    if (cfg) {
        setManualApiKey(cfg.apiKey || '');
        setManualAuthDomain(cfg.authDomain || '');
        setManualDbUrl(cfg.databaseURL || '');
        setManualProjectId(cfg.projectId || '');
        setManualAppId(cfg.appId || '');
    }

    return () => clearInterval(interval);
  }, [showConnectionModal]);

  if (!user) return <Navigate to="/login" />;

  // Step 1: Validate Inputs
  const handleProcess = async () => {
    setTestError('');
    setProcessSuccess(false);
    setIsProcessing(true);
    setTempConfig(null);

    try {
        let firebaseConfig: any = {};

        if (connectionTab === 'manual') {
            const cleanApiKey = manualApiKey.trim();
            const cleanProjectId = manualProjectId.trim();

            if (!cleanApiKey || !cleanProjectId) {
                throw new Error("API Key y Project ID son obligatorios.");
            }

            firebaseConfig = {
                apiKey: cleanApiKey,
                authDomain: manualAuthDomain.trim(),
                databaseURL: manualDbUrl.trim(),
                projectId: cleanProjectId,
                appId: manualAppId.trim()
            };

        } else {
            if (!rawConfigInput.trim()) {
                 throw new Error("Pegue el código de configuración primero.");
            }
            
            const extract = (key: string) => {
                const regex = new RegExp(`['"]?${key}['"]?\\s*:\\s*['"]([^'"]+)['"]`, 'i');
                const match = rawConfigInput.match(regex);
                return match ? match[1].trim() : '';
            };

            const apiKey = extract('apiKey');
            const projectId = extract('projectId');

            if (!apiKey || !projectId) {
                 throw new Error("No se encontraron credenciales válidas en el texto.");
            }

            firebaseConfig = {
                apiKey,
                projectId,
                authDomain: extract('authDomain'),
                databaseURL: extract('databaseURL'),
                storageBucket: extract('storageBucket'),
                messagingSenderId: extract('messagingSenderId'),
                appId: extract('appId')
            };
        }

        // VALIDATE CONNECTION
        const validation = await validateConfig(firebaseConfig);
        
        if (!validation.valid) {
            throw new Error("FALLÓ LA PRUEBA: " + validation.error);
        }

        // If valid, store for step 2
        setTempConfig(firebaseConfig);
        setProcessSuccess(true);

    } catch (error: any) {
        console.error("Validation Error:", error);
        setTestError(error.message);
        setProcessSuccess(false);
    } finally {
        setIsProcessing(false);
    }
  };

  // Step 2: Save and Connect
  const handleFinalConnect = async () => {
      if (!tempConfig) return;
      
      setIsConnecting(true);
      setTestError('');

      try {
        const currentConfig = getConfig();
        
        const newConfig = {
            ...currentConfig,
            organizationId: orgIdInput.trim(),
            firebaseConfig: tempConfig
        };

        // CRITICAL: Seed Database
        try {
            await seedCloudDatabase(newConfig);
        } catch (seedError: any) {
            throw new Error("Error creando base de datos: " + seedError.message);
        }

        // Save and Reload
        saveConfig(newConfig);
        alert("✅ CONEXIÓN ESTABLECIDA Y BASE DE DATOS CREADA.\n\nEl sistema se reiniciará. Ya puedes vincular otros dispositivos.");
        window.location.reload();

      } catch (error: any) {
          console.error("Connection Error:", error);
          setTestError("Error Crítico al Conectar: " + error.message);
          setIsConnecting(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* App Bar - Navy Blue */}
      <header className="bg-blue-950 text-white shadow-lg p-4 sticky top-0 z-50 border-b border-blue-900">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {showBack && (
              <button onClick={() => navigate(-1)} className="p-1 hover:bg-blue-900 rounded-full transition-colors">
                <ArrowLeft size={24} />
              </button>
            )}
            <h1 className="text-xl font-bold tracking-tight">{title || 'SISTEMA BARSA'}</h1>
          </div>
          <div className="flex items-center space-x-4">
            
            {/* Connection Status Button */}
            <button 
              onClick={() => setShowConnectionModal(true)}
              className={`hidden sm:flex items-center px-3 py-1.5 rounded-full text-xs font-bold border transition-all hover:scale-105 active:scale-95 ${isCloudConnected ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700 hover:bg-emerald-900' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
            >
               {isCloudConnected ? <Cloud size={14} className="mr-2"/> : <CloudOff size={14} className="mr-2"/>}
               {isCloudConnected ? "EN LÍNEA" : "LOCAL / CONECTAR"}
            </button>

            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-blue-100">{user.name}</p>
              <p className="text-xs text-blue-300">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 p-2 rounded-lg transition-colors shadow-md"
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4">
        {children}
      </main>

      {/* CONNECTION MODAL - DARK THEME */}
      {showConnectionModal && (
          <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-slate-900 rounded-lg w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-700 flex flex-col max-h-[95vh]">
                  
                  {/* Header */}
                  <div className="p-6 pb-2">
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <h2 className="text-2xl font-black text-white tracking-tight">Configuración Nube</h2>
                              <p className="text-slate-400 text-xs font-mono">Firebase Realtime Database / Firestore</p>
                          </div>
                          <button onClick={() => setShowConnectionModal(false)} className="text-slate-500 hover:text-white"><X/></button>
                      </div>
                      
                      {/* ID Org Field - RESTORED */}
                      <div className="mb-6">
                          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">ID Organización (Identificador Único)</label>
                          <input 
                              value={orgIdInput}
                              onChange={e => setOrgIdInput(e.target.value)}
                              placeholder="Ej. SEDE-PRINCIPAL"
                              className="w-full bg-white border border-slate-300 rounded p-3 text-slate-900 font-mono text-sm focus:border-blue-500 outline-none shadow-inner"
                          />
                      </div>

                      {/* Tabs */}
                      <div className="flex border-b border-slate-700">
                          <button 
                            onClick={() => { setConnectionTab('manual'); setProcessSuccess(false); }}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${connectionTab === 'manual' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                          >
                            Entrada Manual
                          </button>
                          <button 
                            onClick={() => { setConnectionTab('code'); setProcessSuccess(false); }}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${connectionTab === 'code' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                          >
                            Pegar Código
                          </button>
                      </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 pt-2 overflow-y-auto custom-scrollbar">
                      
                      {connectionTab === 'manual' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-2">
                                  <label className="flex items-center text-[10px] uppercase font-bold text-slate-500 mb-1">
                                      <Key size={10} className="mr-1"/> API Key <span className="text-red-500 ml-1">*</span>
                                  </label>
                                  <input 
                                      value={manualApiKey} onChange={e => { setManualApiKey(e.target.value); setProcessSuccess(false); }}
                                      className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 text-xs font-mono focus:border-blue-500 outline-none shadow-inner"
                                      placeholder="AIzaSy..."
                                  />
                              </div>
                              <div>
                                  <label className="flex items-center text-[10px] uppercase font-bold text-slate-500 mb-1">
                                      <Globe size={10} className="mr-1"/> Auth Domain
                                  </label>
                                  <input 
                                      value={manualAuthDomain} onChange={e => setManualAuthDomain(e.target.value)}
                                      className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 text-xs font-mono focus:border-blue-500 outline-none shadow-inner"
                                      placeholder="myapp.firebaseapp.com"
                                  />
                              </div>
                              <div>
                                  <label className="flex items-center text-[10px] uppercase font-bold text-slate-500 mb-1">
                                      <Database size={10} className="mr-1"/> Database URL
                                  </label>
                                  <input 
                                      value={manualDbUrl} onChange={e => setManualDbUrl(e.target.value)}
                                      className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 text-xs font-mono focus:border-blue-500 outline-none shadow-inner"
                                      placeholder="https://myapp.firebaseio.com"
                                  />
                              </div>
                              <div>
                                  <label className="flex items-center text-[10px] uppercase font-bold text-slate-500 mb-1">
                                      <Box size={10} className="mr-1"/> Project ID <span className="text-red-500 ml-1">*</span>
                                  </label>
                                  <input 
                                      value={manualProjectId} onChange={e => { setManualProjectId(e.target.value); setProcessSuccess(false); }}
                                      className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 text-xs font-mono focus:border-blue-500 outline-none shadow-inner"
                                      placeholder="myapp-12345"
                                  />
                              </div>
                              <div>
                                  <label className="flex items-center text-[10px] uppercase font-bold text-slate-500 mb-1">
                                      <Hash size={10} className="mr-1"/> App ID
                                  </label>
                                  <input 
                                      value={manualAppId} onChange={e => setManualAppId(e.target.value)}
                                      className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 text-xs font-mono focus:border-blue-500 outline-none shadow-inner"
                                      placeholder="1:123456:web:..."
                                  />
                              </div>
                          </div>
                      ) : (
                          <div>
                              <div className="bg-slate-950 p-3 rounded mb-3 border border-slate-800">
                                  <p className="text-slate-400 text-xs mb-2">Pegue el objeto de configuración JS completo:</p>
                                  <textarea 
                                    value={rawConfigInput}
                                    onChange={e => { setRawConfigInput(e.target.value); setProcessSuccess(false); }}
                                    className="w-full h-40 bg-white text-slate-900 font-mono text-sm p-3 border border-slate-300 rounded outline-none resize-none shadow-inner"
                                    placeholder={`const firebaseConfig = {\n  apiKey: "...",\n  authDomain: "...",\n  projectId: "..."\n};`}
                                  />
                              </div>
                          </div>
                      )}
                      
                      {/* ERROR DISPLAY */}
                      {testError && (
                          <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-xs font-mono break-words">
                              <strong className="block mb-1">Mensaje de Sistema:</strong>
                              {testError}
                          </div>
                      )}
                      
                      {/* SUCCESS DISPLAY */}
                      {processSuccess && !testError && (
                          <div className="mt-4 p-3 bg-emerald-900/50 border border-emerald-500 rounded text-emerald-200 text-xs font-mono">
                              <strong>¡Configuración Válida!</strong><br/>
                              Credenciales procesadas correctamente. Ahora pulse "Conectar".
                          </div>
                      )}

                      {/* Footer Actions - SPLIT BUTTONS */}
                      <div className="mt-6 flex gap-3">
                          {/* BUTTON 1: PROCESS */}
                          <button 
                            onClick={handleProcess}
                            disabled={isProcessing || isConnecting || processSuccess}
                            className={`flex-1 bg-blue-700 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black py-4 rounded-lg shadow-lg uppercase tracking-wider text-xs transition-all flex items-center justify-center ${processSuccess ? 'opacity-50' : ''}`}
                          >
                              {isProcessing ? <Loader2 className="animate-spin mr-2"/> : <Play className="mr-2" size={16}/>}
                              {isProcessing ? 'Verificando...' : '1. Procesar'}
                          </button>

                          {/* BUTTON 2: CONNECT */}
                          <button 
                            onClick={handleFinalConnect}
                            disabled={!processSuccess || isConnecting}
                            className={`flex-1 font-black py-4 rounded-lg shadow-lg uppercase tracking-wider text-xs transition-all flex items-center justify-center ${processSuccess ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                          >
                              {isConnecting ? <Loader2 className="animate-spin mr-2"/> : <Power className="mr-2" size={16}/>}
                              {isConnecting ? 'Creando DB...' : '2. Conectar'}
                          </button>
                      </div>
                      
                      {/* Security Rules Warning */}
                      <div className="mt-6 border-t border-slate-800 pt-4 flex gap-3">
                           <ShieldAlert className="text-yellow-500 flex-shrink-0" size={24}/>
                           <div>
                               <p className="text-xs font-bold text-yellow-500 uppercase mb-1">¿Error de Permisos?</p>
                               <p className="text-[10px] text-slate-500">
                                   Si falla la conexión, asegúrate de que las reglas en Firebase Console sean: <code>allow read, write: if true;</code>
                               </p>
                           </div>
                      </div>

                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
    // Simple Session Persistence
    const [user, setUserState] = useState<User | null>(() => {
        try {
            const saved = localStorage.getItem('avi_session_user');
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });

    const setUser = (u: User | null) => {
        if (u) localStorage.setItem('avi_session_user', JSON.stringify(u));
        else localStorage.removeItem('avi_session_user');
        setUserState(u);
    };

    const logout = () => setUser(null);

    return (
        <AuthContext.Provider value={{ user, setUser, logout }}>
            <HashRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    
                    <Route path="/" element={<Container><Dashboard /></Container>} />
                    <Route path="/usuarios" element={<Container title="Gestión de Usuarios" showBack><UserManagement /></Container>} />
                    <Route path="/lotes" element={<Container title="Lotes de Producción" showBack><BatchList /></Container>} />
                    <Route path="/weigh/:mode/:batchId?" element={<Container title="Estación de Pesaje" showBack><WeighingStation /></Container>} />
                    <Route path="/cobranza" element={<Container title="Cobranza y Caja" showBack><Collections /></Container>} />
                    <Route path="/reportes" element={<Container title="Reportes y Estadísticas" showBack><Reports /></Container>} />
                    <Route path="/config" element={<Container title="Configuración" showBack><Configuration /></Container>} />
                    
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </HashRouter>
        </AuthContext.Provider>
    );
};

export default App;