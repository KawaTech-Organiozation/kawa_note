import { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, LogOut } from 'lucide-react';

/**
 * UnlockScreen Component
 * Displayed when user is authenticated but encryption key is not available in memory
 * (e.g., after page refresh). Allows user to re-derive encryption key by entering password.
 */
export function UnlockScreen() {
  const { user, unlock, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUnlock = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await unlock(password);
      if (!result.success) {
        if (result.error?.message === 'Encryption verifier not available for this user') {
          setError('Sua sessao precisa ser renovada. Clique em sair e entre novamente para validar sua senha.');
        } else {
          setError('Senha incorreta. Tente novamente.');
        }
        setPassword('');
      }
    } catch (err) {
      console.error('Unlock error:', err);
      setError('Erro ao desbloquear. Tente novamente.');
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout(true);
  };

  return (
    <div className="login-light fixed inset-0 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center z-50">
      {/* Shimmer effect during unlock */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
      )}

      <div className="relative w-full max-w-sm mx-4 bg-white rounded-lg shadow-2xl p-8">
        {/* Lock Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
          Kawa Note está bloqueado
        </h1>

        {/* Description */}
        <p className="text-center text-slate-600 text-sm mb-6">
          Por segurança, confirme sua senha para continuar acessando suas notas.
        </p>

        {/* User Info */}
        {user && (
          <div className="mb-6 p-3 bg-slate-50 rounded-lg text-center">
            <p className="text-sm text-slate-600">Conectado como</p>
            <p className="font-medium text-slate-900">{user.email}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          {/* Password Input */}
          <div className="space-y-1">
            <Label htmlFor="unlock-password" className="text-slate-700">
              Senha
            </Label>
            <Input
              id="unlock-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoFocus
              className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Unlock Button */}
          <Button
            type="submit"
            disabled={isLoading || !password}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? 'Desbloqueando...' : 'Desbloquear'}
          </Button>

          {/* Logout Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            disabled={isLoading}
            className="w-full border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </form>

        {/* Footer */}
        <p className="text-xs text-slate-500 text-center mt-6">
          Suas notas são criptografadas de ponta a ponta. Apenas você tem acesso ao conteúdo.
        </p>
      </div>
    </div>
  );
}
