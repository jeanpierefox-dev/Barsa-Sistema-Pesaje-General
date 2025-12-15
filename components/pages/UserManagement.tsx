import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../App';
import { User, UserRole, WeighingType } from '../../types';
import { getUsers, saveUser, deleteUser } from '../../services/storage';
import { Trash2, Plus, Shield, Edit, CheckSquare, Square } from 'lucide-react';

const UserManagement: React.FC = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [newUser, setNewUser] = useState<Partial<User>>({ 
      role: UserRole.OPERATOR,
      allowedModes: [WeighingType.BATCH, WeighingType.SOLO_POLLO, WeighingType.SOLO_JABAS]
  });

  useEffect(() => {
    refreshUsers();
  }, [currentUser]);

  const refreshUsers = () => {
    const all = getUsers();
    if (currentUser?.role === UserRole.ADMIN) {
      setUsers(all);
    } else {
      setUsers(all.filter(u => u.parentId === currentUser?.id || u.id === currentUser?.id));
    }
  };

  const handleEdit = (u: User) => {
    setNewUser(u);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!newUser.username || !newUser.name || !newUser.password) return;
    
    const u: User = {
      id: newUser.id || Date.now().toString(),
      username: newUser.username,
      password: newUser.password,
      name: newUser.name,
      role: newUser.role as UserRole,
      parentId: newUser.parentId || currentUser?.id,
      allowedModes: newUser.allowedModes || []
    };
    saveUser(u);
    setIsModalOpen(false);
    setNewUser({ role: UserRole.OPERATOR, allowedModes: [WeighingType.BATCH, WeighingType.SOLO_POLLO, WeighingType.SOLO_JABAS] });
    refreshUsers();
  };

  const toggleMode = (mode: WeighingType) => {
      const current = newUser.allowedModes || [];
      if (current.includes(mode)) {
          setNewUser({ ...newUser, allowedModes: current.filter(m => m !== mode) });
      } else {
          setNewUser({ ...newUser, allowedModes: [...current, mode] });
      }
  };

  const canDelete = (target: User) => {
    if (target.id === currentUser?.id) return false;
    if (currentUser?.role === UserRole.ADMIN) return true;
    if (currentUser?.role === UserRole.GENERAL && target.parentId === currentUser.id) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h2>
        <button 
          onClick={() => { 
              setNewUser({ role: UserRole.OPERATOR, allowedModes: [WeighingType.BATCH, WeighingType.SOLO_POLLO, WeighingType.SOLO_JABAS] }); 
              setIsModalOpen(true); 
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
        >
          <Plus size={20} className="mr-2" /> Nuevo Usuario
        </button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {users.map(u => (
          <div key={u.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-full ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                <Shield size={24} />
              </div>
              <div>
                <p className="font-bold text-gray-800">{u.name}</p>
                <p className="text-sm text-gray-500">@{u.username} • {u.role}</p>
                <div className="flex gap-1 mt-1">
                    {u.allowedModes?.includes(WeighingType.BATCH) && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">Lotes</span>}
                    {u.allowedModes?.includes(WeighingType.SOLO_POLLO) && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded">Pollo</span>}
                    {u.allowedModes?.includes(WeighingType.SOLO_JABAS) && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded">Jabas</span>}
                </div>
              </div>
            </div>
            <div className="flex space-x-1">
              {(currentUser?.role === UserRole.ADMIN || u.parentId === currentUser?.id) && (
                <button onClick={() => handleEdit(u)} className="text-gray-400 hover:text-blue-600 p-2"><Edit size={20} /></button>
              )}
              {canDelete(u) && (
                <button onClick={() => { if(confirm('¿Eliminar?')) { deleteUser(u.id); refreshUsers(); }}} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={20} /></button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-bold mb-4 text-xl">{newUser.id ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
            <div className="space-y-3">
              <input 
                className="w-full border rounded p-2" 
                placeholder="Nombre Completo"
                value={newUser.name || ''}
                onChange={e => setNewUser({...newUser, name: e.target.value})}
              />
              <input 
                className="w-full border rounded p-2" 
                placeholder="Usuario (Login)"
                value={newUser.username || ''}
                onChange={e => setNewUser({...newUser, username: e.target.value})}
              />
              <input 
                type="text" 
                className="w-full border rounded p-2" 
                placeholder="Contraseña"
                value={newUser.password || ''}
                onChange={e => setNewUser({...newUser, password: e.target.value})}
              />
              <select 
                className="w-full border rounded p-2"
                value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
              >
                <option value={UserRole.OPERATOR}>Operador / Vendedor</option>
                {currentUser?.role === UserRole.ADMIN && <option value={UserRole.GENERAL}>General</option>}
                {currentUser?.role === UserRole.ADMIN && <option value={UserRole.ADMIN}>Administrador</option>}
              </select>

              {currentUser?.role === UserRole.ADMIN && (
                  <div className="pt-2 border-t mt-2">
                      <p className="text-sm font-bold text-gray-600 mb-2">Permisos de Pesaje:</p>
                      <div className="flex gap-4">
                          <label className="flex items-center text-sm cursor-pointer">
                              <input type="checkbox" className="mr-2" 
                                checked={newUser.allowedModes?.includes(WeighingType.BATCH)}
                                onChange={() => toggleMode(WeighingType.BATCH)}
                              /> Lotes
                          </label>
                          <label className="flex items-center text-sm cursor-pointer">
                              <input type="checkbox" className="mr-2" 
                                checked={newUser.allowedModes?.includes(WeighingType.SOLO_POLLO)}
                                onChange={() => toggleMode(WeighingType.SOLO_POLLO)}
                              /> Solo Pollo
                          </label>
                          <label className="flex items-center text-sm cursor-pointer">
                              <input type="checkbox" className="mr-2" 
                                checked={newUser.allowedModes?.includes(WeighingType.SOLO_JABAS)}
                                onChange={() => toggleMode(WeighingType.SOLO_JABAS)}
                              /> Solo Jabas
                          </label>
                      </div>
                  </div>
              )}
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500">Cancelar</button>
              <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded font-bold">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;