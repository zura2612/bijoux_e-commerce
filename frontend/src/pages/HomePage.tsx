// fichier frontend/src/pages/HomePage.tsx
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { ProductCard } from '../components/catalog/ProductCard';
import type { Product } from '../types';

export function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);

  useEffect(() => {
    api.get('/catalog/products?limit=4&nouveautes=true').then(({ data }) => setFeatured(data.data));
  }, []);

  const categories = [
    { name: 'Colliers', slug: 'colliers', emoji: '📿' },
    { name: 'Bracelets', slug: 'bracelets', emoji: '💫' },
    { name: 'Boucles d\'oreilles', slug: 'boucles-oreilles', emoji: '✨' },
    { name: 'Bagues', slug: 'bagues', emoji: '💍' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-rose-50 via-pink-50 to-stone-50 py-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-serif text-3xl md:text-3xl font-semibold text-stone-800 mb-4">
          Bijoux Fantaisie
          </h1>
          <p className="text-stone-800 text-lg mb-8">
            Des créations uniques, élégantes et accessibles pour sublimer chaque instant.
          </p>
          <Link to="/catalog" className="btn-primary text-base px-8 py-3">
            Découvrir la collection
          </Link>
        </div>
      </section>

      {/* Catégories */}
      <section className="max-w-6xl mx-auto px-4 py-5">
        <h2 className="font-serif text-2xl font-semibold text-stone-800 mb-6 text-center">
          Nos collections
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              to={`/catalog?category=${cat.slug}`}
              className="card p-6 text-center hover:shadow-md transition-shadow group"
            >
              <div className="text-4xl mb-3">{cat.emoji}</div>
              <p className="font-medium text-stone-700 group-hover:text-rose-500 transition-colors">
                {cat.name}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Nouveautés */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="font-serif text-2xl font-semibold text-stone-800 mb-6 text-center">
          Nouveautés
        </h2>
{/* voir components/catalog/ProductCard.tsx */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className="text-center mt-8">
          <Link to="/catalog" className="btn-secondary px-8 py-3">
            Voir tout le catalogue →
          </Link>
        </div>
      </section>
    </div>
  );
}
