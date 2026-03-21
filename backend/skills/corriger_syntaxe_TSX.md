# Skill: Correction Syntaxe JSX/TSX

## Problèmes à Détecter
- Espaces dans les attributs: `className= "..."` → `className="..."`
- Opérateur logique: `& &` → `&&`
- Fonction fléchée: `() = >` → `() =>`
- Balises fermantes: `</div >` → `</div>`
- Éléments frères sans Fragment: envelopper dans `<>...</>`

## Méthode de Correction
1. Parser le fichier ligne par ligne
2. Identifier les patterns problématiques
3. Proposer la version corrigée avec explication
4. Vérifier que le JSX est valide après correction

## Format de réponse attendu :
## nom_fichier.tsx - Corrections
| Ligne | Erreur | Correction |
|-------|--------|------------|
| 45    | & &    | &&         |

## Exemple Avant/Après
❌ AVANT:
<Link to= "/catalog " className= "hover:text-rose-500 " >Catalogue </Link >

✅ APRÈS:
<Link to="/catalog" className="hover:text-rose-500">Catalogue</Link>