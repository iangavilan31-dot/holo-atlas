import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  on?: boolean;
  primary?: boolean;
  danger?: boolean;
  dot?: boolean;
  children: ReactNode;
}

/** Instrument-grade control: uppercase Rajdhani, hairline cyan glass. */
export default function HButton({ on, primary, danger, dot, children, className, ...rest }: Props) {
  const cls = [
    'hbtn',
    primary ? 'hbtn--primary' : '',
    on ? 'hbtn--on' : '',
    danger ? 'hbtn--danger' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={cls} {...rest}>
      {dot && <span className="hbtn__dot" />}
      {children}
    </button>
  );
}
