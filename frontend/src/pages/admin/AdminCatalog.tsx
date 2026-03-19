// fichier frontend/src/pages/admin/AdminCatalog.tsx
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../utils/api';
import { Pagination } from '../../components/ui/Pagination';
import { useAuthStore } from '../../store/auth.store';
import type { PaginationType } from '../../types';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface Product {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  stock: number;
  category_id: number;
  category_name: string;
  image_url: string;
  is_new?: boolean;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  product_count: number;
}

const emptyForm = {
  name: '',
  description: '',
  price_cents: '',
  stock: '',
  category_id: '',
};

export function AdminCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [products, setProducts]       = useState<Product[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [pagination, setPagination]   = useState<PaginationType | null>(null);
  const [search, setSearch]           = useState(searchParams.get('search') ?? '');
  const [filterCategory, setFilterCategory] = useState(searchParams.get('category') ?? '');
  const [tab, setTab]                 = useState<'products' | 'categories'>('products');
  const [showForm, setShowForm]       = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm]               = useState(emptyForm);
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [newCatName, setNewCatName]   = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});

  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const ADMIN_PAGE_SIZE = Number(import.meta.env.VITE_ADMIN_CATALOG_PAGE_SIZE ?? 12);

  const fetchProducts = async (currentPage = page) => {
    const params = new URLSearchParams({ page: String(currentPage), limit: String(ADMIN_PAGE_SIZE) });
    if (search) params.set('search', search);
    if (filterCategory) params.set('category', filterCategory);
    const { data } = await api.get(`/admin/catalog/products?${params}`);
    setProducts(data.data);
    setPagination(data.pagination);
  };

  const fetchCategories = async () => {
    const { data } = await api.get('/admin/catalog/categories');
    setCategories(data.data);
  };

  // Conditionnés à user — ne partent pas tant que fetchMe() n'a pas terminé
  useEffect(() => {
    if (!user) return;
    fetchProducts();
  }, [page, search, filterCategory, user]);

  useEffect(() => {
    if (!user) return;
    fetchCategories();
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', '1');
      if (search) next.set('search', search);
      else next.delete('search');
      return next;
    });
    fetchProducts(1);
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openCreate = () => {
    setEditProduct(null);
    setForm(emptyForm);
    setImageFile(null);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name,
      description: p.description,
      price_cents: String(p.price_cents / 100),
      stock: String(p.stock),
      category_id: String(p.category_id),
    });
    setImageFile(null);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('description', form.description);
    fd.append('price_cents', String(Math.round(parseFloat(form.price_cents) * 100)));
    fd.append('stock', form.stock);
    fd.append('category_id', form.category_id);
    if (imageFile) fd.append('image', imageFile);
    try {
      if (editProduct) {
        await api.put(`/admin/catalog/products/${editProduct.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(`Produit "${form.name}" mis à jour`);
      } else {
        await api.post('/admin/catalog/products', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(`Produit "${form.name}" créé`);
      }
      setShowForm(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer "${name}" ?`)) return;
    try {
      await api.delete(`/admin/catalog/products/${id}`);
      toast.success(`Produit "${name}" supprimé`);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleStockChange = async (id: string, name: string, stock: number) => {
    try {
      await api.put(`/admin/catalog/products/${id}/stock`, { stock });
      toast.success(`Stock de "${name}" mis à jour`);
      setProducts(ps => ps.map(p => p.id === id ? { ...p, stock } : p));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handlePriceChange = async (id: string, name: string, priceEuros: string) => {
    const priceCents = Math.round(parseFloat(priceEuros) * 100);
    if (isNaN(priceCents) || priceCents <= 0) {
      toast.error('Prix invalide');
      return;
    }
    try {
      await api.put(`/admin/catalog/products/${id}`, { price_cents: priceCents });
      toast.success(`Prix de "${name}" mis à jour`);
      setProducts(ps => ps.map(p => p.id === id ? { ...p, price_cents: priceCents } : p));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleNew = async (id: string, name: string, currentIsNew: boolean) => {
    try {
      await api.patch(`/catalog/products/${id}/toggle-new`);
      setProducts(ps => ps.map(p => p.id === id ? { ...p, is_new: !currentIsNew } : p));
      toast.success(
        currentIsNew
          ? `"${name}" retiré des nouveautés`
          : `"${name}" marqué comme nouveauté`
      );
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await api.post('/admin/catalog/categories', { name: newCatName });
      toast.success(`Catégorie "${newCatName}" ajoutée`);
      setNewCatName('');
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!confirm(`Supprimer la catégorie "${name}" ?`)) return;
    try {
      await api.delete(`/admin/catalog/categories/${id}`);
      toast.success(`Catégorie "${name}" supprimée`);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-semibold text-stone-800">Catalogue</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('products')}
          className={`text-sm px-4 py-2 rounded-lg ${
            tab === 'products' ? 'bg-rose-400 text-white' : 'bg-white border text-stone-600'
          }`}
        >
          Produits
        </button>
        <button
          onClick={() => setTab('categories')}
          className={`text-sm px-4 py-2 rounded-lg ${
            tab === 'categories' ? 'bg-rose-400 text-white' : 'bg-white border text-stone-600'
          }`}
        >
          Catégories
        </button>
      </div>

      {/* Onglet Produits */}
      {tab === 'products' && (
        <>
          <div className="flex gap-3">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un produit..."
                className="input-field text-sm w-56"
              />
            </form>
            <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
              <PlusIcon className="w-4 h-4" /> Ajouter
            </button>
            {pagination && (
              <span className="text-sm text-stone-400 self-center">
                {pagination.total} produit{pagination.total > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  {['Image', 'Nom'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase">
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase">
                    <select
                      value={filterCategory}
                      onChange={e => {
                        setFilterCategory(e.target.value);
                        setSearchParams(prev => {
                          const next = new URLSearchParams(prev);
                          if (e.target.value) next.set('category', e.target.value);
                          else next.delete('category');
                          return next;
                        });
                      }}
                      className="text-xs font-semibold uppercase tracking-wide text-stone-500 bg-transparent border-0 cursor-pointer hover:text-rose-500 transition-colors pr-1"
                    >
                      <option value="">Catégorie</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.slug}>{c.name}</option>
                      ))}
                    </select>
                  </th>
                  {['Prix', 'Stock', 'Nouveauté', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 bg-rose-50 rounded-lg overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">💍</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-700 max-w-xs truncate">{p.name}</td>
                    <td className="px-4 py-3 text-stone-500">{p.category_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.10"
                          min="0.00"
                          value={priceInputs[p.id] ?? (p.price_cents / 100).toFixed(2)}
                          onChange={e => setPriceInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                          onBlur={e => {
                            handlePriceChange(p.id, p.name, e.target.value);
                            setPriceInputs(prev => {
                              const next = { ...prev };
                              delete next[p.id];
                              return next;
                            });
                          }}
                          className="w-20 border rounded px-2 py-1 text-sm text-right"
                        />
                        <span className="text-stone-400 text-sm">€</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        value={p.stock}
                        onChange={e => handleStockChange(p.id, p.name, parseInt(e.target.value))}
                        className="w-16 border rounded px-2 py-1 text-sm text-center"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleNew(p.id, p.name, p.is_new ?? false)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-colors ${
                          p.is_new
                            ? 'bg-rose-100 text-rose-600 border-rose-200 hover:bg-rose-200'
                            : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-rose-50 hover:border-rose-200'
                        }`}
                        title={p.is_new ? 'Retirer le badge nouveauté' : 'Marquer comme nouveauté'}
                      >
                        {p.is_new
                          ? <StarIconSolid className="w-3.5 h-3.5" />
                          : <StarIcon className="w-3.5 h-3.5" />
                        }
                        {p.is_new ? 'Nouveauté' : 'Marquer'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(p)} className="text-stone-400 hover:text-blue-500">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p.id, p.name)} className="text-stone-400 hover:text-red-500">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Onglet Catégories */}
      {tab === 'categories' && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="Nom de la catégorie"
              className="input-field text-sm w-56"
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
            />
            <button onClick={handleAddCategory} className="btn-primary flex items-center gap-2 text-sm">
              <PlusIcon className="w-4 h-4" /> Ajouter
            </button>
          </div>
          <div className="divide-y divide-stone-100">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center py-3">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-stone-700">{cat.name}</p>
                    <p className="text-xs text-stone-400">{cat.slug} — {cat.product_count} produit(s)</p>
                  </div>
                  {cat.product_count === 0 && (
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="text-rose-400 hover:text-red-500 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal formulaire produit */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between mb-4">
              <h2 className="font-semibold text-stone-800">
                {editProduct ? 'Modifier le produit' : 'Nouveau produit'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-stone-400 text-xl">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Nom *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="input-field resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-stone-600 block mb-1">Prix (€) *</label>
                  <input
                    type="number"
                    step="0.10"
                    value={form.price_cents}
                    onChange={e => setForm(f => ({ ...f, price_cents: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-600 block mb-1">Stock *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Catégorie *</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Choisir...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Image</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={e => setImageFile(e.target.files?.[0] ?? null)}
                  className="text-sm text-stone-500"
                />
                {editProduct?.image_url && !imageFile && (
                  <img src={editProduct.image_url} alt="" className="mt-2 w-20 h-20 object-cover rounded-lg" />
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={handleSubmit} className="btn-primary flex-1">
                {editProduct ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
