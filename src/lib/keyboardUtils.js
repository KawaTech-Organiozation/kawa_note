/**
 * keyboardUtils.js — Utilitários de contexto de foco para atalhos de teclado.
 *
 * Provê guards para evitar que handlers globais de teclado (window keydown)
 * interfiram com inputs, textareas e elementos editáveis focados.
 */

/**
 * Verifica se o foco atual está dentro de um elemento de entrada de texto.
 * Usado como guard nos handlers globais de teclado para evitar conflitos.
 *
 * @returns {boolean} true se textarea, input, select ou contentEditable está focado
 */
export function isFocusInTextInput() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  const isContentEditable = el.contentEditable === 'true';
  return ['textarea', 'input', 'select'].includes(tag) || isContentEditable;
}
