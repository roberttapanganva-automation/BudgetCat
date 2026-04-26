import { useState } from "react";

type MascotVariant = "bonnie" | "clyde" | "both";

const imagePaths: Record<MascotVariant, string> = {
  bonnie: "/assets/bonnie.png",
  clyde: "/assets/clyde.png",
  both: "/assets/bonnie-clyde.png",
};

const labels: Record<MascotVariant, string> = {
  bonnie: "Bonnie",
  clyde: "Clyde",
  both: "Bonnie and Clyde",
};

function FallbackMascot({ variant }: { variant: MascotVariant }) {
  if (variant === "both") {
    return (
      <div className="flex -space-x-2">
        <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-budget-card bg-white text-xl shadow-soft">
          B
        </span>
        <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-budget-card bg-budget-cat/25 text-xl shadow-soft">
          C
        </span>
      </div>
    );
  }

  return (
    <span
      className={
        variant === "bonnie"
          ? "grid h-11 w-11 place-items-center rounded-full border-2 border-budget-card bg-white text-lg font-black text-budget-text shadow-soft"
          : "grid h-11 w-11 place-items-center rounded-full border-2 border-budget-card bg-budget-cat/25 text-lg font-black text-budget-cat shadow-soft"
      }
    >
      {variant === "bonnie" ? "B" : "C"}
    </span>
  );
}

export function BudgetCatMascot({
  className = "",
  variant = "both",
}: {
  className?: string;
  variant?: MascotVariant;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div aria-label={labels[variant]} className={className} title={labels[variant]}>
      {!imageFailed ? (
        <img
          alt={labels[variant]}
          className="h-14 w-14 rounded-full border-2 border-budget-card object-cover shadow-soft"
          onError={() => setImageFailed(true)}
          src={imagePaths[variant]}
        />
      ) : (
        <FallbackMascot variant={variant} />
      )}
    </div>
  );
}
