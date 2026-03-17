// fichier frontend/src/components/ui/Pagination.tsx

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

function getPageNumbers(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | '…')[] = [1];

  if (page > 3) pages.push('…');

  const start = Math.max(2, page - 1);
  const end   = Math.min(totalPages - 1, page + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (page < totalPages - 2) pages.push('…');

  pages.push(totalPages);

  return pages;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);

  return (
    <nav
      className="flex items-center justify-center gap-1 mt-8 select-none"
      aria-label="Pagination"
    >
      {/* Bouton Précédent */}
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Page précédente"
        className="
          flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
          text-stone-500 hover:text-stone-800 hover:bg-stone-100
          disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-stone-500
          transition-all duration-150
        "
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="hidden sm:inline">Précédent</span>
      </button>

      {/* Numéros de page */}
      <div className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === '…' ? (
            <span
              key={`ellipsis-${i}`}
              className="w-9 h-9 flex items-center justify-center text-stone-400 text-sm"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
              className={`
                w-9 h-9 rounded-lg text-sm font-medium transition-all duration-150
                ${p === page
                  ? 'bg-[#b5838d] text-white shadow-sm'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-800'
                }
              `}
            >
              {p}
            </button>
          )
        )}
      </div>

      {/* Bouton Suivant */}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Page suivante"
        className="
          flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
          text-stone-500 hover:text-stone-800 hover:bg-stone-100
          disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-stone-500
          transition-all duration-150
        "
      >
        <span className="hidden sm:inline">Suivant</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  );
}
