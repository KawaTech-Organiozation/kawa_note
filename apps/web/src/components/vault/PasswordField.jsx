import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { copyWithAutoClear } from '@/lib/clipboard';
import PasswordGenerator from './PasswordGenerator';

/**
 * A password input with mask/reveal, copy-with-auto-clear, and optional generator.
 * Works both as a controlled editable field and as a read-only reveal field.
 *
 * @param {Object} props
 * @param {string} props.value
 * @param {(value: string) => void} [props.onChange]
 * @param {boolean} [props.readOnly]
 * @param {boolean} [props.showGenerator]
 * @param {boolean} [props.showCopy]
 * @param {string} [props.id]
 * @param {string} [props.placeholder]
 * @returns {JSX.Element}
 */
export default function PasswordField({
  value = '',
  onChange,
  readOnly = false,
  showGenerator = false,
  showCopy = true,
  id,
  placeholder = '••••••••••••'
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    const ok = await copyWithAutoClear(value);
    if (ok) {
      setCopied(true);
      toast.success('Senha copiada — será limpa da área de transferência em 20s');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Não foi possível copiar');
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        id={id}
        type={revealed ? 'text' : 'password'}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        placeholder={placeholder}
        autoComplete="new-password"
        className="font-mono"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setRevealed((r) => !r)}
        title={revealed ? 'Ocultar' : 'Revelar'}
        aria-label={revealed ? 'Ocultar senha' : 'Revelar senha'}
      >
        {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </Button>
      {showCopy && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          title="Copiar senha"
          aria-label="Copiar senha"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
        </Button>
      )}
      {showGenerator && onChange && (
        <PasswordGenerator onUse={onChange} />
      )}
    </div>
  );
}
