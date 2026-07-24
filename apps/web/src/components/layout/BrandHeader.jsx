import { useState } from 'react';
import { cn } from '@/lib/utils';
import { KAWATECH_ASSETS, BRAND_NAMES } from '@/lib/brand';

/**
 * BrandHeader — bloco de marca KawaTech, fonte única para Notas e Cofre.
 *
 * Existe porque o bloco nasceu inline na Sidebar de Notas e o Cofre, criado
 * depois, acabou com um cabeçalho próprio sem marca nenhuma. Divergência de
 * marca entre telas é o tipo de coisa que só some quando existe um componente.
 *
 * Marca sobre a cor primária (#282b5f): fundo escuro exige o ÍCONE NEGATIVO,
 * conforme a regra de escolha do asset em `lib/brand.js`.
 *
 * @param {Object} props
 * @param {string} [props.section] - Rótulo da área ("Cofre"). Omitido em Notas.
 * @param {boolean} [props.isCollapsed=false] - Exibe apenas o ícone.
 * @param {string} [props.className] - Classes extras do container.
 * @returns {JSX.Element}
 */
export default function BrandHeader({ section, isCollapsed = false, className }) {
  // O asset é remoto (MinIO). Se ele não carregar, a marca sumia de toda a UI
  // sem deixar nada no lugar; o monograma mantém o quadrado preenchido e o
  // layout estável.
  const [assetFailed, setAssetFailed] = useState(false);

  const mark = (
    <div className="h-8 w-8 shrink-0 rounded-lg bg-kawatech-primary flex items-center justify-center overflow-hidden">
      {assetFailed ? (
        <span aria-hidden="true" className="text-sm font-bold text-white">K</span>
      ) : (
        /* width/height explícitos: a imagem remota não pode empurrar o layout
           enquanto carrega (CLS é critério de HALT da governança). */
        <img
          src={KAWATECH_ASSETS.iconeNegativo}
          alt="KawaTech"
          className="h-5 w-5 object-contain"
          width="20"
          height="20"
          onError={() => setAssetFailed(true)}
        />
      )}
    </div>
  );

  if (isCollapsed) {
    return (
      <div className={cn('flex items-center justify-center', className)} title={BRAND_NAMES.appName}>
        {mark}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {mark}
      <div className="min-w-0">
        <h1 className="font-bold text-foreground truncate">{BRAND_NAMES.appName}</h1>
        {section && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{section}</p>
        )}
      </div>
    </div>
  );
}
