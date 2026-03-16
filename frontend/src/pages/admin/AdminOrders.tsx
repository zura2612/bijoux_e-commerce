import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  paid:      'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700',
  shipped:   'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<Array<{ value: string; label: string }>>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (filterStatus) params.set('status', filterStatus);
    if (search) params.set('search', search);
    const { data } = await api.get(`/admin/orders?${params}`);
    setOrders(data.data);
    setPagination(data.pagination);
    setStatuses(data.statuses);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [filterStatus, page]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchOrders(); };

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status });
      toast.success('Statut mis à jour');
      fetchOrders();
      if (selectedOrder?.id === orderId) setSelectedOrder((o: any) => ({ ...o, status }));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleExport = () => {
    window.open('/api/admin/orders/export.csv', '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-stone-800">Commandes</h1>
        <button onClick={handleExport} className="flex items-center gap-2 btn-secondary text-sm">
          <ArrowDownTrayIcon className="w-4 h-4" />
          Exporter CSV
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Email ou nom client..." className="input-field pr-9 text-sm w-56" />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400">
              <MagnifyingGlassIcon className="w-4 h-4" />
            </button>
          </div>
        </form>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="input-field text-sm w-48">
          <option value="">Tous les statuts</option>
          {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {pagination && <span className="text-sm text-stone-400 self-center">{pagination.total} commande(s)</span>}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-stone-400">Chargement...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-stone-400">Aucune commande trouvée</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                {['Réf.', 'Client', 'Date', 'Total', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-stone-600">
{/* commande #AAAA-12345 */}
                    #{order.id.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-700">{order.first_name} {order.last_name}</p>
                    <p className="text-xs text-stone-400">{order.email}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs">
                    {new Date(order.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 font-semibold text-stone-700">
                    {(order.total_cents / 100).toFixed(2)} €
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      onChange={e => handleStatusChange(order.id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[order.status] ?? 'bg-stone-100 text-stone-600'}`}
                    >
                      {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedOrder(order)}
                      className="text-xs text-rose-400 hover:underline">
                      Détail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex gap-2 justify-center">
          {[...Array(pagination.totalPages)].map((_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`w-8 h-8 rounded text-sm ${page === i + 1 ? 'bg-rose-400 text-white' : 'bg-white border hover:bg-stone-50 text-stone-600'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Modal détail */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h2 className="font-semibold text-stone-800">
{/* commande #AAAA-12345 */}
                Commande #{selectedOrder.id.slice(0, 10)}
              </h2>
              <button onClick={() => setSelectedOrder(null)} className="text-stone-400 hover:text-stone-600 text-xl">×</button>
            </div>
            <p className="text-sm text-stone-700 mb-1 font-medium">Client : {selectedOrder.first_name} {selectedOrder.last_name}</p>
            <p className="text-sm text-stone-700 mb-3">Email : {selectedOrder.email}</p>
            <div className="border-t pt-3 mb-3 space-y-2">
              {selectedOrder.items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-stone-700 font-medium">{item.name} ×{item.quantity}</span>
                  <span className="font-medium">{((item.unitPriceCents * item.quantity) / 100).toFixed(2)} €</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 flex justify-between font-bold text-stone-800">
              <span>Total</span>
              <span className="text-rose-500">{(selectedOrder.total_cents / 100).toFixed(2)} €</span>
            </div>
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-stone-400 font-medium mb-1">Adresse de livraison</p>
              <p className="text-sm text-stone-600 whitespace-pre-line">{selectedOrder.address}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
