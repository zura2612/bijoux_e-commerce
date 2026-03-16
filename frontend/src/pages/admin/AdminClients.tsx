import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import toast from 'react-hot-toast';
import { MagnifyingGlassIcon, EyeIcon, LockClosedIcon, TrashIcon } from '@heroicons/react/24/outline';

export function AdminClients() {
  const [clients, setClients] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientOrders, setClientOrders] = useState<any[]>([]);
  const [showResetModal, setShowResetModal] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchClients = async () => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    const { data } = await api.get(`/admin/clients?${params}`);
    setClients(data.data);
    setPagination(data.pagination);
  };

  useEffect(() => { fetchClients(); }, [page]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchClients(); };

  const viewHistory = async (client: any) => {
    const { data } = await api.get(`/admin/clients/${client.id}/orders`);
    setSelectedClient(data.data.user);
    setClientOrders(data.data.orders);
  };

  const handleBlock = async (id: string, blocked: boolean) => {
    try {
      await api.put(`/admin/clients/${id}/block`, { blocked });
      toast.success(blocked ? 'Compte suspendu' : 'Compte réactivé');
      fetchClients();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer définitivement le compte de ${name} ?`)) return;
    try {
      await api.delete(`/admin/clients/${id}`);
      toast.success('Compte supprimé');
      fetchClients();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) { toast.error('8 caractères minimum'); return; }
    try {
      await api.put(`/admin/clients/${showResetModal.id}/reset-password`, { newPassword });
      toast.success('Mot de passe réinitialisé');
      setShowResetModal(null);
      setNewPassword('');
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl font-semibold text-stone-800">Clients</h1>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par email ou nom..." className="input-field pr-9 text-sm w-72" />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400">
            <MagnifyingGlassIcon className="w-4 h-4" />
          </button>
        </div>
        {pagination && <span className="text-sm text-stone-400 self-center">{pagination.total} client(s)</span>}
      </form>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              {['Client', 'Email', 'Inscrit le', 'Commandes', 'CA total', 'Statut', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {clients.map(client => (
              <tr key={client.id} className={`hover:bg-stone-50 ${client.blocked ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3 font-medium text-stone-700">
                  {client.first_name} {client.last_name}
                </td>
                <td className="px-4 py-3 text-stone-500 text-xs">{client.email}</td>
                <td className="px-4 py-3 text-stone-400 text-xs">
                  {new Date(client.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3 text-center">{client.order_count}</td>
                <td className="px-4 py-3 font-semibold text-stone-700">
                  {(client.total_spent_cents / 100).toFixed(2)} €
                </td>
                <td className="px-4 py-3">
                  {client.blocked
                    ? <span className="badge bg-red-100 text-red-600">Suspendu</span>
                    : <span className="badge bg-green-100 text-green-600">Actif</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => viewHistory(client)} title="Historique"
                      className="text-stone-400 hover:text-blue-500 transition-colors">
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleBlock(client.id, !client.blocked)}
                      title={client.blocked ? 'Réactiver' : 'Suspendre'}
                      className={`transition-colors ${client.blocked ? 'text-green-400 hover:text-green-600' : 'text-stone-400 hover:text-orange-500'}`}>
                      <LockClosedIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setShowResetModal(client); setNewPassword(''); }}
                      title="Réinitialiser mdp"
                      className="text-stone-400 hover:text-purple-500 transition-colors text-xs font-mono font-bold">
                      ••
                    </button>
                    <button onClick={() => handleDelete(client.id, `${client.first_name} ${client.last_name}`)}
                      title="Supprimer" className="text-stone-400 hover:text-red-500 transition-colors">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex gap-2 justify-center">
          {[...Array(pagination.totalPages)].map((_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`w-8 h-8 rounded text-sm ${page === i + 1 ? 'bg-rose-400 text-white' : 'bg-white border text-stone-600'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Modal historique commandes */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelectedClient(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h2 className="font-semibold text-stone-800">
                Commandes — {selectedClient.first_name} {selectedClient.last_name}
              </h2>
              <button onClick={() => setSelectedClient(null)} className="text-stone-400 text-xl">×</button>
            </div>
            {clientOrders.length === 0 ? (
              <p className="text-stone-400 text-center py-6">Aucune commande</p>
            ) : (
              <div className="space-y-3">
                {clientOrders.map((order: any) => (
                  <div key={order.id} className="border border-stone-100 rounded-xl p-4">
                    <div className="flex justify-between mb-2">
                      <span className="font-mono text-xs text-stone-500">#{order.id.slice(0, 8).toUpperCase()}</span>
                      <span className="font-bold text-rose-500">{(order.total_cents / 100).toFixed(2)} €</span>
                    </div>
                    {order.items.map((item: any, i: number) => (
                      <p key={i} className="text-xs text-stone-500">{item.name} ×{item.quantity}</p>
                    ))}
                    <p className="text-xs text-stone-400 mt-2">
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal reset password */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowResetModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-stone-800 mb-1">Réinitialiser le mot de passe</h2>
            <p className="text-sm text-stone-400 mb-4">{showResetModal.email}</p>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="Nouveau mot de passe (8 car. min)" className="input-field mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowResetModal(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={handleResetPassword} className="btn-primary flex-1">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
