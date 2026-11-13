import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

/**
 * Bottom sheet on phones, centered dialog on larger screens. Built on native
 * <dialog>: focus trapping, Esc and an inert background come for free.
 */
export function Modal({ open, onClose, title, description, children, footer }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  const downOnBackdrop = useRef(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.classList.add('modal-open');
    } else if (!open && d.open) {
      d.close();
    }
    return () => document.documentElement.classList.remove('modal-open');
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        // Closes only when the press began AND ended on the backdrop: dragging a text selection
        // out of a field and releasing outside the panel must not discard what was typed.
        if (e.target === e.currentTarget && downOnBackdrop.current) onClose();
        downOnBackdrop.current = false;
      }}
    >
      {open && (
        <div className="modal__panel">
          <span className="modal__grabber" aria-hidden="true" />
          <div className="modal__head">
            <h2 id={titleId} className="modal__title">
              {title}
            </h2>
            <IconButton label="Закрити" onClick={onClose} tone="plain">
              <X size={20} />
            </IconButton>
          </div>
          {description && (
            <p id={descId} className="modal__desc">
              {description}
            </p>
          )}
          {children && <div className="modal__body">{children}</div>}
          {footer && <div className="modal__footer">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
