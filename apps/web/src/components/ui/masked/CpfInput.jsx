import { MaskedInput } from './MaskedInput';

export function CpfInput({ label = 'CPF', placeholder = '000.000.000-00', ...props }) {
  return (
    <MaskedInput
      {...props}
      label={label}
      placeholder={placeholder}
      mask="000.000.000-00"
      unmask
    />
  );
}
