import type { ButtonHTMLAttributes } from 'react';
import styles from './PixelButton.module.css';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** "primary" is the amber call to action; "ghost" is the quiet slate button. */
  variant?: 'primary' | 'ghost';
  size?: 'normal' | 'small';
}

export function PixelButton({ variant = 'primary', size = 'normal', className, type = 'button', ...rest }: PixelButtonProps) {
  const classes = [styles.btn, variant === 'ghost' && styles.ghost, size === 'small' && styles.small, className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...rest} />;
}
