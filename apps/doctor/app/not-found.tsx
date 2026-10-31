import Link from "next/link";
import { HealthIllustration } from "@swasthyaseva/ui";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <HealthIllustration variant="heartbeat" size={200} className="mb-8 opacity-40" />
      <h1 className="text-4xl font-bold text-card-alt mb-2">Page not found</h1>
      <p className="text-muted-alt mb-8 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-2.5 rounded-lg bg-primary text-primary-alt font-medium text-sm hover:bg-primary/90 transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
