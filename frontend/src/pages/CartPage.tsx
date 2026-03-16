import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cart.store';
import { useAuthStore } from '../store/auth.store';
import { TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export function CartPage() {
  const { cart, fetchCart, updateItem, loading } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) fetchCart();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">🔒</p>
        <h2 className="font-serif text-2xl font-semibold text-stone-800 mb-3">Connexion requise</h2>
        <p className="text-stone-500 mb-6">Connectez-vous pour accéder à votre panier.</p>
        <Link to="/login" className="btn-primary px-8">Se connecter</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-8 text-center text-stone-400">Chargement...</div>;
  }

  if (cart.items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-6xl mb-4">🛍️</p>
        <h2 className="font-serif text-2xl font-semibold text-stone-800 mb-3">Votre panier est vide</h2>
        <p className="text-stone-500 mb-6">Découvrez nos bijoux et ajoutez vos favoris !</p>
        <Link to="/catalog" className="btn-primary px-8">Voir le catalogue</Link>
      </div>
    );
  }

  const handleQtyChange = async (productId: string, qty: number) => {
    try {
      await updateItem(productId, qty);
      if (qty === 0) toast.success('Article retiré du panier');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-serif text-3xl font-semibold text-stone-800 mb-6">Mon panier</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Articles */}
        <div className="md:col-span-2 space-y-3">
          {cart.items.map((item) => (
            <div key={item.productId} className="card p-4 flex gap-4">
              <div className="w-20 h-20 bg-rose-50 rounded-lg shrink-0 overflow-hidden">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">💍</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-stone-800 truncate">{item.name}</h3>
                <p className="text-rose-400 font-semibold mt-1">
                  {(item.priceCents / 100).toFixed(2)} €
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <button onClick={() => handleQtyChange(item.productId, 0)}
                  className="text-stone-300 hover:text-red-400 transition-colors">
                  <TrashIcon className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleQtyChange(item.productId, item.quantity - 1)}
                    className="w-7 h-7 rounded border hover:bg-stone-100 text-sm">−</button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <button onClick={() => handleQtyChange(item.productId, item.quantity + 1)}
                    className="w-7 h-7 rounded border hover:bg-stone-100 text-sm">+</button>
                </div>
                <p className="text-sm font-semibold text-stone-700">
                  {((item.priceCents * item.quantity) / 100).toFixed(2)} €
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Récap */}
        <div className="card p-6 h-fit">
          <h2 className="font-semibold text-stone-800 mb-4">Récapitulatif</h2>
          <div className="space-y-2 text-sm text-stone-600 mb-4">
            <div className="flex justify-between">
              <span>Sous-total</span>
              <span>{(cart.totalCents / 100).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span>Livraison</span>
              <span className="text-green-600">Gratuite</span>
            </div>
          </div>
          <div className="border-t pt-4 flex justify-between font-bold text-stone-800 mb-6">
            <span>Total</span>
            <span className="text-xl text-rose-500">{(cart.totalCents / 100).toFixed(2)} €</span>
          </div>
          <button onClick={() => navigate('/checkout')} className="btn-primary w-full py-3">
            Commander →
          </button>
          <Link to="/catalog" className="btn-secondary w-full py-2 text-center mt-3 block text-sm">
            Continuer mes achats
          </Link>
        </div>
      </div>
    </div>
  );
}
