// fichier frontend/src/pages/OrderDetailPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import type { Order } from '../types';
import { ArrowLeftIcon, TruckIcon } from '@heroicons/react/24/outline';

// Statuts dans l'ordre logique de progression
const STATUS_STEPS = [
  { key: 'pending',   label: 'En attente',     icon: '🕐' },
  { key: 'paid',      label: 'Confirmée',       icon: '✓' },
  { key: 'preparing', label: 'En préparation',  icon: '📦' },
  { key: 'shipped',   label: 'Expédiée',        icon: '🚚' },
  { key: 'delivered', label: 'Livrée',          icon: '🏠' },
];

function getStepIndex(status: string): number {
  return STATUS_STEPS.findIndex(s => s.key === status);
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order & { items: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/orders/${id}`)
      .then(({ data }) => setOrder(data.data))
      .catch(() => setError('Commande introuvable.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="space-y-4 animate-pulse">
          <div className="h-6 bg-stone-100 rounded w-48" />
          <div className="h-32 bg-stone-100 rounded-xl" />
          <div className="h-48 bg-stone-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-5xl mb-4">📭</p>
        <p className="text-stone-500 mb-6">{error ?? 'Commande introuvable.'}</p>
        <Link to="/orders" className="btn-secondary text-sm">
          Retour à mes commandes
        </Link>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const currentStepIndex = getStepIndex(order.status);
  const totalCents = order.items.reduce(
    (s: number, i: any) => s + i.unit_price_cents * i.quantity, 0
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* En-tête */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/orders')}
          className="text-stone-400 hover:text-stone-600 transition-colors"
          aria-label="Retour"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-800">
            Commande <span className="font-mono">#{order.id}</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Passée le {new Date(order.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Timeline statuts */}
      <div className="card p-6 mb-4">
        {isCancelled ? (
          <div className="flex items-center gap-3">
            <span className="text-2xl">✕</span>
            <div>
              <p className="font-semibold text-red-600">Commande annulée</p>
              <p className="text-xs text-stone-400 mt-0.5">
                Cette commande a été annulée.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Barre de progression */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-stone-100" />
            <div
              className="absolute top-5 left-5 h-0.5 bg-[#b5838d] transition-all duration-500"
              style={{
                width: currentStepIndex <= 0
                  ? '0%'
                  : `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%`,
              }}
            />

            {/* Étapes */}
            <div className="relative flex justify-between">
              {STATUS_STEPS.map((step, i) => {
                const isDone    = i < currentStepIndex;
                const isCurrent = i === currentStepIndex;
                const isPending = i > currentStepIndex;

                return (
                  <div key={step.key} className="flex flex-col items-center gap-2 w-16">
                    {/* Cercle */}
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm
                      transition-all duration-300 z-10
                      ${isDone    ? 'bg-[#b5838d] text-white shadow-sm' : ''}
                      ${isCurrent ? 'bg-[#b5838d] text-white ring-4 ring-[#f0e6e8] shadow-md' : ''}
                      ${isPending ? 'bg-white border-2 border-stone-200 text-stone-300' : ''}
                    `}>
                      {step.icon}
                    </div>
                    {/* Label */}
                    <span className={`
                      text-xs text-center leading-tight
                      ${isCurrent ? 'text-[#b5838d] font-semibold' : ''}
                      ${isDone    ? 'text-stone-500' : ''}
                      ${isPending ? 'text-stone-300' : ''}
                    `}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Numéro de suivi */}
        {order.tracking_number && (
          <div className="mt-5 pt-4 border-t border-stone-100 flex items-center gap-3">
            <TruckIcon className="w-4 h-4 text-[#b5838d] shrink-0" />
            <div>
              <p className="text-xs text-stone-400 font-medium">Numéro de suivi</p>
              <p className="font-mono text-sm text-stone-700 font-medium">
                {order.tracking_number}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Articles */}
      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-stone-700 mb-4 text-sm uppercase tracking-wide">
          Articles
        </h2>
        <div className="space-y-3">
          {order.items.map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-3">
              {/* Image */}
              <div className="w-12 h-12 rounded-lg bg-rose-50 overflow-hidden shrink-0">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">💍</div>
                )}
              </div>
              {/* Détail */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-700 truncate">{item.name}</p>
                <p className="text-xs text-stone-400">Qté : {item.quantity}</p>
              </div>
              <p className="font-semibold text-stone-700 shrink-0">
                {((item.unit_price_cents * item.quantity) / 100).toFixed(2)} €
              </p>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t border-stone-100 mt-4 pt-4 flex justify-between items-center">
          <span className="font-semibold text-stone-700">Total</span>
          <span className="font-bold text-[#b5838d] text-lg">
            {(totalCents / 100).toFixed(2)} €
          </span>
        </div>
      </div>

      {/* Adresse de livraison */}
      <div className="card p-5">
        <h2 className="font-semibold text-stone-700 mb-3 text-sm uppercase tracking-wide">
          Adresse de livraison
        </h2>
        <p className="text-sm text-stone-600 whitespace-pre-line leading-relaxed">
          {order.address}
        </p>
      </div>

    </div>
  );
}
