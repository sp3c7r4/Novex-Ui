import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

export function OAuthSuccess() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (token && window.opener) {
      window.opener.postMessage({ token }, "*");
      window.close();
    }
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        {token ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Authentication successful. Closing&hellip;
            </p>
          </>
        ) : (
          <p className="text-sm text-destructive">
            No token received. Please close this window and try again.
          </p>
        )}
      </div>
    </div>
  );
}
