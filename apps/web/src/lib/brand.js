/**
 * Marca KawaTech — fonte única dos assets e cores institucionais.
 *
 * Decisão registrada (AGENTE_FIXER_IdentidadeVisual, 2026-07-23):
 * `Tema KawaTech = Sim`, aplicação institucional. O Kawa Note passa a exibir a
 * marca KawaTech; a paleta teal/cyan e o `logo.svg` locais foram aposentados.
 *
 * Os PNGs são consumidos por URL oficial, sem download, base64 ou raster
 * embutido em SVG — conforme as regras de uso da marca.
 */

/** Assets oficiais (MinIO público, não exigem credencial). */
export const KAWATECH_ASSETS = {
  /** Fundos claros/brancos. */
  logoPositivo: 'https://minio-api.kawatech.com.br/kawatech/logos/Logo-Positivo.png',
  /** Fundos escuros, #282b5f, header, sidebar, login, rodapé. */
  logoNegativo: 'https://minio-api.kawatech.com.br/kawatech/logos/Logo-Negativo.png',
  /** Favicon/app icon e espaços quadrados em fundo claro. */
  iconePositivo: 'https://minio-api.kawatech.com.br/kawatech/logos/Icone-positivo.png',
  /** Favicon/app icon e espaços quadrados em fundo escuro/primário. */
  iconeNegativo: 'https://minio-api.kawatech.com.br/kawatech/logos/Icone-negativo.png'
};

/** Host dos assets — precisa constar em CSP/allowlist de imagem remota. */
export const KAWATECH_ASSET_HOST = 'minio-api.kawatech.com.br';

/** Paleta institucional KawaTech. */
export const KAWATECH_COLORS = {
  /** Header, Sidebar, LoginPage e botões primários. */
  primary: '#282b5f',
  /** Títulos e chamadas de atenção sobre fundo branco. */
  secondary: '#d2314b',
  background: '#ffffff'
};

/** Nomes de exposição (inferidos dos artefatos existentes e registrados). */
export const BRAND_NAMES = {
  /** Exibido dentro da aplicação. */
  appName: 'Kawa Note',
  /** title, description, Open Graph, Twitter Cards e JSON-LD. */
  seoName: 'Kawa Note — Notas criptografadas e cofre de senhas',
  /** Links, slug, manifest e compartilhamento. */
  slug: 'kawa-note'
};
