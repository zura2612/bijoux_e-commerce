import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useCartStore } from '../store/cart.store';
import { useAuthStore } from '../store/auth.store';
import type { Product } from '../types';
import toast from 'react-hot-toast';
import { ShoppingBagIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const { addItem } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    api.get(`/catalog/products/${id}`).then(({ data }) => setProduct(data.data));
  }, [id]);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-stone-400">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-stone-100 rounded-xl" />
          <div className="h-6 bg-stone-100 rounded w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  const handleAdd = async () => {
    if (!user) {
      toast.error('Connectez-vous pour ajouter au panier');
      navigate('/login');
      return;
    }
    try {
      await addItem(product.id, qty);
      toast.success(`${product.name} ajouté au panier !`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-stone-500 hover:text-rose-400 mb-6 text-sm transition-colors">
        <ArrowLeftIcon className="w-4 h-4" />
        Retour
      </button>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="aspect-square bg-gradient-to-br from-rose-50 to-pink-100 rounded-2xl overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-8xl">💍</div>
          )}
        </div>

        {/* Infos */}
        <div className="flex flex-col">
          <p className="text-xl text-rose-400 font-medium uppercase tracking-wide mb-2">
            {product.category_name}
          </p>
          <h1 className="font-serif text-2xl font-semibold text-stone-800 mb-3">{product.name}</h1>
          <p className="text-xl text-stone-500 leading-relaxed mb-6">{product.description}</p>

          <div className="text-3xl font-bold text-stone-800 mb-6">
            {(product.price_cents / 100).toFixed(2)} €
          </div>

          {product.stock > 0 ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <label className="text-sm font-bold text-stone-700">Quantité</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-8 h-8 rounded-lg border hover:bg-stone-100 font-bold">−</button>
                  <span className="w-8 text-center font-medium">{qty}</span>
                  <button onClick={() => setQty(Math.min(product.stock, qty + 1))}
                    className="w-8 h-8 rounded-lg border hover:bg-stone-100 font-bold">+</button>
                </div>
                <span className="text-sm font-bold text-stone-700">{product.stock} en stock</span>
              </div>
              <button onClick={handleAdd} className="btn-primary flex items-center gap-2 justify-center py-3">
                <ShoppingBagIcon className="w-5 h-5" />
                Ajouter au panier
              </button>
            </>
          ) : (
            <div className="bg-stone-100 rounded-lg p-4 font-bold text-stone-700 text-center">
              Produit épuisé
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-stone-100 space-y-2 font-bold text-sm text-stone-700">
            <p>✓ Livraison sous 2-3 jours ouvrés</p>
            <p>✓ Paiement 100% sécurisé</p>
            <p>✓ Retours gratuits sous 30 jours</p>
          </div>
        </div>
      </div>
    </div>
  );
}
