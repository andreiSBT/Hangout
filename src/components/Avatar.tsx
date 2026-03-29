"use client";

type Props = {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZES = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-16 h-16 sm:w-20 sm:h-20 text-2xl sm:text-3xl",
  xl: "w-20 h-20 text-3xl",
};

export default function Avatar({ src, name, size = "sm", className = "" }: Props) {
  const letter = name?.[0]?.toUpperCase() ?? "?";

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? "Avatar"}
        className={`${SIZES[size]} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${SIZES[size]} rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold ${className}`}
    >
      {letter}
    </div>
  );
}
