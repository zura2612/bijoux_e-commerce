import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useCartStore } from '../store/cart.store';
import toast from 'react-hot-toast';

export function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const { fetchCart } = useCartStore();
  const navigate = useNavigate();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (form.password.length < 8) { toast.error('Mot de passe : 8 caractères minimum'); return; }
    setLoading(true);
    try {
      await register(form);
      await fetchCart();
      toast.success('Compte créé avec succès !');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-4xl">✨</span>
          <h1 className="font-serif text-2xl font-semibold text-stone-800 mt-2">Créer un compte</h1>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">Prénom</label>
              <input type="text" value={form.firstName} onChange={set('firstName')} placeholder="Marie" className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">Nom</label>
              <input type="text" value={form.lastName} onChange={set('lastName')} placeholder="Dupont" className="input-field" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1">Email</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="vous@exemple.fr" className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1">Mot de passe</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="8 caractères minimum" className="input-field" />
          </div>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full py-3 mt-2">
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </div>

        <p className="text-center text-sm text-stone-500 mt-6">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-rose-400 hover:underline font-medium">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
