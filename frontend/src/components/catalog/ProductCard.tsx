import { Link } from 'react-router-dom';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '../../store/cart.store';
import { useAuthStore } from '../../store/auth.store';
import toast from 'react-hot-toast';
import type { Product } from '../../types';
import { useNavigate } from 'react-router-dom';

interface Props {
  product: Product;
}

export function ProductCard({ product }: Props) {
  const { addItem } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Connectez-vous pour ajouter au panier');
      navigate('/login');
      return;
    }
    try {
      await addItem(product.id, 1);
      toast.success(`${product.name} ajouté au panier !`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const price = (product.price_cents / 100).toFixed(2);

  return (
    <Link to={`/product/${product.id}`} className="card group hover:shadow-md transition-shadow duration-300">
      {/* Image */}
      <div className="aspect-square bg-gradient-to-br from-rose-50 to-pink-100 relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">💍</div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-stone-700 text-sm font-medium px-3 py-1 rounded-full">
              Épuisé
            </span>
          </div>
        )}
        {product.stock > 0 && product.stock <= 3 && (
          <div className="absolute top-2 right-2">
            <span className="badge bg-amber-100 text-amber-700">Plus que {product.stock}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-2xs text-rose-500 font-medium mb-3 uppercase tracking-wide">
          {product.category_name}
        </p>
        <h3 className="font-medium text-stone-800 mb-1 line-clamp-1 group-hover:text-rose-500 transition-colors">
          {product.name}
        </h3>
        <p className="text-2xs text-stone-800 line-clamp-2 mb-3">{product.description}</p>

        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-stone-800 mb-5">{price} €</span>
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="flex items-center gap-1.5 btn-primary text-2xs py-1.5 px-3"
          >
            <ShoppingBagIcon className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>
    </Link>
  );
}
