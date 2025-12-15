import React, { useState, useContext, useEffect } from 'react';
import { AppConfig, UserRole } from '../../types';
import { getConfig, saveConfig, resetApp, isFirebaseConfigured } from '../../services/storage';
import { Printer, Save, Check, AlertTriangle, Bluetooth, Link2, MonitorCheck, Database, Cloud, CloudOff, Copy, Download, Upload } from 'lucide-react';
import { AuthContext } from '../../App';

const Configuration: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(getConfig());
  const [saved, setSaved] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const { user } = useContext(AuthContext);
  const [isConnected, setIsConnected] = useState(false);
  const [importString, setImportString] = useState('');
  const [showImport, setShowImport] = useState(false);

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

  const copyConfigToClipboard = () => {
      if (!config.firebaseConfig) {
          alert("No hay configuración de Firebase para exportar.");
          return;
      }
      const jsonStr = JSON.stringify(config.firebaseConfig);
      navigator.clipboard.writeText(jsonStr).then(() => {
          alert("Código de conexión copiado al portapapeles.\n\nEnvíalo a tus otros dispositivos y pégalo en el botón 'Importar'.");
      });
  };

  const handleImportConfig = () => {
      try {
          const parsed = JSON.parse(importString);
          if (parsed.apiKey && parsed.projectId) {
              const newConfig = { ...config, firebaseConfig: parsed };
              setConfig(newConfig);
              saveConfig(newConfig);
              setImportString('');
              setShowImport(false);
              alert("¡Conexión importada exitosamente! El sistema ahora está sincronizado.");
          } else {
              alert("El código no parece válido. Falta API Key o Project ID.");
          }
      } catch (e) {
          alert("Error al leer el código. Asegúrate de copiar todo el texto JSON.");
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
                    <h3 className="font-bold text-lg text-gray-900 flex items-center"><Database className="mr-2"/> Conexión a Nube (Multidispositivo)</h3>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-black flex items-center ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isConnected ? <Cloud size={14} className="mr-2"/> : <CloudOff size={14} className="mr-2"/>}
                        {isConnected ? "SISTEMA CONECTADO" : "SIN CONEXIÓN"}
                    </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 relative overflow-hidden">
                    {isConnected && (
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10">
                            CONFIGURACIÓN ACTIVA
                        </div>
                    )}
                    
                    <div className="mb-4 flex flex-col md:flex-row gap-3">
                         <button onClick={copyConfigToClipboard} className="flex-1 bg-white border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center hover:bg-blue-50 shadow-sm">
                             <Copy size={16} className="mr-2"/> Copiar Código de Conexión
                         </button>
                         <button onClick={() => setShowImport(!showImport)} className="flex-1 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center hover:bg-slate-50 shadow-sm">
                             <Upload size={16} className="mr-2"/> Importar / Pegar Código
                         </button>
                    </div>

                    {showImport && (
                        <div className="mb-6 animate-fade-in">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Pega aquí el código copiado desde el otro dispositivo:</label>
                            <textarea 
                                value={importString}
                                onChange={e => setImportString(e.target.value)}
                                className="w-full h-24 p-3 text-xs font-mono border-2 border-slate-300 rounded-lg focus:border-blue-500 outline-none"
                                placeholder='{"apiKey": "AIzaSy...", "projectId": "..."}'
                            />
                            <button onClick={handleImportConfig} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold w-full hover:bg-blue-700">
                                Validar y Conectar Dispositivo
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 opacity-80 hover:opacity-100 transition-opacity">
                        <div className="md:col-span-2 text-xs text-slate-400 font-bold uppercase tracking-wider">Configuración Manual (Avanzado)</div>
                        <input 
                            placeholder="API Key" 
                            value={config.firebaseConfig?.apiKey || ''} 
                            onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, apiKey: e.target.value} as any})}
                            className="p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-xs" 
                        />
                        <input 
                            placeholder="Auth Domain" 
                            value={config.firebaseConfig?.authDomain || ''} 
                            onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, authDomain: e.target.value} as any})}
                            className="p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-xs" 
                        />
                        <input 
                            placeholder="Project ID" 
                            value={config.firebaseConfig?.projectId || ''} 
                            onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, projectId: e.target.value} as any})}
                            className="p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-xs" 
                        />
                        <input 
                            placeholder="Storage Bucket" 
                            value={config.firebaseConfig?.storageBucket || ''} 
                            onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, storageBucket: e.target.value} as any})}
                            className="p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-xs" 
                        />
                    </div>
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