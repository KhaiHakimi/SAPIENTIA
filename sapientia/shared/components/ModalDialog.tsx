'use client';

import { useEffect, useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import styles from './ModalDialog.module.css';

interface ModalDialogProps {
  open: boolean;
  /** Called however the dialog closes (Esc, a close button, the backdrop), so the parent can update its state. */
  onClose: () => void;
  /** With no padding on the dialog, a click on the dialog element itself is a click on the backdrop. */
  closeOnBackdrop?: boolean;
  className?: string;
  labelledBy?: string;
  describedBy?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLDialogElement>) => void;
  onClick?: (event: MouseEvent<HTMLDialogElement>) => void;
  children: ReactNode;
}

/** A native modal <dialog>: focus trapping, Esc and the backdrop come from the browser. */
export function ModalDialog({ open, onClose, closeOnBackdrop = false, className, labelledBy, describedBy, onKeyDown, onClick, children }: ModalDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={[styles.dialog, className].filter(Boolean).join(' ')}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClose={onClose}
      onKeyDown={onKeyDown}
      onClick={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) event.currentTarget.close();
        onClick?.(event);
      }}
    >
      {open && children}
    </dialog>
  );
}
