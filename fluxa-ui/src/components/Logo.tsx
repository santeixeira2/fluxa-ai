import logoSrc from '../assets/logo.png';

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = '', size = 28 }: LogoProps) {
  return (
    <img
      src={logoSrc}
      alt="Kuant"
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
      style={{ objectFit: 'cover' }}
    />
  );
}
