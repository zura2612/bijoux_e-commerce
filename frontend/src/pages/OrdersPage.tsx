// fichier frontend/src/pages/Orders.Page.tsx
import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import type { Order } from '../types';

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders').then(({ data }) => setOrders(data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8 text-stone-400">Chargement...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-serif text-3xl font-semibold text-stone-800 mb-6">Mes commandes</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-5xl mb-4">📦</p>
          <p>Vous n'avez pas encore de commande.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-sm font-medium text-stone-700">
                    #{order.id}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {new Date(order.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <span className="badge bg-green-100 text-green-700">✓ Confirmée</span>
                  <p className="font-bold text-rose-500 mt-1">
                    {(order.total_cents / 100).toFixed(2)} €
                  </p>
                </div>
              </div>

              <div className="border-t pt-3 space-y-1">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm text-stone-600">
                    <span>{item.name} ×{item.quantity}</span>
                    <span>{((item.unitPriceCents * item.quantity) / 100).toFixed(2)} €</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 mt-3">
                <p className="text-xs text-stone-400">
                  <span className="font-medium">Livraison :</span>{' '}
                  {order.address.replace(/\n/g, ', ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
