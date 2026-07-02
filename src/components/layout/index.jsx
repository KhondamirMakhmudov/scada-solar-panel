import { useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import ContentLoader from "@/components/loader";

// Session gate for every non-home page (see src/pages/_app.js) — waits for
// next-auth to resolve, then bounces unauthenticated users back to "/".
// Not a visual page-chrome component; each dashboard page still owns its
// own DashboardLayout for sidebar/header.
const Layout = ({ children }) => {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return <ContentLoader />;
  }

  return children;
};

export default Layout;
