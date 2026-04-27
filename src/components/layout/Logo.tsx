import { BudgetCatMascot } from "../mascot/BudgetCatMascot";

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <BudgetCatMascot
        imageClassName="h-9 w-9 rounded-lg"
        variant="icon"
      />
      <div>
        <p className="text-[15px] font-black leading-tight text-budget-text">BudgetCat</p>
        <p className="text-[11px] font-semibold text-budget-text/50">Bonnie & Clyde</p>
      </div>
    </div>
  );
}
