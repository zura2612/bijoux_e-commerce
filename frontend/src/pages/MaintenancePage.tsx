// fichier frontend/src/pages/MaintenancePage.tsx
export function MaintenancePage() {
  const shopName = import.meta.env.VITE_SHOP_NAME || 'Notre boutique';

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">

        {/* Icône */}
        <div className="text-6xl mb-6 animate-pulse">🔧</div>

        {/* Titre */}
        <h1 className="font-serif text-3xl font-semibold text-stone-800 mb-3">
          Site en maintenance
        </h1>

        {/* Message */}
        <p className="text-stone-500 mb-2">
          {shopName} est temporairement indisponible.
        </p>
        <p className="text-stone-400 text-sm">
          Nous effectuons des améliorations et serons de retour très prochainement.
        </p>

        {/* Séparateur */}
        <div className="w-12 h-0.5 bg-rose-200 mx-auto my-6" />

        {/* Suggestion */}
        <p className="text-stone-400 text-xs">
          Merci de votre patience — revenez dans quelques instants.
        </p>

      </div>
    </div>
  );
}
