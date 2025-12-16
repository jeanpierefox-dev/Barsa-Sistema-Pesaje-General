import React, { useState, useContext, useEffect } from 'react';
import { AppConfig, UserRole } from '../../types';
import { getConfig, saveConfig, resetApp, isFirebaseConfigured, restoreBackup } from '../../services/storage';
import { Printer, Save, Check, AlertTriangle, Bluetooth, Link2, MonitorCheck, Database, Cloud, CloudOff, Copy, Download, Upload, HardDriveDownload, HardDriveUpload, Smartphone, Share2, Key } from 'lucide-react';
import { AuthContext } from '../../App';

const Configuration: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(getConfig());
  const [saved, setSaved] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const { user } = useContext(AuthContext);
  const [isConnected, setIsConnected] = useState(false);
  
  // Connection State
  const [connectionToken, setConnectionToken] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkMode, setLinkMode] = useState<'GENERATE' | 'INPUT' | null>(null);

  // Backup State
  const [showBackupInput, setShowBackupInput] = useState(false);
  const [backupString, setBackupString] = useState('');

  useEffect(() => {
      setIsConnected(isFirebaseConfigured());
  }, [config]);
  
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

  // --- NEW SIMPLIFIED CONNECTION LOGIC ---

  const generateLinkCode = () => {
      if (!config.firebaseConfig) {
          alert("Primero debes configurar Firebase manualmente en el código o tener una conexión activa.");
          return;
      }
      // Encode config to Base64 to make it look like a simple token
      try {
          const jsonStr = JSON.stringify(config.firebaseConfig);
          const token = btoa(jsonStr);
          const finalToken = `AVI_LINK_${token}`;
          
          navigator.clipboard.writeText(finalToken).then(() => {
              alert("¡CÓDIGO COPIADO!\n\nEnvía este código por WhatsApp o correo a tu otro dispositivo y pégalo allí para vincularlo.");
          });
          setLinkMode('GENERATE');
      } catch (e) {
          alert("Error al generar el código.");
      }
  };

  const handleLinkDevice = () => {
      try {
          let cleanToken = connectionToken.trim();
          
          if (!cleanToken) return;

          // Remove prefix if present
          if (cleanToken.startsWith('AVI_LINK_')) {
              cleanToken = cleanToken.replace('AVI_LINK_', '');
          }

          // Decode
          const jsonStr = atob(cleanToken);
          const parsed = JSON.parse(jsonStr);

          if (parsed.apiKey && parsed.projectId) {
              const newConfig = { ...config, firebaseConfig: parsed };
              setConfig(newConfig);
              saveConfig(newConfig);
              setConnectionToken('');
              setLinkMode(null);
              alert("¡VINCULACIÓN EXITOSA!\n\nEste dispositivo ahora está sincronizado con la nube.");
              window.location.reload(); // Reload to ensure services start
          } else {
              alert("El código es inválido. Verifica que copiaste todo el texto.");
          }
      } catch (e) {
          alert("Código inválido. Asegúrate de copiar el código completo generado en el dispositivo principal.");
      }
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
      try {
          const parsed = JSON.parse(backupString);
          if (parsed.users && parsed.config) {
              if (confirm("¡ATENCIÓN! Esto SOBRESCRIBIRÁ todos los datos actuales con los del archivo de respaldo.\n\n¿Desea continuar?")) {
                  restoreBackup(parsed);
              }
          } else {
              alert("El archivo de respaldo no es válido o está incompleto.");
          }
      } catch (e) {
          alert("Error de formato JSON. Asegúrese de copiar el contenido completo del archivo.");
      }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-10">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
        {/* Company Info */}
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">Nombre de la Empresa</label>
          <input 
            value={config.companyName}
            onChange={e => setConfig({...config, companyName: e.target.value})}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 font-medium text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">Logo (Para Tickets y Reportes)</label>
          <div className="flex items-center space-x-4">
            {config.logoUrl ? (
                <img src={config.logoUrl} alt="Logo" className="h-20 w-20 object-contain border rounded bg-white" />
            ) : (
                <div className="h-20 w-20 bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">Sin Logo</div>
            )}
            <input type="file" onChange={handleLogoUpload} className="text-sm text-gray-600" accept="image/*" />
          </div>
        </div>

        <hr className="border-gray-200"/>

        {/* Weighing Defaults */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Lote Jabas Llenas (Default)</label>
            <input 
              type="number"
              value={config.defaultFullCrateBatch}
              onChange={e => setConfig({...config, defaultFullCrateBatch: Number(e.target.value)})}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 font-bold text-gray-900 text-center"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Lote Jabas Vacías (Default)</label>
            <input 
              type="number"
              value={config.defaultEmptyCrateBatch}
              onChange={e => setConfig({...config, defaultEmptyCrateBatch: Number(e.target.value)})}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 font-bold text-gray-900 text-center"
            />
          </div>
        </div>

        {/* Peripherals */}
        <div>
           <h3 className="font-bold text-lg text-gray-900 mb-4">Vincular Dispositivos</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Printer Card */}
             <div onClick={() => startScan('PRINTER')} className={`cursor-pointer group relative p-5 rounded-2xl border-2 transition-all overflow-hidden ${config.printerConnected ? 'border-blue-500 bg-blue-50' : 'border-dashed border-gray-300 hover:border-blue-300 hover:bg-gray-50'}`}>
                 <div className="flex items-center justify-between relative z-10">
                     <div className="flex items-center space-x-3">
                         <div className={`p-3 rounded-full ${config.printerConnected ? 'bg-blue-200 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                             <Printer size={24} />
                         </div>
                         <div>
                             <h4 className="font-bold text-gray-800">Impresora</h4>
                             <p className="text-xs text-gray-500">{config.printerConnected ? 'Vinculada y Lista' : 'Toque para buscar'}</p>
                         </div>
                     </div>
                     <div className={`p-1.5 rounded-full ${config.printerConnected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                         {config.printerConnected ? <Check size={16} /> : <Link2 size={16} />}
                     </div>
                 </div>
             </div>

             {/* Scale Card */}
             <div onClick={() => startScan('SCALE')} className={`cursor-pointer group relative p-5 rounded-2xl border-2 transition-all overflow-hidden ${config.scaleConnected ? 'border-emerald-500 bg-emerald-50' : 'border-dashed border-gray-300 hover:border-emerald-300 hover:bg-gray-50'}`}>
                 <div className="flex items-center justify-between relative z-10">
                     <div className="flex items-center space-x-3">
                         <div className={`p-3 rounded-full ${config.scaleConnected ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                             <Bluetooth size={24} />
                         </div>
                         <div>
                             <h4 className="font-bold text-gray-800">Balanza</h4>
                             <p className="text-xs text-gray-500">{config.scaleConnected ? 'Vinculada y Lista' : 'Toque para buscar'}</p>
                         </div>
                     </div>
                     <div className={`p-1.5 rounded-full ${config.scaleConnected ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                         {config.scaleConnected ? <Check size={16} /> : <Link2 size={16} />}
                     </div>
                 </div>
             </div>
           </div>
        </div>

        {/* FIREBASE CONFIG (ADMIN ONLY) */}
        {user?.role === UserRole.ADMIN && (
            <div className="border-t border-gray-200 pt-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-gray-900 flex items-center"><Database className="mr-2"/> Nube y Sincronización</h3>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-black flex items-center ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isConnected ? <Cloud size={14} className="mr-2"/> : <CloudOff size={14} className="mr-2"/>}
                        {isConnected ? "CONECTADO" : "SIN CONEXIÓN"}
                    </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <p className="text-sm text-slate-600 mb-6">
                        Conecte múltiples dispositivos para ver los mismos datos en tiempo real. 
                    </p>
                    
                    {!linkMode ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <button 
                                onClick={generateLinkCode}
                                className="bg-white border-2 border-blue-200 p-4 rounded-xl hover:bg-blue-50 transition-all text-left group"
                             >
                                 <div className="flex items-center mb-2 text-blue-700 group-hover:scale-105 transition-transform">
                                     <Share2 className="mr-2"/>
                                     <span className="font-black">Compartir Conexión</span>
                                 </div>
                                 <p className="text-xs text-slate-500">
                                     Este es el dispositivo principal. Generar código para conectar otros.
                                 </p>
                             </button>

                             <button 
                                onClick={() => setLinkMode('INPUT')}
                                className="bg-white border-2 border-emerald-200 p-4 rounded-xl hover:bg-emerald-50 transition-all text-left group"
                             >
                                 <div className="flex items-center mb-2 text-emerald-700 group-hover:scale-105 transition-transform">
                                     <Smartphone className="mr-2"/>
                                     <span className="font-black">Conectar Nuevo Dispositivo</span>
                                 </div>
                                 <p className="text-xs text-slate-500">
                                     Tengo un código de otro dispositivo y quiero pegarlo aquí.
                                 </p>
                             </button>
                        </div>
                    ) : (
                        <div className="bg-white p-4 rounded-xl border border-slate-200 animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-slate-800">
                                    {linkMode === 'GENERATE' ? 'Código de Vinculación Generado' : 'Ingresar Código de Vinculación'}
                                </h4>
                                <button onClick={() => setLinkMode(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">CANCELAR</button>
                            </div>

                            {linkMode === 'GENERATE' && (
                                <div className="text-center py-4">
                                    <div className="bg-green-100 text-green-800 p-3 rounded-lg text-sm font-bold mb-2">
                                        ¡Copiado al portapapeles!
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Pega este código en el nuevo dispositivo seleccionando la opción "Conectar Nuevo Dispositivo".
                                    </p>
                                </div>
                            )}

                            {linkMode === 'INPUT' && (
                                <div>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-3 text-slate-400" size={18}/>
                                        <input 
                                            value={connectionToken}
                                            onChange={e => setConnectionToken(e.target.value)}
                                            placeholder="Pegar código (ej. AVI_LINK_...)"
                                            className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-lg font-mono text-sm focus:border-emerald-500 outline-none"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleLinkDevice}
                                        className="w-full mt-3 bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 shadow-md flex items-center justify-center"
                                    >
                                        <Link2 size={18} className="mr-2"/> VINCULAR AHORA
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Advanced Toggle Hidden */}
                    <div className="mt-6 pt-4 border-t border-slate-200">
                        <details className="text-xs text-slate-400">
                            <summary className="cursor-pointer hover:text-slate-600 font-bold mb-2">Opciones Avanzadas (Manual)</summary>
                            <div className="grid grid-cols-1 gap-2 mt-2">
                                <input 
                                    placeholder="API Key" 
                                    value={config.firebaseConfig?.apiKey || ''} 
                                    onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, apiKey: e.target.value} as any})}
                                    className="p-2 border rounded shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                />
                                <input 
                                    placeholder="Project ID" 
                                    value={config.firebaseConfig?.projectId || ''} 
                                    onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, projectId: e.target.value} as any})}
                                    className="p-2 border rounded shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                />
                            </div>
                        </details>
                    </div>
                </div>
            </div>
        )}
        
        {/* DATA BACKUP SECTION */}
        {user?.role === UserRole.ADMIN && (
             <div className="border-t border-gray-200 pt-6">
                 <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center"><HardDriveDownload className="mr-2"/> Respaldo de Datos (Seguridad)</h3>
                 <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                     <p className="text-sm text-amber-800 mb-4 font-medium">
                         Descargue una copia de seguridad de TODOS sus datos locales para evitar pérdidas por cambios de dispositivo o limpieza de caché.
                     </p>
                     
                     <div className="flex flex-col md:flex-row gap-4">
                         <button 
                             onClick={handleDownloadBackup}
                             className="flex-1 bg-white border-2 border-amber-200 text-amber-800 px-4 py-3 rounded-xl font-bold flex items-center justify-center hover:bg-amber-100 shadow-sm transition-all"
                         >
                             <Download size={20} className="mr-2"/> DESCARGAR RESPALDO
                         </button>
                         <button 
                             onClick={() => setShowBackupInput(!showBackupInput)}
                             className="flex-1 bg-white border-2 border-slate-300 text-slate-700 px-4 py-3 rounded-xl font-bold flex items-center justify-center hover:bg-slate-50 shadow-sm transition-all"
                         >
                             <Upload size={20} className="mr-2"/> RESTAURAR RESPALDO
                         </button>
                     </div>

                     {showBackupInput && (
                         <div className="mt-4 animate-fade-in bg-white p-4 rounded-xl border border-amber-200">
                             <label className="block text-xs font-bold text-slate-500 mb-2">Pegue aquí el contenido del archivo JSON de respaldo:</label>
                             <textarea 
                                 value={backupString}
                                 onChange={e => setBackupString(e.target.value)}
                                 className="w-full h-32 p-3 text-xs font-mono border-2 border-slate-200 rounded-lg focus:border-amber-500 outline-none bg-slate-50"
                                 placeholder='{ "users": "...", "orders": "..." }'
                             />
                             <button onClick={handleRestoreBackup} className="mt-2 bg-amber-600 text-white px-4 py-3 rounded-lg text-sm font-bold w-full hover:bg-amber-700 shadow-md">
                                 <HardDriveUpload size={18} className="inline mr-2"/> CONFIRMAR RESTAURACIÓN
                             </button>
                         </div>
                     )}
                 </div>
             </div>
        )}

        <div className="flex justify-between items-center pt-8 mt-8 border-t border-gray-200">
          <button 
            onClick={handleReset}
            className="flex items-center text-red-600 hover:text-red-800 px-4 py-2 rounded-lg border border-red-200 hover:bg-red-50 transition-colors font-bold text-sm"
          >
            <AlertTriangle className="mr-2" size={16}/>
            Restablecer Dispositivo
          </button>

          <button 
            onClick={handleSave}
            className={`flex items-center bg-slate-900 text-white px-8 py-3 rounded-xl hover:bg-slate-800 transition-all font-bold shadow-lg ${saved ? 'bg-green-600' : ''}`}
          >
            {saved ? <Check className="mr-2"/> : <Save className="mr-2" />}
            {saved ? 'Guardado' : 'Guardar'}
          </button>
        </div>
      </div>

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