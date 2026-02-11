"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, X, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

interface Note {
  id: string;
  title: string;
  content: string;
  color: string | null;
  updatedAt: Date;
}

const colors = [
  {
    name: "yellow",
    class:
      "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
  },
  {
    name: "green",
    class:
      "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  },
  {
    name: "blue",
    class:
      "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  },
  {
    name: "pink",
    class:
      "bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800",
  },
  {
    name: "purple",
    class:
      "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
  },
];

export default function NotesBoard({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedColor, setSelectedColor] = useState("yellow");

  const resetForm = () => {
    setTitle("");
    setContent("");
    setSelectedColor("yellow");
    setIsCreating(false);
    setEditingId(null);
  };

  const startEdit = (note: Note) => {
    setTitle(note.title);
    setContent(note.content);
    setSelectedColor(note.color || "yellow");
    setEditingId(note.id);
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Título e conteúdo são obrigatórios");
      return;
    }

    setIsLoading(true);
    try {
      if (editingId) {
        // Update
        const response = await fetch(`/api/notes/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, color: selectedColor }),
        });

        if (!response.ok) throw new Error("Falha ao atualizar");

        const updatedNote = await response.json();
        setNotes((prev) =>
          prev.map((n) => (n.id === editingId ? updatedNote : n))
        );
        toast.success("Anotação atualizada!");
      } else {
        // Create
        const response = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, color: selectedColor }),
        });

        if (!response.ok) throw new Error("Falha ao criar");

        const newNote = await response.json();
        setNotes((prev) => [newNote, ...prev]);
        toast.success("Anotação criada!");
      }
      resetForm();
      router.refresh();
    } catch (error) {
      toast.error("Erro ao salvar anotação");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir esta anotação?")) return;

    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Falha ao excluir");

      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success("Anotação excluída");
      router.refresh();
    } catch (error) {
      toast.error("Erro ao excluir anotação");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-gray-500 dark:text-gray-400">
          Gerencie suas notas pessoais e lembretes rápidos.
        </p>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Nova Nota
        </button>
      </div>

      {/* Editor Modal/Overlay */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">
                  {editingId ? "Editar Nota" : "Nova Nota"}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <input
                type="text"
                placeholder="Título"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent border-b border-gray-200 dark:border-zinc-700 py-2 text-lg font-medium focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                autoFocus
              />

              <textarea
                placeholder="Escreva sua nota aqui..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-40 bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10"
              />

              <div className="flex items-center gap-2">
                {colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c.name)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      c.class.split(" ")[0]
                    } ${
                      selectedColor === c.name
                        ? "border-black dark:border-white scale-110"
                        : "border-transparent"
                    }`}
                  />
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {notes.map((note) => {
            const colorTheme =
              colors.find((c) => c.name === note.color) || colors[0];
            return (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => startEdit(note)}
                className={`group relative p-5 rounded-2xl border ${colorTheme.class} cursor-pointer hover:shadow-lg transition-all duration-300 min-h-[200px] flex flex-col`}
              >
                <h3 className="font-bold text-lg mb-2 line-clamp-1">
                  {note.title}
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-6 flex-1">
                  {note.content}
                </p>

                <div className="mt-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pt-2 border-t border-black/5 dark:border-white/5">
                  <span className="text-xs text-gray-500">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleDelete(note.id, e)}
                      className="p-1.5 bg-white/50 dark:bg-black/20 hover:bg-red-500 hover:text-white rounded-full transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {notes.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-500">
            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 opacity-50" />
            </div>
            <p>Nenhuma anotação ainda.</p>
            <p className="text-sm mt-1">
              Clique em &quot;Nova Nota&quot; para começar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
