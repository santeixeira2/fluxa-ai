interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = '', size = 28 }: LogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="100" height="100" rx="25" className="fill-black dark:fill-white" />
      <path 
        d="M38 30 H68 V42 H38 V48 H58 V60 H38 V70 H25 V30 Z" 
        className="fill-white dark:fill-black" 
      />
      <circle cx="70" cy="65" r="5" className="fill-white dark:fill-black" />
    </svg>
  );
}
