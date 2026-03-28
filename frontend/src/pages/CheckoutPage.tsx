// fichier frontend/src/pages/CheckoutPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cart.store';
import { api } from '../utils/api';
import type { Address } from '../types';
import toast from 'react-hot-toast';
import { LockClosedIcon, PlusIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

type AddressMode = 'saved' | 'new';

const emptyAddrForm = {
  first_name: '', last_name: '',
  line1: '', line2: '',
  postal_code: '', city: '',
  country: 'France',
};

export function CheckoutPage() {
  const { cart, fetchCart } = useCartStore();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressMode, setAddressMode] = useState<AddressMode>('saved');
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [addrForm, setAddrForm] = useState(emptyAddrForm);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/addresses').then(({ data }) => {
      const list: Address[] = data.data;
      setAddresses(list);
      const def = list.find(a => a.is_default === 1);
      if (def) { setSelectedAddressId(def.id); setAddressMode('saved'); }
      else if (list.length === 0) { setAddressMode('new'); }
    });
  }, []);

  const formatCard = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (v: string) =>
    v.replace(/\D/g, '').slice(0, 4).replace(/(.{2})/, '$1/');
  const setAddr = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddrForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (cardNumber.replace(/\s/g, '').length < 16) { toast.error('Numéro de carte invalide'); return; }
    let addressPayload: Record<string, any>;
    if (addressMode === 'saved') {
      if (!selectedAddressId) { toast.error('Veuillez sélectionner une adresse'); return; }
      addressPayload = { address_id: selectedAddressId };
    } else {
      if (!addrForm.first_name || !addrForm.last_name || !addrForm.line1 || !addrForm.postal_code || !addrForm.city) {
        toast.error("Veuillez remplir tous les champs d'adresse"); return;
      }
      addressPayload = addrForm;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/orders/checkout', addressPayload);
      await fetchCart();
      toast.success(`Commande #${data.data.orderId} confirmée`);
      navigate('/order-success', { 
      	state: { 
          orderId: data.data.orderId, 
          totalCents: data.data.totalCents,
          emailSent: data.data.emailSent,
        } });
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-serif text-3xl font-semibold text-stone-800 mb-6">Finaliser la commande</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-5">

          {/* Adresse */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPinIcon className="w-5 h-5 text-rose-400" />
              <h2 className="font-semibold text-stone-800">Adresse de livraison</h2>
            </div>
            {addresses.length > 0 && (
              <div className="flex gap-2 mb-4">
                <button onClick={() => setAddressMode('saved')}
                  className={`text-sm px-4 py-1.5 rounded-lg border transition-colors
${addressMode === 'saved' ? 'bg-rose-400 text-white border-rose-400' : 'text-stone-600 border-stone-300 hover:bg-stone-50'}`}>
                  Mes adresses
                </button>
                <button onClick={() => setAddressMode('new')}
                  className={`text-sm px-4 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${addressMode === 'new' ? 'bg-rose-400 text-white border-rose-400' : 'text-stone-600 border-stone-300 hover:bg-stone-50'}`}>
                  <PlusIcon className="w-3.5 h-3.5" /> Nouvelle adresse
                </button>
              </div>
            )}
            {addressMode === 'saved' && (
              <div className="space-y-2">
                {addresses.map(a => (
                  <label key={a.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedAddressId === a.id ? 'border-rose-300 bg-rose-50' : 'border-stone-200 hover:border-stone-300'}`}>
                    <input type="radio" name="address" checked={selectedAddressId === a.id}
                      onChange={() => setSelectedAddressId(a.id)} className="mt-1 accent-rose-400" />
                    <div className="flex-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-700">{a.label}</span>
                        {a.is_default === 1 && (
                          <span className="flex items-center gap-0.5 text-xs text-rose-400">
                            <StarIcon className="w-3 h-3" /> Défaut
                          </span>
                        )}
                      </div>
                      <p className="text-stone-600">{a.first_name} {a.last_name}</p>
                      <p className="text-stone-500">{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
                      <p className="text-stone-500">{a.postal_code} {a.city} — {a.country}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {addressMode === 'new' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-stone-600 block mb-1">Prénom *</label>
                    <input value={addrForm.first_name} onChange={setAddr('first_name')} className="input-field" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-stone-600 block mb-1">Nom *</label>
                    <input value={addrForm.last_name} onChange={setAddr('last_name')} className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-600 block mb-1">Adresse *</label>
                  <input value={addrForm.line1} onChange={setAddr('line1')} placeholder="N° et nom de rue" className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-600 block mb-1">Complément</label>
                  <input value={addrForm.line2} onChange={setAddr('line2')} placeholder="Appartement, bâtiment..." className="input-field" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-stone-600 block mb-1">Code postal *</label>
                    <input value={addrForm.postal_code} onChange={setAddr('postal_code')} className="input-field" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-stone-600 block mb-1">Ville *</label>
                    <input value={addrForm.city} onChange={setAddr('city')} className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-600 block mb-1">Pays</label>
                  <input value={addrForm.country} onChange={setAddr('country')} className="input-field" />
                </div>
              </div>
            )}
          </div>

          {/* Paiement simulé */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-semibold text-stone-800">Paiement</h2>
              <span className="badge bg-amber-100 text-amber-600 ml-auto">Mode simulation</span>
            </div>
            <p className="text-xs text-stone-400 mb-4 bg-amber-50 border border-amber-100 rounded-lg p-3">
              ⚠️ Paiement simulé — aucune transaction réelle ne sera effectuée
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Numéro de carte</label>
                <input type="text" value={cardNumber} onChange={e => setCardNumber(formatCard(e.target.value))}
                  placeholder="4242 4242 4242 4242" className="input-field font-mono" maxLength={19} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-stone-600 block mb-1">Expiration</label>
                  <input type="text" value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/AA" className="input-field" maxLength={5} />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-600 block mb-1">CVV</label>
                  <input type="text" value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="123" className="input-field" maxLength={3} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Récap */}
        <div className="card p-6 h-fit">
          <h2 className="font-semibold text-stone-800 mb-4">Votre commande</h2>
          <div className="space-y-2 text-sm mb-4">
            {cart.items.map(item => (
              <div key={item.productId} className="flex justify-between text-stone-600">
                <span className="truncate mr-2">{item.name} ×{item.quantity}</span>
                <span className="shrink-0">{((item.priceCents * item.quantity) / 100).toFixed(2)} €</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 flex justify-between font-bold text-stone-800 mb-6">
            <span>Total</span>
            <span className="text-rose-500">{(cart.totalCents / 100).toFixed(2)} €</span>
          </div>
          <button onClick={handleSubmit} disabled={submitting}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <LockClosedIcon className="w-4 h-4" />
            {submitting ? 'Traitement...' : 'Confirmer la commande'}
          </button>
          <p className="text-xs text-stone-400 text-center mt-3">Paiement sécurisé simulé</p>
        </div>
      </div>
    </div>
  );
}
