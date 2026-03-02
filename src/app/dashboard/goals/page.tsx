import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getGoals } from "@/db/queries/goals";
import { getCurrentUserId } from "@/lib/auth";
import { getUserBaseCurrency } from "@/db/queries/onboarding";
import { formatCurrency } from "@/lib/formatCurrency";
import { GoalFormDialog } from "@/components/GoalFormDialog";
import { ContributeGoalDialog } from "@/components/ContributeGoalDialog";
import { DeleteGoalButton } from "@/components/DeleteGoalButton";
import { Trophy } from "lucide-react";

export default async function GoalsPage() {
  const userId = await getCurrentUserId();
  const [goals, baseCurrency] = await Promise.all([
    getGoals(userId),
    getUserBaseCurrency(userId),
  ]);

  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.saved_amount, 0);
  const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  // Precompute days-left for each goal (server component, runs once per request)
  const nowMs = new Date().getTime();
  const daysLeftMap = new Map<string, number | null>();
  for (const g of goals) {
    if (g.target_date) {
      const diff = new Date(g.target_date).getTime() - nowMs;
      daysLeftMap.set(g.id, Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))));
    } else {
      daysLeftMap.set(g.id, null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Savings Goals</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Set targets and track your progress towards financial goals.
          </p>
        </div>
        <GoalFormDialog />
      </div>

      {/* Overview card */}
      {goals.length > 0 && (
        <Card className="bg-gradient-to-br from-primary/6 via-amber-500/4 to-rose-400/6 border-primary/15">
          <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Trophy className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall Progress</p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatCurrency(totalSaved, baseCurrency)}{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    of {formatCurrency(totalTarget, baseCurrency)}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-32">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{overallPct}%</span>
                  <span>{goals.length} goal{goals.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="bg-muted h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary to-amber-400 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(overallPct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals grid */}
      {goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium">No goals yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Create a savings goal to start tracking your progress — whether it&apos;s
              a holiday fund, emergency savings, or a big purchase.
            </p>
            <GoalFormDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const pct = goal.target_amount > 0
              ? Math.min(Math.round((goal.saved_amount / goal.target_amount) * 100), 100)
              : 0;
            const isComplete = goal.saved_amount >= goal.target_amount;
            const remaining = Math.max(goal.target_amount - goal.saved_amount, 0);

            const daysLeft = daysLeftMap.get(goal.id) ?? null;

            return (
              <Card key={goal.id} className="relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-1 transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: goal.color,
                  }}
                />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${goal.color}20` }}
                      >
                        <Trophy className="h-4 w-4" style={{ color: goal.color }} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{goal.name}</CardTitle>
                        {goal.target_date && (
                          <CardDescription className="text-xs">
                            {isComplete
                              ? "Completed!"
                              : daysLeft !== null
                              ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`
                              : ""}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <GoalFormDialog goal={goal} />
                      <DeleteGoalButton id={goal.id} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-end justify-between mb-1.5">
                      <span className="text-xl font-bold tabular-nums">
                        {formatCurrency(goal.saved_amount, baseCurrency)}
                      </span>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {formatCurrency(goal.target_amount, baseCurrency)}
                      </span>
                    </div>
                    <div className="bg-muted h-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isComplete ? "bg-emerald-400" : ""}`}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isComplete ? undefined : goal.color,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                      <span>{pct}% saved</span>
                      {!isComplete && (
                        <span>{formatCurrency(remaining, baseCurrency)} to go</span>
                      )}
                    </div>
                  </div>

                  {!isComplete && (
                    <ContributeGoalDialog goalId={goal.id} goalName={goal.name} />
                  )}

                  {isComplete && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-600">
                      <Trophy className="h-4 w-4" />
                      Goal reached!
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
