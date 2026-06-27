import { type ComponentType } from 'react';
import * as LucideIcons from 'lucide-react';

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

interface LucideComponentProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
  'aria-hidden'?: boolean;
}

/** Convert a kebab-case Lucide name (e.g. `phone-call`) to PascalCase (`PhoneCall`). */
function pascal(name: string): string {
  return String(name).replace(/(^|-)([a-z0-9])/g, (_, __, c: string) => c.toUpperCase());
}

const icons = LucideIcons as unknown as Record<string, ComponentType<LucideComponentProps>>;

/**
 * Lucide icon rendered via the `lucide-react` package. The kebab-case `name`
 * is mapped to its PascalCase component; an empty `<svg>` is rendered when the
 * name is not found so layout never shifts.
 */
export function Icon({
  name,
  size = 16,
  color = 'currentColor',
  strokeWidth = 2,
  style = {},
  ...rest
}: IconProps) {
  const LucideComponent = icons[pascal(name)];
  const composedStyle: React.CSSProperties = {
    display: 'inline-block',
    flex: 'none',
    ...style,
  };

  if (!LucideComponent) {
    return <svg width={size} height={size} viewBox="0 0 24 24" style={composedStyle} aria-hidden />;
  }

  return (
    <LucideComponent
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      style={composedStyle}
      aria-hidden
      {...rest}
    />
  );
}
