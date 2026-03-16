// fichier frontend/src/pages/OrderSuccessPage.tsx
import { Link, useLocation } from 'react-router-dom';
import { CheckCircleIcon, EnvelopeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export function OrderSuccessPage() {
  const { state } = useLocation();
  const { orderId, totalCents, emailSent } = state ?? {};
console.log('emailSent=', emailSent);
  const shopName = import.meta.env.VITE_SHOP_NAME || 'société';

  return (
    <div className="px-5 py-20 text-center">
{/* icône de succès */}
      <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-3" />

      <h1 className="font-serif text-2xl font-semibold text-stone-800 mb-3">
        Commande confirmée chez {shopName}!
      </h1>
      
      <p className="text-stone-600 mb-6">
          Référence: <span className="font-semibold font-medium text-stone-600">#{orderId}</span>
      </p>
  
      <p className="text-stone-600 mb-6">
          Montant total: <span className="font-semibold text-rose-500">{(totalCents / 100).toFixed(2)} €</span>
      </p>

{/* ⚠️ Message d'avertissement si email échoué */}
        {!emailSent && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 mb-1">
                  Email de confirmation non envoyé
                </p>
                <p className="text-xs text-amber-800">
                  Une erreur technique est survenue. Vous retrouverez tous les détails de 
                  votre commande dans votre espace client.
                </p>
              </div>
            </div>
          </div>
        )}

{/* ✅ Message de succès si email envoyé */}
        {emailSent && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <EnvelopeIcon className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Un email de confirmation vous a été envoyé
                </p>
                <p className="text-xs text-green-800">
                  Vérifiez vos spams si vous ne le recevez pas sous 5 minutes.
                </p>
              </div>
            </div>
          </div>
        )}

{/* boutons d'actions */}     
      <div className="flex gap-3 justify-center">
        <Link to="/orders" className="btn-secondary px-6">Mes commandes</Link>
        <Link to="/catalog" className="btn-primary px-6">Continuer mes achats</Link>
      </div>
    </div>
  );
}
