import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function EmailInput({ 
  name, 
  control, 
  label = 'Email', 
  placeholder = 'email@example.com',
  error,
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
          <Input
            {...field}
            {...props}
            id={name}
            type="email"
            placeholder={placeholder}
            disabled={disabled}
            className={error ? 'border-red-500' : className}
          />
        )}
      />
      {error && (
        <p className="text-sm text-red-500 mt-1">{error.message}</p>
      )}
    </div>
  );
}
