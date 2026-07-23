import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CpfInput, PhoneInput, EmailInput } from '@/components/ui/masked';

/**
 * PFForm Component
 * Form for Pessoa Física (Individual) registration
 */
export function PFForm() {
  const { register, control, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="fullName">Nome Completo *</Label>
        <Input
          id="fullName"
          placeholder="João Silva Santos"
          {...register('fullName')}
          className={errors.fullName ? 'border-red-500' : ''}
        />
        {errors.fullName && (
          <p className="text-sm text-red-500 mt-1">{errors.fullName.message}</p>
        )}
      </div>

      <CpfInput
        name="document"
        control={control}
        error={errors.document}
      />

      <div className="grid grid-cols-2 gap-4">
        <PhoneInput
          name="phone"
          control={control}
          label="Telefone"
          error={errors.phone}
        />

        <PhoneInput
          name="mobilePhone"
          control={control}
          label="Celular"
          error={errors.mobilePhone}
        />
      </div>

      <EmailInput
        name="email"
        control={control}
        placeholder="joao@example.com"
        error={errors.email}
      />
    </div>
  );
}
