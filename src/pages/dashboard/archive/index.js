import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { URLS } from "@/constants/url";
import { KEYS } from "@/constants/key";
import useGetPythonQuery from "@/hooks/python/useGetQuery";
import { useSession } from "next-auth/react";
import ContentLoader from "@/components/loader";

const Index = () => {
  const { data: session } = useSession();
  const {
    data: archiveData,
    isLoading,
    isFetching,
  } = useGetPythonQuery({
    key: KEYS.archive,
    url: URLS.archive,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  if (isLoading || isFetching) {
    return (
      <DashboardLayout headerTitle={"Архивы"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }
  return <DashboardLayout headerTitle={"Архивы"}></DashboardLayout>;
};

export default Index;
