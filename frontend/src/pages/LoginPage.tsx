import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useCartStore } from '../store/cart.store';
import toast from 'react-hot-toast';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const { fetchCart } = useCartStore();
  const navigate = useNavigate();
  const shopName = import.meta.env.VITE_SHOP_NAME || 'société';

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await login(email, password);
      await fetchCart();
//récupérer le prénom
      const currentUser = useAuthStore.getState().user;
console.log('LoginPage.tsx currentUser=', currentUser);
      const prenom = currentUser?.firstName || 'utilisateur inconnu';
      toast.success(`Bienvenue ${prenom}!`);
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'LoginPage.tsx erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">

      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-6">
           <h1 className="font-serif text-2xl font-semibold text-stone-800 mt-2">Connexion à {shopName}</h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr" className="input-field"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1">Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" className="input-field"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
          </div>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full py-3 mt-2">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
         </div>

        <p className="text-center text-sm text-stone-500 mt-6">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-rose-400 hover:underline font-medium">
            Créer un compte
          </Link>
        </p>
      </div>

    </div>
  );
}
