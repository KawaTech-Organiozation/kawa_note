import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/providers/AuthContext';
import { useLogin } from '@/api/useAuth';
import { Eye, EyeOff, Shield, Smartphone, FolderOpen, Zap } from 'lucide-react';
import { KAWATECH_ASSETS, BRAND_NAMES } from '@/lib/brand';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
});

const benefits = [
  {
    icon: Shield,
    title: 'Criptografia de ponta a ponta',
    description: 'Suas anotações são criptografadas localmente. Só você tem acesso ao conteúdo.',
  },
  {
    icon: Smartphone,
    title: 'Acesse de qualquer lugar',
    description: 'Funciona perfeitamente no celular, tablet ou computador.',
  },
  {
    icon: FolderOpen,
    title: 'Organização completa',
    description: 'Pastas, subpastas e busca inteligente para encontrar tudo rapidamente.',
  },
  {
    icon: Zap,
    title: 'Sempre disponível',
    description: 'Sincronização em tempo real para suas notas estarem sempre atualizadas.',
  },
];

export default function Login() {
  const navigate = useNavigate();
  const { checkAppState } = useAuth();
  const loginMutation = useLogin();
  const [apiError, setApiError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data) => {
    setApiError(null);

    try {
      console.log('🔐 Attempting login with:', data.email);
      const response = await loginMutation.mutateAsync(data);
      console.log('✅ Login response:', response);

      console.log('🔄 Updating auth context...');
      await checkAppState();

      console.log('🚀 Redirecting to home...');
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 100);
    } catch (error) {
      console.error('❌ Login error:', error);
      const msg = error.message || '';
      if (error.status === 401) {
        setApiError('Email ou senha inválidos');
      } else if (msg.includes('Web Crypto') || msg.includes('contexto seguro') || msg.includes('importKey') || msg.includes('subtle')) {
        setApiError('A criptografia exige um contexto seguro. Abra o app por http://localhost:3116 ou http://127.0.0.1:3116 (ou HTTPS) — endereços como 0.0.0.0 ou IP por http não funcionam.');
      } else if (msg.includes('Encryption key')) {
        setApiError('Erro ao inicializar encriptação. Tente novamente.');
      } else {
        setApiError(error.data?.message || error.data?.error?.message || msg || 'Erro ao fazer login');
      }
    }
  };

  return (
    <div className="login-light min-h-screen flex">
      {/* Left side - form */}
      <div className="flex-1 flex items-center justify-center bg-white px-8 py-12 lg:px-16">
        <div className="w-full max-w-sm">
          {/* Marca — fundo branco, portanto LOGO-POSITIVO (asset oficial) */}
          <div className="mb-8">
            <img
              src={KAWATECH_ASSETS.logoPositivo}
              alt="KawaTech"
              className="h-9 w-auto mb-3"
              width="160"
              height="36"
            />
            <h1 className="text-2xl font-bold text-kawatech-primary">{BRAND_NAMES.appName}</h1>
            <p className="text-sm text-slate-500 mt-1">Notas seguras com criptografia</p>
          </div>

          {/* Form header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Informe seus dados abaixo</h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="email">
                E-mail <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register('email')}
                disabled={loginMutation.isPending}
                className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <Label htmlFor="password">
                Senha <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  disabled={loginMutation.isPending}
                  className="pr-10 bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Forgot password */}
            <div>
              <button
                type="button"
                className="text-sm text-blue-600 hover:underline"
                onClick={() => {}}
              >
                Esqueci minha senha
              </button>
            </div>

            {/* API error */}
            {apiError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {apiError}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
            </Button>

            {/* Register link */}
            <div className="text-center">
              <a
                href="/onboarding"
                className="text-sm text-blue-600 font-medium hover:underline"
              >
                Quero me cadastrar
              </a>
            </div>
          </form>
        </div>
      </div>

      {/* Right side - marketing panel (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-800 to-blue-500 flex-col justify-center px-12 xl:px-20 py-12 text-white">
        <div className="max-w-md">
          {/* Headline */}
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Suas notas.{' '}
            <span className="text-blue-200">Seguras.</span>{' '}
            Sempre.
          </h2>
          <p className="text-blue-100 text-base mb-10 leading-relaxed">
            — o bloco de notas que protege seu conteúdo com criptografia de ponta a ponta, para que só você tenha acesso ao que escreve.
          </p>

          {/* Benefits list */}
          <ul className="space-y-6 mb-12">
            {benefits.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                  <Icon size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-blue-200 text-sm mt-0.5 leading-relaxed">{description}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* CTA button */}
          <a href="/onboarding">
            <button className="w-full border border-white/60 text-white rounded-md py-3 px-6 text-sm font-medium hover:bg-white/10 transition-colors">
              Criar conta grátis
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}
