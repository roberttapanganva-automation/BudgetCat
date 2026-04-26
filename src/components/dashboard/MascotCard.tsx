import { Heart, Sparkles } from "lucide-react";
import { BudgetCatMascot } from "../mascot/BudgetCatMascot";
import { Card } from "../ui/Card";

export function MascotCard() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="relative p-5">
        <div className="absolute right-4 top-4 rounded-full bg-budget-cat/15 p-2 text-budget-cat">
          <Sparkles size={18} />
        </div>
        <p className="text-sm font-black uppercase text-budget-primary">
          BudgetCat reminder
        </p>
        <h2 className="mt-2 max-w-sm text-2xl font-black leading-tight text-budget-text">
          Bonnie and Clyde are watching the treats budget.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-budget-text/65">
          You still have a calm amount left this month. Keep manual entries light
          and consistent.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-lg border border-budget-border bg-budget-background p-4">
            <BudgetCatMascot className="mx-auto grid h-20 w-20 place-items-center" variant="bonnie" />
            <p className="mt-3 text-center text-sm font-black">Bonnie</p>
            <p className="text-center text-xs font-semibold text-budget-text/55">
              White cat
            </p>
          </div>
          <div className="rounded-lg border border-budget-border bg-budget-background p-4">
            <BudgetCatMascot className="mx-auto grid h-20 w-20 place-items-center" variant="clyde" />
            <p className="mt-3 text-center text-sm font-black">Clyde</p>
            <p className="text-center text-xs font-semibold text-budget-text/55">
              Orange cat
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-lg bg-budget-primary/10 px-4 py-3 text-sm font-semibold text-budget-text">
          <Heart className="text-budget-primary" size={18} />
          Small habits count. One clean entry at a time.
        </div>
      </div>
    </Card>
  );
}
