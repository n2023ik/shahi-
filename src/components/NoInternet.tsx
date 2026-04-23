import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface NoInternetProps {
  onRetry?: () => void;
  message?: string;
}

export function NoInternet({ 
  onRetry, 
  message = "No internet connection detected" 
}: NoInternetProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Alert className="max-w-md border-red-500/50 bg-red-950/20">
        <WifiOff className="h-5 w-5 text-red-500" />
        <AlertTitle className="text-red-400 font-semibold">Connection Lost</AlertTitle>
        <AlertDescription className="mt-2 space-y-4">
          <p className="text-slate-300">{message}</p>
          <p className="text-sm text-slate-400">
            Please check your internet connection and try again.
          </p>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              className="w-full border-red-500/50 hover:bg-red-950/30"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function NoInternetBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <WifiOff className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-red-400 font-semibold">No Internet Connection</p>
            <p className="text-sm text-slate-400">Unable to fetch data from server</p>
          </div>
        </div>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="border-red-500/50 hover:bg-red-950/30"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
