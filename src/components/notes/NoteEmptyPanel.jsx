import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * NoteEmptyPanel — placeholder panel shown on desktop when no note is selected.
 *
 * Displayed in the right pane of the V2 two-panel layout whenever activeNote
 * is null. Provides contextual guidance to the user consistent with the
 * existing empty-state visual patterns in the application.
 *
 * @returns {JSX.Element}
 */
export default function NoteEmptyPanel() {
  return (
    <motion.div
      className="flex-1 flex flex-col items-center justify-center h-full bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-700/70"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.05, duration: 0.25 }}
        className="flex flex-col items-center text-center px-8 max-w-xs"
      >
        {/* Icon */}
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 mb-5">
          <Sparkles className="h-8 w-8 text-indigo-400 dark:text-indigo-300" />
        </div>

        {/* Heading */}
        <h2 className="text-base font-semibold text-slate-700 dark:text-slate-100 mb-2">
          Selecione uma nota
        </h2>

        {/* Subtext */}
        <p className="text-sm text-slate-400 dark:text-slate-400 leading-relaxed">
          Escolha uma nota na lista à esquerda, ou crie uma nova para começar.
        </p>

        {/* Keyboard hint */}
        <p className="mt-6 text-xs text-slate-300 dark:text-slate-500">
          Ctrl + N para nova nota
        </p>
      </motion.div>
    </motion.div>
  );
}
