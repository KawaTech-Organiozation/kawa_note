import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * FAB - Floating Action Button para criar nova nota em mobile
 * Posicionado acima da BottomNav
 *
 * @param {Object}   props
 * @param {Function} props.onClick   - Callback ao clicar no FAB
 * @param {boolean}  props.elevated  - Se true, sobe para acomodar a MobileNoteStrip
 * @returns {JSX.Element} Floating action button
 */
export default function FAB({ onClick = () => {}, elevated = false }) {
  return (
    <Button
      onClick={onClick}
      className={`fixed right-4 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg md:hidden transition-all ${elevated ? 'bottom-32' : 'bottom-20'}`}
      aria-label="Nova nota"
    >
      <Plus className="w-6 h-6" />
    </Button>
  );
}
