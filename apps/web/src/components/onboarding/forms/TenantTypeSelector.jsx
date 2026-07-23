import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

/**
 * TenantTypeSelector Component
 * Allows user to select between Pessoa Física (PF) or Pessoa Jurídica (PJ)
 */
export function TenantTypeSelector({ value, onChange, disabled = false }) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">Tipo de Cadastro</Label>
        <p className="text-sm text-slate-500 mt-1">Selecione o tipo de pessoa para continuar</p>
      </div>

      <RadioGroup value={value || ''} onValueChange={onChange} disabled={disabled}>
        <div className="flex items-center space-x-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
          <RadioGroupItem value="FISICA" id="tipo-pf" />
          <Label htmlFor="tipo-pf" className="flex-1 cursor-pointer">
            <div className="font-medium">Pessoa Física</div>
            <p className="text-sm text-slate-500">Para profissionais autônomos e pessoas físicas</p>
          </Label>
        </div>

        <div className="flex items-center space-x-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
          <RadioGroupItem value="JURIDICA" id="tipo-pj" />
          <Label htmlFor="tipo-pj" className="flex-1 cursor-pointer">
            <div className="font-medium">Pessoa Jurídica</div>
            <p className="text-sm text-slate-500">Para empresas, associações e organizações</p>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
