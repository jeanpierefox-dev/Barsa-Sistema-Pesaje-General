import React, { useEffect, useState, useContext } from 'react';
import { getBatches, getOrders, getConfig } from '../../services/storage';
import { Batch, ClientOrder, WeighingType, UserRole } from '../../types';
import { ChevronDown, ChevronUp, Package, ShoppingCart, List, Printer } from 'lucide-react';
import { AuthContext } from '../../App';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [showDetailOrder, setShowDetailOrder] = useState<string | null>(null);
  const { user } = useContext(AuthContext);
  const config = getConfig();

  useEffect(() => {
    refresh();
  }, [user]);

  const refresh = () => {
      const allBatches = getBatches();
      const allOrders = getOrders();
      if (user?.role === UserRole.ADMIN) {
          setBatches(allBatches);
          setOrders(allOrders);
      } else {
          setBatches(allBatches.filter(b => !b.createdBy || b.createdBy === user?.id));
          setOrders(allOrders.filter(o => !o.createdBy || o.createdBy === user?.id));
      }
  }

  const getStats = (filterFn: (o: ClientOrder) => boolean) => {
    const filteredOrders = orders.filter(filterFn);
    let totalFull = 0, totalEmpty = 0, totalNet = 0, totalMort = 0;
    
    filteredOrders.forEach(o => {
      const wFull = o.records.filter(r => r.type === 'FULL').reduce((a, b) => a + b.weight, 0);
      const wEmpty = o.records.filter(r => r.type === 'EMPTY').reduce((a, b) => a + b.weight, 0);
      const wMort = o.records.filter(r => r.type === 'MORTALITY').reduce((a, b) => a + b.weight, 0);
      totalFull += wFull;
      totalEmpty += wEmpty;
      totalMort += wMort;
      
      let net = wFull - wEmpty - wMort;
      if (o.weighingMode === WeighingType.SOLO_POLLO) net = wFull;

      totalNet += net;
    });

    return { totalFull, totalEmpty, totalMort, totalNet, orderCount: filteredOrders.length, batchOrders: filteredOrders };
  };

  const printBatchReport = (batchName: string, stats: any) => {
      const doc = new jsPDF();
      if (config.logoUrl) {
        try { doc.addImage(config.logoUrl, 'PNG', 15, 10, 20, 20); } catch {}
      }

      doc.setFontSize(14);
      doc.text(`Reporte de Lote: ${batchName}`, 40, 20);
      doc.setFontSize(10);
      doc.text(`Fecha Impresión: ${new Date().toLocaleString()}`, 40, 26);
      
      doc.setFontSize(12);
      doc.text("Resumen General", 14, 40);
      doc.setFontSize(10);
      doc.text(`Total Clientes: ${stats.orderCount}`, 14, 46);
      doc.text(`Total Neto (kg): ${stats.totalNet.toFixed(2)}`, 14, 52);
      doc.text(`Bruto: ${stats.totalFull.toFixed(2)} | Tara: ${stats.totalEmpty.toFixed(2)} | Merma: ${stats.totalMort.toFixed(2)}`, 14, 58);

      const tableData = stats.batchOrders.map((o: ClientOrder) => {
          const wFull = o.records.filter(r => r.type === 'FULL').reduce((a, b) => a + b.weight, 0);
          const wEmpty = o.records.filter(r => r.type === 'EMPTY').reduce((a, b) => a + b.weight, 0);
          const net = (o.weighingMode === WeighingType.SOLO_POLLO ? wFull : wFull - wEmpty).toFixed(2);
          return [o.clientName, o.paymentStatus, wFull.toFixed(2), wEmpty.toFixed(2), net];
      });

      autoTable(doc, {
          startY: 65,
          head: [['Cliente', 'Estado', 'Bruto', 'Tara', 'Neto']],
          body: tableData,
      });

      doc.save(`Reporte_${batchName}.pdf`);
  };

  const Chart = ({ orders }: { orders: ClientOrder[] }) => {
      const data = orders.flatMap(o => o.records.map(r => ({ ...r, client: o.clientName })))
                         .sort((a,b) => a.timestamp - b.timestamp);

      if (data.length < 2) return null;

      const points = data.map((d, i) => {
          return { x: i, y: d.weight };
      });
      const max = Math.max(...points.map(p => p.y), 1);
      const h = 60; const w = 300;
      const polyline = points.map((p, i) => {
          const x = (i / (points.length - 1)) * w;
          const y = h - (p.y / max) * h;
          return `${x},${y}`;
      }).join(' ');

      return (
          <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Flujo de Pesaje (Histórico General)</h4>
              <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20 overflow-visible">
                   <polyline fill="none" stroke="#1e40af" strokeWidth="2" points={polyline} />
              </svg>
          </div>
      );
  };

  const ReportCard = ({ id, title, subtitle, icon, stats }: any) => {
      const isExpanded = expandedBatch === id;
      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
            <div 
            className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setExpandedBatch(isExpanded ? null : id)}
            >
            <div className="flex items-center space-x-5">
                <div className={`p-4 rounded-xl ${id === 'direct-sales' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-800'}`}>
                   {icon}
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900">{title}</h3>
                    <p className="text-sm text-slate-500 font-medium">{subtitle} • {stats.orderCount} Clientes</p>
                </div>
            </div>
            
            <div className="flex items-center space-x-10">
                <div className="text-right hidden md:block">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Peso Total</p>
                    <p className="text-2xl font-black text-slate-800">{stats.totalNet.toFixed(2)} kg</p>
                </div>
                {isExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
            </div>
            </div>

            {isExpanded && (
            <div className="bg-slate-50 border-t border-slate-200 p-6 animate-fade-in">
                
                <div className="flex justify-end mb-4">
                    <button onClick={() => printBatchReport(title, stats)} className="flex items-center text-sm font-bold text-blue-800 bg-white border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-50">
                        <Printer size={16} className="mr-2"/> Imprimir Reporte Lote
                    </button>
                </div>

                <Chart orders={stats.batchOrders} />

                {/* Batch Summary */}
                <div className="grid grid-cols-4 gap-4 mb-8 text-center">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Bruto</p>
                        <p className="font-black text-xl text-blue-900">{stats.totalFull.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Tara</p>
                        <p className="font-black text-xl text-orange-600">{stats.totalEmpty.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Merma</p>
                        <p className="font-black text-xl text-red-600">{stats.totalMort.toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-950 p-4 rounded-xl shadow-sm border border-blue-900">
                        <p className="text-xs text-blue-300 uppercase font-bold tracking-wider">Neto</p>
                        <p className="font-black text-xl text-white">{stats.totalNet.toFixed(2)}</p>
                    </div>
                </div>

                {/* Clients Detail List - Expanded Breakdown */}
                <h4 className="text-xs font-black text-slate-400 mb-4 uppercase tracking-widest border-b border-slate-200 pb-2">Desglose por Cliente</h4>
                <div className="space-y-3">
                    {stats.batchOrders.map((order: ClientOrder) => {
                        // Calculations for Weight
                        const wFull = order.records.filter(r => r.type === 'FULL').reduce((a, b) => a + b.weight, 0);
                        const wEmpty = order.records.filter(r => r.type === 'EMPTY').reduce((a, b) => a + b.weight, 0);
                        const wMort = order.records.filter(r => r.type === 'MORTALITY').reduce((a, b) => a + b.weight, 0);
                        
                        // Calculations for Count/Quantity
                        const qFull = order.records.filter(r => r.type === 'FULL').reduce((a, b) => a + b.quantity, 0);
                        const qEmpty = order.records.filter(r => r.type === 'EMPTY').reduce((a, b) => a + b.quantity, 0);
                        const qMort = order.records.filter(r => r.type === 'MORTALITY').reduce((a, b) => a + b.quantity, 0);

                        let net = wFull - wEmpty - wMort;
                        if (order.weighingMode === WeighingType.SOLO_POLLO) net = wFull;

                        const isDetailOpen = showDetailOrder === order.id;

                        const renderMiniBox = (title: string, weight: number, count: number, bgClass: string, textClass: string) => (
                             <div className={`p-2 rounded text-center border ${bgClass} border-opacity-50`}>
                                 <p className="text-[10px] uppercase font-bold opacity-60">{title}</p>
                                 <p className={`font-bold ${textClass}`}>{weight.toFixed(2)} <span className="text-[10px] opacity-70">({count})</span></p>
                             </div>
                        );

                        return (
                            <div key={order.id} className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-colors overflow-hidden">
                                <div className="p-4 flex flex-col md:flex-row justify-between items-center bg-white">
                                    <div className="mb-2 md:mb-0">
                                        <p className="font-bold text-slate-900 text-lg">{order.clientName}</p>
                                        <div className="flex space-x-2 mt-1">
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {order.paymentStatus === 'PAID' ? 'PAGADO' : 'PENDIENTE'}
                                            </span>
                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">
                                                {order.weighingMode === WeighingType.SOLO_POLLO ? 'SOLO POLLO' : 'LOTE/JABAS'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="grid grid-cols-4 gap-4 text-right">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Bruto</p>
                                                <p className="font-bold text-slate-700">{wFull.toFixed(2)}</p>
                                                <p className="text-[9px] text-slate-500 font-bold">{qFull} und</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Tara</p>
                                                <p className="font-bold text-slate-700">{wEmpty.toFixed(2)}</p>
                                                <p className="text-[9px] text-slate-500 font-bold">{qEmpty} und</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Merma</p>
                                                <p className="font-bold text-red-500">{wMort.toFixed(2)}</p>
                                                <p className="text-[9px] text-red-400 font-bold">{qMort} und</p>
                                            </div>
                                            <div className="pl-4 border-l border-slate-100 flex flex-col justify-center">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Total</p>
                                                <p className="font-black text-slate-900">{net.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setShowDetailOrder(isDetailOpen ? null : order.id)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600">
                                            <List size={16} />
                                        </button>
                                    </div>
                                </div>
                                
                                {isDetailOpen && (
                                    <div className="bg-slate-50 p-4 border-t border-slate-100">
                                        <div className="grid grid-cols-3 gap-4 mb-4">
                                            {renderMiniBox("Llenas", wFull, qFull, 'bg-blue-50', 'text-blue-900')}
                                            {renderMiniBox("Vacías", wEmpty, qEmpty, 'bg-orange-50', 'text-orange-800')}
                                            {renderMiniBox("Merma", wMort, qMort, 'bg-red-50', 'text-red-800')}
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-4">
                                            {['FULL', 'EMPTY', 'MORTALITY'].map(type => {
                                                const records = order.records.filter(r => r.type === type).sort((a,b) => b.timestamp - a.timestamp);
                                                if(records.length === 0) return <div key={type} className="border border-slate-200 rounded bg-white h-24 flex items-center justify-center text-xs text-slate-300 uppercase">Sin Datos</div>;
                                                return (
                                                    <div key={type} className="border border-slate-200 rounded bg-white overflow-hidden">
                                                        <div className="bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                                                            {type === 'FULL' ? 'Detalle Llenas' : type === 'EMPTY' ? 'Detalle Vacías' : 'Detalle Merma'}
                                                        </div>
                                                        <div className="max-h-32 overflow-y-auto">
                                                            <table className="w-full text-xs">
                                                                <tbody className="divide-y divide-slate-50">
                                                                    {records.map(r => (
                                                                        <tr key={r.id}>
                                                                            <td className="p-1.5 text-slate-500">{new Date(r.timestamp).toLocaleTimeString()}</td>
                                                                            <td className="p-1.5 text-right font-bold">{r.weight.toFixed(2)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            )}
        </div>
      );
  }

  const directSalesStats = getStats(o => !o.batchId);

  return (
    <div className="space-y-8">
      <div>
          <h2 className="text-3xl font-black text-blue-950">Reporte Corporativo</h2>
          <p className="text-slate-500 font-medium">Resumen de producción y ventas</p>
      </div>
      
      <div>
        {/* Direct Sales Card */}
        {directSalesStats.orderCount > 0 && (
            <ReportCard 
                id="direct-sales" 
                title="Ventas Directas" 
                subtitle="Sin Asignación de Lote" 
                icon={<ShoppingCart size={28}/>}
                stats={directSalesStats}
            />
        )}

        {/* Batch Cards */}
        {batches.map(batch => {
          const stats = getStats(o => o.batchId === batch.id);
          return (
             <ReportCard 
                key={batch.id} 
                id={batch.id} 
                title={batch.name} 
                subtitle={`Creado: ${new Date(batch.createdAt).toLocaleDateString()}`}
                icon={<Package size={28}/>}
                stats={stats}
             />
          );
        })}
      </div>
    </div>
  );
};

export default Reports;