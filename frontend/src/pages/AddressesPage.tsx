import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import type { Address } from '../types';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

const emptyForm = {
  label: 'Domicile',
  first_name: '', last_name: '',
  line1: '', line2: '',
  postal_code: '', city: '',
  country: 'France',
  is_default: false,
};

export function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editAddress, setEditAddress] = useState<Address | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchAddresses = async () => {
    const { data } = await api.get('/addresses');
    setAddresses(data.data);
  };

  useEffect(() => { fetchAddresses(); }, []);

  const openCreate = () => {
    setEditAddress(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (a: Address) => {
    setEditAddress(a);
    setForm({
      label: a.label,
      first_name: a.first_name, last_name: a.last_name,
      line1: a.line1, line2: a.line2,
      postal_code: a.postal_code, city: a.city,
      country: a.country,
      is_default: a.is_default === 1,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name || !form.line1 || !form.postal_code || !form.city) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    try {
      if (editAddress) {
        await api.put(`/addresses/${editAddress.id}`, form);
        toast.success('Adresse mise à jour');
      } else {
        await api.post('/addresses', form);
        toast.success('Adresse ajoutée');
      }
      setShowForm(false);
      fetchAddresses();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette adresse ?')) return;
    try {
      await api.delete(`/addresses/${id}`);
      toast.success('Adresse supprimée');
      fetchAddresses();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await api.put(`/addresses/${id}/set-default`);
      fetchAddresses();
    } catch (err: any) { toast.error(err.message); }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-semibold text-stone-800">Mes adresses</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <PlusIcon className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-5xl mb-4">📍</p>
          <p className="mb-4">Aucune adresse enregistrée</p>
          <button onClick={openCreate} className="btn-primary px-6">
            Ajouter une adresse
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map(address => (
            <div key={address.id} className={`card p-5 ${address.is_default ? 'border-rose-200 bg-rose-50/30' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-stone-700">{address.label}</span>
                    {address.is_default === 1 && (
                      <span className="badge bg-rose-100 text-rose-500 flex items-center gap-1">
                        <StarSolid className="w-3 h-3" /> Par défaut
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-600">
                    {address.first_name} {address.last_name}
                  </p>
                  <p className="text-sm text-stone-500">{address.line1}</p>
                  {address.line2 && <p className="text-sm text-stone-500">{address.line2}</p>}
                  <p className="text-sm text-stone-500">{address.postal_code} {address.city}</p>
                  <p className="text-sm text-stone-400">{address.country}</p>
                </div>

                <div className="flex gap-2 ml-4">
                  {address.is_default !== 1 && (
                    <button onClick={() => handleSetDefault(address.id)}
                      title="Définir par défaut"
                      className="text-stone-300 hover:text-rose-400 transition-colors">
                      <StarIcon className="w-5 h-5" />
                    </button>
                  )}
                  <button onClick={() => openEdit(address)}
                    className="text-stone-300 hover:text-blue-400 transition-colors">
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDelete(address.id)}
                    className="text-stone-300 hover:text-red-400 transition-colors">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h2 className="font-semibold text-stone-800">
                {editAddress ? 'Modifier l\'adresse' : 'Nouvelle adresse'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-stone-400 text-xl">×</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Libellé</label>
                <input value={form.label} onChange={set('label')}
                  placeholder="Domicile, Bureau..." className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-stone-600 block mb-1">Prénom *</label>
                  <input value={form.first_name} onChange={set('first_name')} className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-600 block mb-1">Nom *</label>
                  <input value={form.last_name} onChange={set('last_name')} className="input-field" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Adresse *</label>
                <input value={form.line1} onChange={set('line1')}
                  placeholder="N° et nom de rue" className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Complément</label>
                <input value={form.line2} onChange={set('line2')}
                  placeholder="Appartement, bâtiment..." className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-stone-600 block mb-1">Code postal *</label>
                  <input value={form.postal_code} onChange={set('postal_code')} className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-600 block mb-1">Ville *</label>
                  <input value={form.city} onChange={set('city')} className="input-field" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Pays</label>
                <input value={form.country} onChange={set('country')} className="input-field" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_default}
                  onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))}
                  className="rounded text-rose-400" />
                <span className="text-sm text-stone-600">Définir comme adresse par défaut</span>
              </label>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={handleSubmit} className="btn-primary flex-1">
                {editAddress ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
