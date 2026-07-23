import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CepInput } from '@/components/ui/masked';
import { Search, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const BRAZILIAN_STATES = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'TO', name: 'Tocantins' }
];

// Consulta de CEP KawaTech. A variável oficial do padrão é
// KAWATECH_POSTAL_CODE_URL (https://postalcode.furukawatech.com.br/api); no
// frontend ela precisa do prefixo VITE_ para ser exposta pelo Vite, então o
// valor é injetado em VITE_CEP_API_URL no build/deploy.
const CEP_API_URL = import.meta.env.VITE_CEP_API_URL?.startsWith('http') ? import.meta.env.VITE_CEP_API_URL : null;

// Consulta de CEP é conveniência: nunca pode travar o cadastro. Passado o
// tempo limite, o usuário segue preenchendo o endereço à mão.
const CEP_TIMEOUT_MS = 8000;

/**
 * AddressForm Component
 * Formulário de endereço com busca de CEP via API própria
 */
export function AddressForm() {
  const { register, control, formState: { errors }, watch, setValue } = useFormContext();
  const stateValue = watch('state');
  const zipCodeValue = watch('zipCode');
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState(null);

  /**
   * Busca endereço via API própria (VITE_CEP_API_URL) quando CEP é preenchido
   * @requires CEP com 8 dígitos numéricos (sem máscara)
   */
  const fetchAddressFromCep = async (cep) => {
    const cleanCep = (cep || '').replace(/\D/g, '');
    if (!/^\d{8}$/.test(cleanCep)) return;

    if (!CEP_API_URL) {
      setCepError('API de CEP não configurada');
      return;
    }

    // Formato padrão XXXXX-XXX exigido pela API própria
    const formattedCep = `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`;

    setLoadingCep(true);
    setCepError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CEP_TIMEOUT_MS);

    try {
      const response = await fetch(`${CEP_API_URL}/${formattedCep}`, { signal: controller.signal });
      if (!response.ok) {
        setCepError('CEP não encontrado');
        return;
      }
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setCepError('Erro ao buscar CEP');
        return;
      }
      const data = await response.json();
      if (!data || !data.city) {
        setCepError('CEP não encontrado');
        return;
      }

      // `state` guarda a UF: a coluna é VarChar(2) e o schema Zod exige 2
      // caracteres, então o nome por extenso não cabe aqui — ele só aparece no
      // rótulo do select. Normalizamos para maiúsculas por garantia.
      const uf = String(data.stateCode || '').trim().toUpperCase();

      // number e complement são preservados de propósito: são digitados pelo
      // usuário e a consulta de CEP não os conhece.
      setValue('street', data.addressLine || '');
      setValue('district', data.district || '');
      setValue('city', data.city || '');
      setValue('state', uf);
    } catch (error) {
      if (error?.name === 'AbortError') {
        setCepError('Busca de CEP demorou demais. Preencha o endereço manualmente.');
      } else {
        console.error('Error fetching CEP:', error);
        setCepError('Erro ao buscar CEP');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoadingCep(false);
    }
  };

  const handleSearchCep = () => {
    fetchAddressFromCep(zipCodeValue);
  };

  return (
    <div className="space-y-4">
      {/* Linha 1: CEP + BOTÃO BUSCA + RUA */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        <div className="md:col-span-1 space-y-2">
          <Label htmlFor="zipCode">CEP</Label>
          <div className="flex gap-2">
            <CepInput
              name="zipCode"
              control={control}
              error={errors.zipCode}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleSearchCep}
              disabled={loadingCep || !zipCodeValue || zipCodeValue.replace(/\D/g, '').length !== 8}
              className="shrink-0"
              aria-label="Buscar CEP"
            >
              {loadingCep
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Search className="w-4 h-4" />
              }
            </Button>
          </div>
          {cepError && (
            <p className="text-sm text-amber-600">{cepError}</p>
          )}
        </div>

        <div className="md:col-span-3 space-y-2">
          <Label htmlFor="street">Rua *</Label>
          <Input
            id="street"
            placeholder="Rua das Flores"
            {...register('street')}
            className={errors.street ? 'border-red-500' : ''}
          />
          {errors.street && (
            <p className="text-sm text-red-500">{errors.street.message}</p>
          )}
        </div>
      </div>

      {/* Linha 2: NÚMERO + COMPLEMENTO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        <div className="md:col-span-1 space-y-2">
          <Label htmlFor="number">Número *</Label>
          <Input
            id="number"
            placeholder="123"
            {...register('number')}
            className={errors.number ? 'border-red-500' : ''}
          />
          {errors.number && (
            <p className="text-sm text-red-500">{errors.number.message}</p>
          )}
        </div>

        <div className="md:col-span-3 space-y-2">
          <Label htmlFor="complement">Complemento</Label>
          <Input
            id="complement"
            placeholder="Apto 456, Bloco B"
            {...register('complement')}
            className={errors.complement ? 'border-red-500' : ''}
          />
          {errors.complement && (
            <p className="text-sm text-red-500">{errors.complement.message}</p>
          )}
        </div>
      </div>

      {/* Linha 3: BAIRRO + CIDADE + ESTADO */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="district">Bairro *</Label>
          <Input
            id="district"
            placeholder="Centro"
            {...register('district')}
            className={errors.district ? 'border-red-500' : ''}
          />
          {errors.district && (
            <p className="text-sm text-red-500">{errors.district.message}</p>
          )}
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="city">Cidade *</Label>
          <Input
            id="city"
            placeholder="São Paulo"
            {...register('city')}
            className={errors.city ? 'border-red-500' : ''}
          />
          {errors.city && (
            <p className="text-sm text-red-500">{errors.city.message}</p>
          )}
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="state">Estado *</Label>
          <Select value={stateValue || ''} onValueChange={(value) => setValue('state', value)}>
            <SelectTrigger id="state" className={errors.state ? 'border-red-500' : ''}>
              <SelectValue placeholder="Selecione o estado" />
            </SelectTrigger>
            <SelectContent>
              {BRAZILIAN_STATES.map((state) => (
                <SelectItem key={state.code} value={state.code}>
                  {state.name} ({state.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.state && (
            <p className="text-sm text-red-500">{errors.state.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
