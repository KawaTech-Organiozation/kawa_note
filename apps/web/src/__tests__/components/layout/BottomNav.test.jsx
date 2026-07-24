import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BottomNav from '@/components/layout/BottomNav';

describe('BottomNav', () => {
  it('renderiza as abas na ordem [Perfil, Busca, Cofre, Notas, Pastas]', () => {
    render(<BottomNav />);

    const labels = screen.getAllByRole('button').map((btn) => btn.textContent);
    expect(labels).toEqual(['Perfil', 'Busca', 'Cofre', 'Notas', 'Pastas']);
  });

  it('avisa qual aba foi tocada', async () => {
    const onTabChange = vi.fn();
    render(<BottomNav onTabChange={onTabChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Pastas' }));
    expect(onTabChange).toHaveBeenCalledWith('folders');

    await userEvent.click(screen.getByRole('button', { name: 'Cofre' }));
    expect(onTabChange).toHaveBeenCalledWith('vault');
  });

  it('marca a aba ativa para leitores de tela', () => {
    render(<BottomNav activeTab="vault" />);

    expect(screen.getByRole('button', { name: 'Cofre' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Notas' })).not.toHaveAttribute('aria-current');
  });
});
