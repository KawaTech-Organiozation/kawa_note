import { MaskedInput } from './MaskedInput';

export function IeInput({ label = 'Inscrição Estadual', placeholder = '000.000.000.000', ...props }) {
  return (
    <MaskedInput
      {...props}
      label={label}
      placeholder={placeholder}
      mask="000.000.000.000"
      unmask
    />
  );
}
