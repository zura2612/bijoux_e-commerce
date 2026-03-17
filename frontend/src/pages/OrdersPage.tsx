// fichier frontend/src/pages/OrdersPage.tsx
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { Pagination } from '../components/ui/Pagination';
import type { Order, PaginationType } from '../types';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

const LIMIT = 10;

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending:   { label: 'En attente',     className: 'bg-amber-100 text-amber-700' },
  paid:      { label: 'Confirmée',      className: 'bg-green-100 text-green-700' },
  preparing: { label: 'En préparation', className: 'bg-blue-100 text-blue-700' },
  shipped:   { label: 'Expédiée',       className: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Livrée',         className: 'bg-stone-100 text-stone-600' },
  cancelled: { label: 'Annulée',        className: 'bg-red-100 text-red-600' },
};

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders]         = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [loading, setLoading]       = useState(true);

  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  useEffect(() => {
    setLoading(true);
    api.get('/orders', { params: { page, limit: LIMIT } })
      .then(({ data }) => {
        setOrders(data.data);
        setPagination(data.pagination);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const handlePageChange = (newPage: number) => {
    setSearchParams({ page: String(newPage) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-5 animate-pulse space-y-3">
            <div className="flex justify-between">
              <div className="h-4 bg-stone-100 rounded w-32" />
              <div className="h-4 bg-stone-100 rounded w-20" />
            </div>
            <div className="h-3 bg-stone-100 rounded w-48" />
            <div className="border-t pt-3 space-y-2">
              <div className="h-3 bg-stone-100 rounded w-3/4" />
              <div className="h-3 bg-stone-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="font-serif text-3xl font-semibold text-stone-800">Mes commandes</h1>
        {pagination && pagination.total > 0 && (
          <p className="text-sm text-stone-400">
            {pagination.total} commande{pagination.total > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-5xl mb-4">📦</p>
          <p>Vous n'avez pas encore de commande.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => {
              const status = STATUS_LABELS[order.status] ?? {
                label: order.status,
                className: 'bg-stone-100 text-stone-600',
              };

              return (
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
                      <span className={`badge ${status.className}`}>
                        {status.label}
                      </span>
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

                  {/* Pied de carte : adresse + lien détail */}
                  <div className="border-t pt-3 mt-3 flex items-center justify-between gap-4">
                    <p className="text-xs text-stone-400 truncate">
                      <span className="font-medium">Livraison :</span>{' '}
                      {order.address.replace(/\n/g, ', ')}
                    </p>
                    <Link
                      to={`/orders/${order.id}`}
                      className="flex items-center gap-1 text-xs text-[#b5838d] hover:text-[#6d4c55] font-medium shrink-0 transition-colors"
                    >
                      Détail
                      <ArrowRightIcon className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {pagination && (
            <Pagination
              page={page}
              totalPages={pagination.totalPages}
              onChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
}
