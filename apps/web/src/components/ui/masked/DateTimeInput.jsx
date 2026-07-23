import { MaskedInput } from './MaskedInput';

export function DateTimeInput({ label = 'Data e Hora', placeholder = 'DD/MM/AAAA HH:mm', ...props }) {
  return (
    <MaskedInput
      {...props}
      label={label}
      placeholder={placeholder}
      mask="00/00/0000 00:00"
      unmask={false} // Mantém formato DD/MM/YYYY HH:mm
    />
  );
}
