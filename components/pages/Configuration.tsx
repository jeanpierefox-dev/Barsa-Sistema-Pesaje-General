import React, { useState, useContext, useEffect } from 'react';
import { AppConfig, UserRole } from '../../types';
import { getConfig, saveConfig, resetApp, isFirebaseConfigured, restoreBackup } from '../../services/storage';
import { Printer, Save, Check, AlertTriangle, Bluetooth, Link2, MonitorCheck, Database, Cloud, CloudOff, Download, Upload, HardDriveDownload, HardDriveUpload, Smartphone, Share2, Key, Globe, LayoutGrid, Code, Server, QrCode, Copy, X, ArrowDownCircle, RefreshCw } from 'lucide-react';
import { AuthContext } from '../../App';
import { useLocation, useNavigate } from 'react-router-dom';

const Configuration: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(getConfig());
  const [saved, setSaved] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const { user } = useContext(AuthContext);
  const [isConnected, setIsConnected] = useState(false);
  
  // Connection State
  const [showQR, setShowQR] = useState(false);
  const [connectionToken, setConnectionToken] = useState('');
  const [importTokenInput, setImportTokenInput] = useState('');
  
  // Backup State
  const [showBackupInput, setShowBackupInput] = useState(false);
  const [backupString, setBackupString] = useState('');

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
      setIsConnected(isFirebaseConfigured());
  }, [config]);

  // Handle Import Link (URL Param)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const importToken = params.get('import');
    if (importToken) {
        processImportToken(importToken);
    }
  }, [location]);
  
  const handleSave = () => {
    saveConfig(config);
    setSaved(true);
    setIsConnected(isFirebaseConfigured());
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig({ ...config, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    if (confirm('¡ADVERTENCIA CRÍTICA!\n\nEsto borrará TODOS los datos locales (usuarios, lotes, ventas) y restablecerá la aplicación.\n\nSi estás conectado a la nube, los datos de la nube no se borrarán, solo la conexión de este dispositivo.\n\n¿Estás seguro?')) {
        if(confirm('Confirma por segunda vez: ¿Restablecer dispositivo?')) {
            resetApp();
        }
    }
  };

  const startScan = (type: 'PRINTER' | 'SCALE') => {
      setIsScanning(true);
      setTimeout(() => {
          setIsScanning(false);
          if (type === 'PRINTER') setConfig({...config, printerConnected: !config.printerConnected});
          if (type === 'SCALE') setConfig({...config, scaleConnected: !config.scaleConnected});
      }, 1000);
  };

  // --- SYNC / LINKING LOGIC ---

  const generateConnectionData = () => {
      if (!config.firebaseConfig) {
          alert("Primero debes configurar los datos de la nube manualmente o importar una configuración.");
          return;
      }
      try {
          const jsonStr = JSON.stringify(config.firebaseConfig);
          const token = btoa(jsonStr); // Base64 encode
          setConnectionToken(token);
          setShowQR(true);
      } catch (e) {
          alert("Error al generar el código de vinculación.");
      }
  };

  const processImportToken = (token: string) => {
      if (!token || !token.trim()) return;

      try {
          // Remove whitespace just in case
          const cleanToken = token.trim();
          
          let jsonStr = '';
          try {
             jsonStr = atob(cleanToken);
          } catch(e) {
             throw new Error("El código no tiene formato Base64 válido.");
          }

          if (!jsonStr) throw new Error("El contenido del código está vacío.");

          const parsed = JSON.parse(jsonStr);
          
          if (parsed.apiKey && parsed.projectId) {
              const hasDbUrl = !!parsed.databaseURL;
              const msg = `🔗 DATOS DE NUBE DETECTADOS\n\nProyecto: ${parsed.projectId}\nBase de Datos: ${hasDbUrl ? 'Configurada ✅' : 'No especificada'}\n\n¿Desea vincular este dispositivo ahora?`;
              
              if (confirm(msg)) {
                  const newConfig = { ...config, firebaseConfig: parsed };
                  setConfig(newConfig);
                  saveConfig(newConfig);
                  alert("✅ ¡Vinculación Exitosa!\n\nEl sistema se reiniciará para aplicar los cambios.");
                  // Remove param from URL if present
                  navigate('/config', { replace: true });
                  window.location.reload();
              }
          } else {
              alert("El código es inválido (Faltan datos requeridos).");
          }
      } catch(e: any) {
          console.error("Token error:", e);
          alert(`Error al procesar el código de vinculación: ${e.message || 'Datos corruptos'}`);
      }
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(connectionToken).then(() => {
          alert("Código copiado al portapapeles");
      });
  };

  // --- BACKUP LOGIC ---
  const handleDownloadBackup = () => {
      const data = {
          users: localStorage.getItem('avi_users'),
          batches: localStorage.getItem('avi_batches'),
          orders: localStorage.getItem('avi_orders'),
          config: localStorage.getItem('avi_config'),
          backupDate: new Date().toISOString()
      };
      const jsonStr = JSON.stringify(data, null, 2);
      
      const blob = new Blob([jsonStr], {type : 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RESPALDO_AVICOLA_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = () => {
      if (!backupString || !backupString.trim()) {
          alert("Por favor, pegue el contenido JSON del respaldo.");
          return;
      }

      try {
          const parsed = JSON.parse(backupString);
          if (parsed.users && parsed.config) {
              if (confirm("¡ATENCIÓN! Esto SOBRESCRIBIRÁ todos los datos actuales con los del archivo de respaldo.\n\n¿Desea continuar?")) {
                  restoreBackup(parsed);
              }
          } else {
              alert("El archivo de respaldo no es válido o está incompleto (Faltan usuarios o configuración).");
          }
      } catch (e: any) {
          console.error("Backup parse error:", e);
          alert("Error de lectura: El texto no es un JSON válido.\n\n" + e.message);
      }
  };

  const updateFirebaseConfig = (field: string, value: string) => {
      setConfig({
          ...config,
          firebaseConfig: {
              ...config.firebaseConfig || {} as any,
              [field]: value
          }
      });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Configuración del Sistema</h2>
            <p className="text-slate-500">Ajustes generales y conexión de dispositivos</p>
          </div>
          <button 
            onClick={handleSave}
            className={`flex items-center px-6 py-3 rounded-xl font-bold shadow-lg transition-all ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-900 text-white hover:bg-blue-800'}`}
          >
            {saved ? <Check className="mr-2"/> : <Save className="mr-2" />}
            {saved ? 'Guardado' : 'Guardar Cambios'}
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: GENERAL SETTINGS */}
          <div className="lg:col-span-2 space-y-8">
              
              {/* 1. CLOUD SYNC SECTION */}
              {user?.role === UserRole.ADMIN && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className={`p-4 border-b flex justify-between items-center ${isConnected ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center">
                            <Cloud className={`mr-2 ${isConnected ? 'text-emerald-600' : 'text-slate-400'}`} />
                            Sincronización en Nube
                        </h3>
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${isConnected ? 'bg-white text-emerald-600 border-emerald-200' : 'bg-white text-slate-400 border-slate-200'}`}>
                            {isConnected ? 'CONECTADO' : 'DESCONECTADO'}
                        </span>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        
                        {/* A. CONNECTED STATUS ACTIONS (Show first if connected) */}
                        {isConnected && (
                            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-center sm:text-left">
                                    <h4 className="font-bold text-emerald-900 flex items-center justify-center sm:justify-start">
                                        <Check className="mr-1" size={16}/> Sincronización Activa
                                    </h4>
                                    <p className="text-xs text-emerald-700 mt-1">
                                        ID Proyecto: <span className="font-mono font-bold">{config.firebaseConfig?.projectId}</span>
                                    </p>
                                </div>
                                <button 
                                    onClick={generateConnectionData}
                                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 shadow-md flex items-center text-sm"
                                >
                                    <QrCode size={16} className="mr-2"/> GENERAR CÓDIGO
                                </button>
                            </div>
                        )}

                        {/* B. IMPORT INPUT CARD (ALWAYS VISIBLE NOW) */}
                        <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-xl text-center shadow-md relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <QrCode size={100} className="text-blue-900" />
                            </div>

                            <div className="relative z-10">
                                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                                    <ArrowDownCircle size={32} />
                                </div>
                                <h4 className="text-xl font-black text-blue-900 mb-2">
                                    {isConnected ? 'Cambiar Conexión / Vincular' : '¿Tienes un código de otro equipo?'}
                                </h4>
                                <p className="text-sm text-blue-700 mb-6 max-w-sm mx-auto font-medium">
                                    Pega aquí el código largo generado en el dispositivo principal para {isConnected ? 'sobrescribir la configuración actual' : 'sincronizar todo automáticamente'}.
                                </p>
                                
                                <div className="flex flex-col gap-3">
                                    <input 
                                        value={importTokenInput}
                                        onChange={e => setImportTokenInput(e.target.value)}
                                        placeholder="PEGA EL CÓDIGO DE VINCULACIÓN AQUÍ..."
                                        className="w-full border-2 border-blue-300 bg-white rounded-lg px-4 py-3 font-mono text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none text-center font-bold text-blue-900 placeholder-blue-300"
                                    />
                                    <button 
                                        onClick={() => processImportToken(importTokenInput)}
                                        className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-black hover:bg-blue-700 shadow-lg transform active:scale-95 transition-all flex items-center justify-center text-sm"
                                    >
                                        <Cloud className="mr-2" size={18}/> {isConnected ? 'ACTUALIZAR CONEXIÓN' : 'VINCULAR AHORA'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-slate-200"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-300 text-xs font-bold uppercase">O Configurar Manualmente</span>
                            <div className="flex-grow border-t border-slate-200"></div>
                        </div>

                        {/* C. MANUAL FORM (ALWAYS VISIBLE) */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 gap-4 opacity-80 hover:opacity-100 transition-opacity">
                            <p className="text-xs text-slate-400 font-bold col-span-1">Credenciales de Proyecto Firebase</p>
                            
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Clave API (API Key)</label>
                                <input 
                                    value={config.firebaseConfig?.apiKey || ''} 
                                    onChange={e => updateFirebaseConfig('apiKey', e.target.value)} 
                                    className="w-full p-2 border rounded text-xs font-mono border-slate-300 focus:border-blue-500 outline-none"
                                    placeholder="Ej. AIzaSy..."
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dominio de autenticación</label>
                                <input 
                                    value={config.firebaseConfig?.authDomain || ''} 
                                    onChange={e => updateFirebaseConfig('authDomain', e.target.value)} 
                                    className="w-full p-2 border rounded text-xs font-mono border-slate-300 focus:border-blue-500 outline-none"
                                    placeholder="Ej. mi-app.firebaseapp.com"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">URL de la base de datos <span className="text-blue-500">(Nuevo)</span></label>
                                <input 
                                    value={config.firebaseConfig?.databaseURL || ''} 
                                    onChange={e => updateFirebaseConfig('databaseURL', e.target.value)} 
                                    className="w-full p-2 border rounded text-xs font-mono border-blue-200 bg-blue-50 focus:border-blue-500 outline-none"
                                    placeholder="Ej. https://mi-app.firebaseio.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Identificación del proyecto</label>
                                    <input 
                                        value={config.firebaseConfig?.projectId || ''} 
                                        onChange={e => updateFirebaseConfig('projectId', e.target.value)} 
                                        className="w-full p-2 border rounded text-xs font-mono border-slate-300 focus:border-blue-500 outline-none"
                                        placeholder="Ej. mi-proyecto-123"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">ID de la aplicación</label>
                                    <input 
                                        value={config.firebaseConfig?.appId || ''} 
                                        onChange={e => updateFirebaseConfig('appId', e.target.value)} 
                                        className="w-full p-2 border rounded text-xs font-mono border-slate-300 focus:border-blue-500 outline-none"
                                        placeholder="Ej. 1:123456:web:..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              )}

              {/* 2. GENERAL INFO */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                <h3 className="font-bold text-lg text-slate-800 border-b pb-2">Datos de la Empresa</h3>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Nombre Comercial</label>
                    <input 
                        value={config.companyName}
                        onChange={e => setConfig({...config, companyName: e.target.value})}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 font-medium text-gray-900 focus:border-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Logo (Tickets/Reportes)</label>
                    <div className="flex items-center space-x-4">
                        {config.logoUrl ? (
                            <img src={config.logoUrl} alt="Logo" className="h-20 w-20 object-contain border rounded bg-white" />
                        ) : (
                            <div className="h-20 w-20 bg-gray-50 rounded border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">Sin Logo</div>
                        )}
                        <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                            Subir Imagen
                            <input type="file" onChange={handleLogoUpload} className="hidden" accept="image/*" />
                        </label>
                    </div>
                </div>
              </div>

              {/* 3. HARDWARE DEFAULTS */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                 <h3 className="font-bold text-lg text-slate-800 border-b pb-2">Pesaje Predeterminado</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jabas Llenas (Unidades)</label>
                        <input 
                        type="number"
                        value={config.defaultFullCrateBatch}
                        onChange={e => setConfig({...config, defaultFullCrateBatch: Number(e.target.value)})}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 font-bold text-slate-900 text-center focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jabas Vacías (Unidades)</label>
                        <input 
                        type="number"
                        value={config.defaultEmptyCrateBatch}
                        onChange={e => setConfig({...config, defaultEmptyCrateBatch: Number(e.target.value)})}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 font-bold text-slate-900 text-center focus:border-blue-500 outline-none"
                        />
                    </div>
                 </div>
              </div>
          </div>

          {/* RIGHT COLUMN: TOOLS & HARDWARE */}
          <div className="space-y-8">
              
              {/* HARDWARE STATUS */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                 <h3 className="font-bold text-lg text-slate-800 mb-4">Periféricos</h3>
                 <div className="space-y-3">
                     <div onClick={() => startScan('PRINTER')} className={`cursor-pointer p-4 rounded-xl border flex items-center justify-between transition-colors ${config.printerConnected ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                         <div className="flex items-center gap-3">
                             <Printer size={20} className={config.printerConnected ? 'text-blue-600' : 'text-slate-400'}/>
                             <div>
                                 <p className="font-bold text-sm text-slate-900">Impresora BT</p>
                                 <p className="text-xs text-slate-500">{config.printerConnected ? 'Conectado' : 'Sin conexión'}</p>
                             </div>
                         </div>
                         {config.printerConnected ? <Check size={16} className="text-blue-600"/> : <Link2 size={16} className="text-slate-400"/>}
                     </div>

                     <div onClick={() => startScan('SCALE')} className={`cursor-pointer p-4 rounded-xl border flex items-center justify-between transition-colors ${config.scaleConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                         <div className="flex items-center gap-3">
                             <Bluetooth size={20} className={config.scaleConnected ? 'text-emerald-600' : 'text-slate-400'}/>
                             <div>
                                 <p className="font-bold text-sm text-slate-900">Balanza Elec.</p>
                                 <p className="text-xs text-slate-500">{config.scaleConnected ? 'Conectado' : 'Sin conexión'}</p>
                             </div>
                         </div>
                         {config.scaleConnected ? <Check size={16} className="text-emerald-600"/> : <Link2 size={16} className="text-slate-400"/>}
                     </div>
                 </div>
              </div>

              {/* BACKUP TOOLS */}
              {user?.role === UserRole.ADMIN && (
                 <div className="bg-amber-50 rounded-2xl shadow-sm border border-amber-200 p-6">
                     <h3 className="font-bold text-lg text-amber-900 mb-4 flex items-center"><HardDriveDownload size={18} className="mr-2"/> Respaldo Local</h3>
                     <p className="text-xs text-amber-800 mb-4">Guardar o cargar datos manualmente mediante archivo.</p>
                     
                     <div className="grid grid-cols-2 gap-2">
                         <button onClick={handleDownloadBackup} className="bg-white border border-amber-300 text-amber-800 p-2 rounded-lg text-xs font-bold hover:bg-amber-100 flex flex-col items-center justify-center gap-1">
                             <Download size={16}/> Descargar
                         </button>
                         <button onClick={() => setShowBackupInput(!showBackupInput)} className="bg-white border border-amber-300 text-amber-800 p-2 rounded-lg text-xs font-bold hover:bg-amber-100 flex flex-col items-center justify-center gap-1">
                             <Upload size={16}/> Cargar
                         </button>
                     </div>
                     
                     {showBackupInput && (
                         <div className="mt-3">
                             <textarea 
                                 value={backupString}
                                 onChange={e => setBackupString(e.target.value)}
                                 className="w-full h-20 p-2 text-[10px] rounded border border-amber-300 mb-2 font-mono"
                                 placeholder='Pegar contenido JSON aquí...'
                             />
                             <button onClick={handleRestoreBackup} className="w-full bg-amber-600 text-white py-1 rounded text-xs font-bold">RESTAURAR AHORA</button>
                         </div>
                     )}
                 </div>
              )}
              
              <div className="pt-4">
                  <button onClick={handleReset} className="w-full text-red-500 hover:text-red-700 text-xs font-bold flex items-center justify-center gap-1 p-2 rounded hover:bg-red-50 transition-colors">
                      <AlertTriangle size={14}/> RESTABLECER FÁBRICA
                  </button>
              </div>
          </div>
      </div>

      {/* QR CODE MODAL */}
      {showQR && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl relative">
                  <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X/></button>
                  
                  <h3 className="text-xl font-black text-slate-900 mb-1">Vincular Dispositivo</h3>
                  <p className="text-slate-500 text-sm mb-6">Escanea o copia el código en el nuevo equipo</p>
                  
                  <div className="bg-white p-4 rounded-xl border-2 border-slate-100 inline-block mb-6 shadow-inner">
                      {/* Using a simple public QR API for demo purposes without external deps */}
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(connectionToken)}`} 
                        alt="QR Code" 
                        className="w-48 h-48 object-contain"
                      />
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-1 text-left">Token de Texto</p>
                      <div className="flex gap-2">
                          <input readOnly value={connectionToken} className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-600 truncate" />
                          <button onClick={copyToClipboard} className="bg-blue-100 text-blue-600 p-1.5 rounded hover:bg-blue-200"><Copy size={16}/></button>
                      </div>
                  </div>

                  <button onClick={() => setShowQR(false)} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">Listo, Cerrar</button>
              </div>
          </div>
      )}

      {/* Scanning Overlay */}
      {isScanning && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-2xl flex flex-col items-center animate-pulse">
                  <div className="mb-4 text-blue-600"><MonitorCheck size={48} /></div>
                  <h3 className="text-xl font-bold text-gray-900">Buscando...</h3>
                  <p className="text-gray-500 mt-2">Sincronizando dispositivo</p>
              </div>
          </div>
      )}
    </div>
  );
};

export default Configuration;