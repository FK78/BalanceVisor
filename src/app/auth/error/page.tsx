import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { XCircle } from "lucide-react";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  return (
    <p className="text-center text-sm text-muted-foreground">
      An authentication error occurred. Please try again or contact support if this keeps happening.
      {params?.error && (
        <span className="block mt-1 text-xs text-muted-foreground/60">
          Ref: {params.error.slice(0, 32).replace(/[^a-zA-Z0-9_-]/g, "")}
        </span>
      )}
    </p>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <AuthLayout backHref="/auth/login" backLabel="Back to login">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Something went wrong</CardTitle>
          <CardDescription>We couldn&apos;t complete your request</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            <ErrorContent searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
