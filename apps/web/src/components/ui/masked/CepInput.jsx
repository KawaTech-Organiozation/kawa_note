import { MaskedInput } from './MaskedInput';

/**
 * @param {Object} props
 * @param {string} [props.placeholder='00000-000']
 * @param {string} props.name - Nome do campo no formulário
 * @param {any} props.control - Controle do React Hook Form
 * @param {any} [props.error] - Erro de validação
 */
export function CepInput({ placeholder = '00000-000', error, ...props }) {
  return (
    <MaskedInput
      {...props}
      placeholder={placeholder}
      mask="00000-000"
      unmask={true}
      error={error}
    />
  );
}
