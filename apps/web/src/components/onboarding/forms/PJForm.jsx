import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CnpjInput, IeInput, PhoneInput, EmailInput } from '@/components/ui/masked';

/**
 * PJForm Component
 * Form for Pessoa Jurídica (Company) registration
 */
export function PJForm() {
  const { register, control, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="tradeName">Razão Social *</Label>
        <Input
          id="tradeName"
          placeholder="Empresa LTDA"
          {...register('tradeName')}
          className={errors.tradeName ? 'border-red-500' : ''}
        />
        {errors.tradeName && (
          <p className="text-sm text-red-500 mt-1">{errors.tradeName.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <CnpjInput
          name="document"
          control={control}
          error={errors.document}
        />

        <IeInput
          name="fiscalNumber"
          control={control}
          error={errors.fiscalNumber}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="responsibleName">Nome do Responsável *</Label>
          <Input
            id="responsibleName"
            placeholder="João Silva"
            {...register('responsibleName')}
            className={errors.responsibleName ? 'border-red-500' : ''}
          />
          {errors.responsibleName && (
            <p className="text-sm text-red-500 mt-1">{errors.responsibleName.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="responsiblePosition">Cargo *</Label>
          <Input
            id="responsiblePosition"
            placeholder="Diretor"
            {...register('responsiblePosition')}
            className={errors.responsiblePosition ? 'border-red-500' : ''}
          />
          {errors.responsiblePosition && (
            <p className="text-sm text-red-500 mt-1">{errors.responsiblePosition.message}</p>
          )}
        </div>
      </div>

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

      <div className="grid grid-cols-2 gap-4">
        <EmailInput
          name="email"
          control={control}
          placeholder="empresa@example.com"
          error={errors.email}
        />

        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://example.com"
            {...register('website')}
            className={errors.website ? 'border-red-500' : ''}
          />
          {errors.website && (
            <p className="text-sm text-red-500 mt-1">{errors.website.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
