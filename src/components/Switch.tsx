import type { ReactElement } from 'react';
import './switch.css';

interface SwitchProps {
  on: boolean;
  label: string;
  onChange(on: boolean): void;
}

export function Switch({ on, label, onChange }: SwitchProps): ReactElement {
  return (
    <button
      type="button"
      className="switch"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
    >
      <span className="switch-knob" />
    </button>
  );
}
