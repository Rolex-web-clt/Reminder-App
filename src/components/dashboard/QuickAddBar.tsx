import React, { useState } from 'react';
import { Plus, Calendar, Sparkles, CornerDownLeft } from 'lucide-react';
import { Category, Priority } from '../../types';

interface QuickAddBarProps {
  onQuickAdd: (title: string, priority: Priority, category: string) => Promise<void>;
  onOpenFullModal: () => void;
  onOpenAiModal: () => void;
  categories: Category[];
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({
  onQuickAdd,
  onOpenFullModal,
  onOpenAiModal,
  categories,
}) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [category, setCategory] = useState('Personal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onQuickAdd(title.trim(), priority, category);
      setTitle('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 sm:p-2.5 shadow-sm flex flex-wrap sm:flex-nowrap items-center gap-2 transition focus-within:ring-2 focus-within:ring-indigo-500"
    >
      <div className="flex-1 flex items-center gap-2 px-2 min-w-[200px]">
        <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <input
          id="quick-add-task-input"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Quick add task... (e.g. Call client at 4pm)"
          className="w-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
        <select
          value={priority}
          onChange={e => setPriority(e.target.value as Priority)}
          className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-2 py-1.5 rounded-lg border-0 focus:outline-none"
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>

        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-2 py-1.5 rounded-lg border-0 focus:outline-none max-w-[100px] truncate"
        >
          {categories.map(c => (
            <option key={c._id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onOpenAiModal}
          className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition"
          title="Natural language & voice input"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onOpenFullModal}
          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
          title="Full options"
        >
          <Calendar className="w-3.5 h-3.5" />
        </button>

        <button
          type="submit"
          disabled={!title.trim() || isSubmitting}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-xs"
        >
          <span>Add</span>
          <CornerDownLeft className="w-3 h-3" />
        </button>
      </div>
    </form>
  );
};
