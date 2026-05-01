import React, { useState } from 'react';
import { useAppStore, Advisor } from '../../hooks/useAppStore';
import { Plus, Edit2, Save, Trash2, X } from 'lucide-react';

export const StaffManager = () => {
  const { state, saveStaff, isLoaded } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Advisor>>({});

  if (!isLoaded) return <div className="animate-pulse h-64 bg-neutral-900 rounded-xl" />;

  const handleEdit = (advisor: Advisor) => {
    setEditingId(advisor.id);
    setEditForm(advisor);
  };

  const handleSave = () => {
    if (!editForm.name || !editForm.sucursal) return;

    if (editingId === 'NEW') {
      const newAdvisor: Advisor = {
        id: Date.now().toString(),
        name: editForm.name || '',
        sucursal: editForm.sucursal || '',
        supervisor: editForm.supervisor || '',
        photoUrl: editForm.photoUrl || '',
        metas: {
          semanal: editForm.metas?.semanal || 0,
          mensual: editForm.metas?.mensual || 0,
          anual: editForm.metas?.anual || 0,
        },
      };
      saveStaff([...state.staff, newAdvisor]);
    } else {
      const updatedStaff = state.staff.map((a) =>
        a.id === editingId ? { ...a, ...editForm } as Advisor : a
      );
      saveStaff(updatedStaff);
    }
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Seguro que deseas eliminar este asesor?')) {
      saveStaff(state.staff.filter((a) => a.id !== id));
    }
  };

  const handleAddNew = () => {
    setEditingId('NEW');
    setEditForm({
      metas: { semanal: 0, mensual: 0, anual: 0 },
    });
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">Directorio ClearVoice (Staff)</h3>
        <button
          onClick={handleAddNew}
          disabled={editingId !== null}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar Asesor
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-neutral-400">
          <thead className="text-xs uppercase bg-neutral-950 text-neutral-500 border-b border-neutral-800">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Sucursal</th>
              <th className="px-4 py-3">Supervisor</th>
              <th className="px-4 py-3">Meta Mensual</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {editingId === 'NEW' && (
              <tr className="border-b border-neutral-800 bg-neutral-800/30">
                <td className="px-4 py-3">
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="URL Foto (ej. https://...)"
                    value={editForm.photoUrl || ''}
                    onChange={(e) => setEditForm({ ...editForm, photoUrl: e.target.value })}
                    className="w-full mt-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white text-xs"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    placeholder="Sucursal"
                    value={editForm.sucursal || ''}
                    onChange={(e) => setEditForm({ ...editForm, sucursal: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    placeholder="Supervisor"
                    value={editForm.supervisor || ''}
                    onChange={(e) => setEditForm({ ...editForm, supervisor: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    placeholder="0"
                    value={editForm.metas?.mensual || 0}
                    onChange={(e) => setEditForm({ ...editForm, metas: { ...editForm.metas!, mensual: Number(e.target.value) } })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white text-sm"
                  />
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={handleSave} className="text-emerald-500 hover:text-emerald-400 p-1">
                    <Save className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-neutral-500 hover:text-neutral-300 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            )}

            {state.staff.map((advisor) => (
              <tr key={advisor.id} className="border-b border-neutral-800 hover:bg-neutral-800/20">
                {editingId === advisor.id ? (
                  <>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white text-sm"
                      />
                      <input
                        type="text"
                        placeholder="URL Foto"
                        value={editForm.photoUrl || ''}
                        onChange={(e) => setEditForm({ ...editForm, photoUrl: e.target.value })}
                        className="w-full mt-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white text-xs"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editForm.sucursal || ''}
                        onChange={(e) => setEditForm({ ...editForm, sucursal: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editForm.supervisor || ''}
                        onChange={(e) => setEditForm({ ...editForm, supervisor: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={editForm.metas?.mensual || 0}
                        onChange={(e) => setEditForm({ ...editForm, metas: { ...editForm.metas!, mensual: Number(e.target.value) } })}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white text-sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={handleSave} className="text-emerald-500 hover:text-emerald-400 p-1">
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-neutral-500 hover:text-neutral-300 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800 border border-neutral-700">
                        {advisor.photoUrl ? (
                          <img src={advisor.photoUrl} alt={advisor.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                            {advisor.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      {advisor.name}
                    </td>
                    <td className="px-4 py-3">{advisor.sucursal}</td>
                    <td className="px-4 py-3">{advisor.supervisor}</td>
                    <td className="px-4 py-3 text-indigo-400 font-semibold">
                      ${advisor.metas.mensual.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => handleEdit(advisor)} className="text-blue-400 hover:text-blue-300 p-1" disabled={editingId !== null}>
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(advisor.id)} className="text-red-400 hover:text-red-300 p-1" disabled={editingId !== null}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            
            {state.staff.length === 0 && editingId !== 'NEW' && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                  No hay asesores registrados. Haz clic en "Agregar Asesor" para comenzar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
