// fichier frontend/src/pages/ProfilePage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export function ProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Formulaire email
  const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' });
  const [emailLoading, setEmailLoading] = useState(false);

  // Formulaire mot de passe
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdLoading, setPwdLoading] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleEmailSubmit = async () => {
    if (!emailForm.newEmail || !emailForm.password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    if (emailForm.newEmail === user.email) {
      toast.error('Le nouvel email est identique à l\'actuel');
      return;
    }
    setEmailLoading(true);
    try {
      await api.put('/profile/email', emailForm);
      toast.success('Email mis à jour. Reconnectez-vous avec votre nouvel email.');
      await logout();
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!pwdForm.currentPassword || !pwdForm.newPassword || !pwdForm.confirmPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (pwdForm.newPassword.length < 8) {
      toast.error('Le nouveau mot de passe doit faire au moins 8 caractères');
      return;
    }
    setPwdLoading(true);
    try {
      await api.put('/profile/password', {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      toast.success('Mot de passe mis à jour !');
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="font-serif text-3xl font-semibold text-stone-800 mb-2">Mon profil</h1>
      <p className="text-stone-400 text-sm mb-8">Connecté en tant que <span className="font-medium text-stone-600">{user.email}</span></p>

      {/* ── Modifier l'email ── */}
      <div className="card p-6 mb-5">
        <div className="flex items-center gap-2 mb-5">
          <EnvelopeIcon className="w-5 h-5 text-rose-400" />
          <h2 className="font-semibold text-stone-800">Modifier l'email</h2>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-5">
          <p className="text-xs text-amber-700">
            ⚠️ Après la modification, vous serez déconnecté et devrez vous reconnecter avec votre nouvel email.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1">Nouvel email</label>
            <input
              type="email"
              value={emailForm.newEmail}
              onChange={e => setEmailForm(f => ({ ...f, newEmail: e.target.value }))}
              placeholder={user.email}
              className="input-field"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1">Mot de passe actuel (confirmation)</label>
            <input
              type="password"
              value={emailForm.password}
              onChange={e => setEmailForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              className="input-field"
              onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
            />
          </div>
        </div>

        <button
          onClick={handleEmailSubmit}
          disabled={emailLoading}
          className="btn-primary w-full py-3 mt-5"
        >
          {emailLoading ? 'Mise à jour...' : 'Modifier l\'email'}
        </button>
      </div>

      {/* ── Modifier le mot de passe ── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <LockClosedIcon className="w-5 h-5 text-rose-400" />
          <h2 className="font-semibold text-stone-800">Modifier le mot de passe</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1">Mot de passe actuel</label>
            <input
              type="password"
              value={pwdForm.currentPassword}
              onChange={e => setPwdForm(f => ({ ...f, currentPassword: e.target.value }))}
              placeholder="••••••••"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              value={pwdForm.newPassword}
              onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))}
              placeholder="8 caractères minimum"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              value={pwdForm.confirmPassword}
              onChange={e => setPwdForm(f => ({ ...f, confirmPassword: e.target.value }))}
              placeholder="••••••••"
              className="input-field"
              onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
            />
          </div>
        </div>

        <button
          onClick={handlePasswordSubmit}
          disabled={pwdLoading}
          className="btn-primary w-full py-3 mt-5"
        >
          {pwdLoading ? 'Mise à jour...' : 'Modifier le mot de passe'}
        </button>
      </div>
    </div>
  );
}
