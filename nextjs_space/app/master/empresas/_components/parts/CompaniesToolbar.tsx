import { Search, ChevronDown } from "lucide-react";

interface CompaniesToolbarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterStatus: string;
  setFilterStatus: (value: string) => void;
}

export function CompaniesToolbar({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
}: CompaniesToolbarProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm mb-6">
      <div className="flex flex-col md:flex-row items-center gap-4">
        {/* SearchBar */}
        <div className="w-full md:flex-1">
          <label className="flex flex-col w-full">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-14">
              <div className="text-gray-500 dark:text-gray-400 flex bg-gray-50 dark:bg-zinc-800 items-center justify-center px-4 rounded-l-lg border border-gray-300 dark:border-zinc-700 border-r-0">
                <Search className="h-5 w-5" />
              </div>
              <input
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 h-14 placeholder:text-gray-400 dark:placeholder:text-gray-500 px-4 text-base font-normal leading-normal"
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </label>
        </div>
        {/* Chips */}
        <div className="flex gap-2 flex-wrap items-center justify-center md:justify-end">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mr-2 hidden md:block">
            Filtros:
          </p>
          {[
            "Todos",
            "Pendente",
            "Ativa",
            "Inadimplente",
            "Pausada",
            "Em Teste",
          ].map((status) => {
            let activeClass =
              "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"; // Default (Todos)
            if (status === "Pendente")
              activeClass =
                "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
            if (status === "Ativa")
              activeClass =
                "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
            if (status === "Inadimplente")
              activeClass =
                "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
            if (status === "Pausada")
              activeClass =
                "bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200";
            if (status === "Em Teste")
              activeClass =
                "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";

            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? activeClass
                    : "bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                {status}
                {filterStatus === status && <ChevronDown className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
