// fichier frontend/src/pages/CatalogPage.tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { ProductCard } from '../components/catalog/ProductCard';
import { Pagination } from '../components/ui/Pagination';
import type { Product, Category, PaginationType } from '../types';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  const category = searchParams.get('category') ?? '';
  const page = Number(searchParams.get('page') ?? 1);
  const PAGE_SIZE = Number(import.meta.env.VITE_CATALOG_PAGE_SIZE ?? 8);

  useEffect(() => {
    api.get('/catalog/categories').then(({ data }) => setCategories(data.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search)   params.set('search', search);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));

    api.get(`/catalog/products?${params}`).then(({ data }) => {
      setProducts(data.data);
      setPagination(data.pagination);
    }).finally(() => setLoading(false));
  }, [category, page, search]);

  const setCategory = (slug: string) => {
    // Réinitialiser page à 1 lors d'un changement de catégorie
    setSearchParams(slug ? { category: slug } : {});
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Réinitialiser page à 1 lors d'une nouvelle recherche
    setSearchParams(search ? { search } : {});
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-serif text-3xl font-semibold text-stone-800 mb-6">Catalogue</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar filtres */}
        <aside className="md:w-56 shrink-0">
          {/* Recherche */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="input-field pr-10"
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-rose-400">
                <MagnifyingGlassIcon className="w-5 h-5" />
              </button>
            </div>
          </form>

          {/* Catégories */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
              Catégories
            </h3>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setCategory('')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !category ? 'bg-rose-100 text-rose-600 font-medium' : 'hover:bg-stone-100 text-stone-600'
                  }`}
                >
                  Tous les bijoux
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => setCategory(cat.slug)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      category === cat.slug ? 'bg-rose-100 text-rose-600 font-medium' : 'hover:bg-stone-100 text-stone-600'
                    }`}
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Grille produits */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(PAGE_SIZE)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="aspect-square bg-stone-100" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-stone-100 rounded w-1/2" />
                    <div className="h-4 bg-stone-100 rounded w-3/4" />
                    <div className="h-3 bg-stone-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-stone-400">
              <p className="text-5xl mb-4">💫</p>
              <p>Aucun produit trouvé</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-stone-400 mb-4">
                {pagination?.total} résultat{pagination && pagination.total > 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
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
      </div>
    </div>
  );
}
