import { MaskedInput } from './MaskedInput';

export function DateInput({ label = 'Data', placeholder = 'DD/MM/AAAA', ...props }) {
  return (
    <MaskedInput
      {...props}
      label={label}
      placeholder={placeholder}
      mask="00/00/0000"
      unmask={false} // Mantém formato DD/MM/YYYY
    />
  );
}
