export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-budget-primary font-display text-sm font-black text-white shadow-button">
        BC
      </div>
      <div>
        <p className="text-[15px] font-black leading-tight text-budget-text">BudgetCat</p>
        <p className="text-[11px] font-semibold text-budget-text/50">Bonnie & Clyde</p>
      </div>
    </div>
  );
}
