import { Controller } from 'react-hook-form';
import { IMaskInput } from 'react-imask';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * MaskedInput - Componente base para inputs com máscara
 * Integra IMask com React Hook Form
 * 
 * @param {Object} props
 * @param {string} props.name - Nome do campo
 * @param {any} props.control - Controle do React Hook Form
 * @param {string} [props.label] - Label do campo
 * @param {any} [props.error] - Erro de validação
 * @param {string|Array} props.mask - Máscara do IMask
 * @param {boolean} [props.unmask=true] - Se deve remover a máscara do valor armazenado
 * @param {string} [props.placeholder] - Placeholder
 * @param {boolean} [props.disabled=false] - Se o campo está desabilitado
 * @param {string} [props.className=''] - Classes CSS adicionais
 */
export function MaskedInput({
  name,
  control,
  label,
  error = null,
  mask,
  unmask = true,
  placeholder,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className="space-y-2">
      {label && <Label htmlFor={name}>{label}</Label>}
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <IMaskInput
            {...field}
            {...props}
            id={name}
            mask={mask}
            unmask={unmask}
            placeholder={placeholder}
            disabled={disabled}
            value={field.value || ''}
            onAccept={(_value, maskRef) => {
              // Salva o valor sem máscara no form (somente dígitos/chars válidos)
              field.onChange(maskRef.unmaskedValue);
            }}
            onBlur={() => {
              field.onBlur();
            }}
            className={cn(
              'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base text-foreground caret-foreground shadow-sm transition-colors',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
              error ? 'border-red-500' : '',
              className
            )}
          />
        )}
      />
      {error && (
        <p className="text-sm text-red-500 mt-1">{error.message}</p>
      )}
    </div>
  );
}
