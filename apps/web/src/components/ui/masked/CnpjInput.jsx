import { MaskedInput } from './MaskedInput';

export function CnpjInput({ label = 'CNPJ', placeholder = '00.000.000/0000-00', ...props }) {
  return (
    <MaskedInput
      {...props}
      label={label}
      placeholder={placeholder}
      mask="00.000.000/0000-00"
      unmask
    />
  );
}
