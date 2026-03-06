import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCategoriesByUser } from "@/db/queries/categories";
import { getCategorisationRules } from "@/db/queries/categorisation-rules";
import {
  getMonthlyCategorySpendTrend,
  getTotalSpendByCategoryThisMonth,
} from "@/db/queries/transactions";
import { CategoryFormDialog } from "@/components/CategoryFormDialog";
import { DeleteCategoryButton } from "@/components/DeleteCategoryButton";
import { CategorisationRuleFormDialog } from "@/components/CategorisationRuleForm";
import { DeleteRuleButton } from "@/components/DeleteRuleButton";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { getCurrentUserId } from "@/lib/auth";
import { getUserBaseCurrency } from "@/db/queries/onboarding";
import { Tags, Wand2 } from "lucide-react";
import { CategoryCharts } from "@/components/CategoryCharts";

export default async function Categories() {
  const userId = await getCurrentUserId();

  const [categories, topSpendRows, monthlySpendRows, baseCurrency, rules] = await Promise.all([
    getCategoriesByUser(userId),
    getTotalSpendByCategoryThisMonth(userId),
    getMonthlyCategorySpendTrend(userId, 6),
    getUserBaseCurrency(userId),
    getCategorisationRules(userId),
  ]);

  const topSpendByCategory = topSpendRows
    .map((row) => ({
      category: row.category,
      color: row.color,
      total: Number(row.total) || 0,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      <div className="flex items-start justify-between page-header-gradient">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your spending categories.
          </p>
        </div>
        <CategoryFormDialog />
      </div>

      {(topSpendByCategory.length > 0 || monthlySpendRows.length > 0) && (
        <CategoryCharts
          topThisMonth={topSpendByCategory}
          monthlyRows={monthlySpendRows}
          currency={baseCurrency}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>
            Manage all your categories in one place.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Tags className="h-10 w-10 opacity-40" />
              <div>
                <p className="text-sm font-medium text-foreground">No categories yet</p>
                <p className="text-xs">Create categories to organize your transactions.</p>
              </div>
              <CategoryFormDialog />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => {
                const Icon = getCategoryIcon(cat.icon);
                return (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 rounded-xl border border-border/50 p-3 transition-all duration-200 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 hover:border-primary/15"
                >
                  {Icon ? (
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: cat.color + "18" }}
                    >
                      <Icon className="h-4 w-4" style={{ color: cat.color }} />
                    </div>
                  ) : (
                    <div
                      className="h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                  )}
                  <span className="text-sm font-medium">{cat.name}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <CategoryFormDialog category={cat} />
                    <DeleteCategoryButton category={cat} />
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Categorisation Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 pb-2">
                <Wand2 className="h-4 w-4" />
                Auto-Categorisation Rules
              </CardTitle>
              <CardDescription>
                Transactions matching these patterns will be automatically assigned a category.
              </CardDescription>
            </div>
            {categories.length > 0 && (
              <CategorisationRuleFormDialog categories={categories} />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-10 text-center">
              <Wand2 className="h-10 w-10 opacity-40" />
              <div>
                <p className="text-sm font-medium text-foreground">No rules yet</p>
                <p className="text-xs">Add a rule to auto-categorise transactions by description.</p>
              </div>
              {categories.length > 0 && (
                <CategorisationRuleFormDialog categories={categories} />
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center gap-3 rounded-xl border border-border/60 p-3 transition-all duration-200 hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="rounded-lg bg-muted px-2 py-0.5 text-xs font-medium">
                        {rule.pattern}
                      </code>
                      <span className="text-xs text-muted-foreground">→</span>
                      {rule.categoryColor && (
                        <span className="flex items-center gap-1.5 text-xs">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: rule.categoryColor }}
                          />
                          {rule.categoryName}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Priority: {rule.priority}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <CategorisationRuleFormDialog categories={categories} rule={rule} />
                    <DeleteRuleButton ruleId={rule.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
