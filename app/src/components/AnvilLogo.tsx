export function AnvilLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/favicon.svg"
      alt="Anvil Protocol"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}
