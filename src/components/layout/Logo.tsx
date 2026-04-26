export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-lg bg-budget-primary text-lg font-black text-white shadow-button">
        BC
      </div>
      <div>
        <p className="text-lg font-black leading-tight text-budget-text">BudgetCat</p>
        <p className="text-xs font-semibold text-budget-text/55">Bonnie & Clyde</p>
      </div>
    </div>
  );
}
