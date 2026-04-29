import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../../utils/cn';

interface DropdownItem {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  icon?: any;
}

interface ActionMenuProps {
  items: DropdownItem[];
  align?: 'left' | 'right';
}

export function ActionMenu({ items, align = 'right' }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && 
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: align === 'right' ? rect.right - 192 : rect.left // 192 is w-48
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button 
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          toggleMenu();
        }}
        className="p-2 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <MoreHorizontal size={18} />
      </button>

      {isOpen && createPortal(
        <div 
          ref={menuRef}
          style={{ top: coords.top, left: coords.left }}
          className={cn(
            "fixed z-[9999] mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-1 animate-in fade-in zoom-in duration-100"
          )}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
                setIsOpen(false);
              }}
              className={cn(
                "w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors",
                item.variant === 'danger' ? "text-red-600 hover:bg-red-50" : "text-slate-700"
              )}
            >
              {item.icon && <item.icon size={14} />}
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
