import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { PhoneInput } from '@/components/ui/masked';

/**
 * Password strength checker
 */
const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  const levels = [
    { score: 0, label: '', color: '' },
    { score: 1, label: 'Fraca', color: 'bg-red-500' },
    { score: 2, label: 'Fraca', color: 'bg-red-500' },
    { score: 3, label: 'Média', color: 'bg-yellow-500' },
    { score: 4, label: 'Boa', color: 'bg-blue-500' },
    { score: 5, label: 'Forte', color: 'bg-green-500' },
    { score: 6, label: 'Muito Forte', color: 'bg-green-600' }
  ];
  
  return levels[Math.min(score, 6)];
};

/**
 * UserForm Component
 * Form for user credentials during onboarding
 */
export function UserForm() {
  const { register, control, formState: { errors }, watch } = useFormContext();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const nameValue = watch('name');
  const emailValue = watch('email');
  const phoneValue = watch('phone');
  const passwordValue = watch('password');
  const confirmPasswordValue = watch('confirmPassword');
  
  const passwordStrength = getPasswordStrength(passwordValue);
  const passwordsMatch = !passwordValue || !confirmPasswordValue || passwordValue === confirmPasswordValue;

  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <Label htmlFor="name">Nome Completo *</Label>
        <Input
          id="name"
          placeholder="João Silva"
          {...register('name')}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          {...register('email')}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && (
          <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>

      {/* Phone */}
      <PhoneInput
        name="phone"
        control={control}
        error={errors.phone}
      />

      {/* Password */}
      <div>
        <Label htmlFor="password">Senha *</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Digite sua senha"
            {...register('password')}
            className={errors.password ? 'border-red-500' : ''}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
        )}
        
        {/* Password Strength Indicator */}
        {passwordValue && (
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${passwordStrength.color}`}
                  style={{ width: `${(Math.min(passwordValue.length, 20) / 20) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-slate-600">
                {passwordStrength.label}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Mínimo 8 caracteres, com letras maiúsculas, minúsculas e números
            </p>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirme sua senha"
            {...register('confirmPassword')}
            className={errors.confirmPassword || !passwordsMatch ? 'border-red-500' : ''}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>
        )}
        {!passwordsMatch && confirmPasswordValue && (
          <p className="text-sm text-red-500 mt-1">As senhas não coincidem</p>
        )}
      </div>
    </div>
  );
}
