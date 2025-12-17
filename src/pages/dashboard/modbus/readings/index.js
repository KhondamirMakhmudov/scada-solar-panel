import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { URLS } from "@/constants/url";
import { KEYS } from "@/constants/key";
import useGetQuery from "@/hooks/java/useGetQuery";

const Index = () => {
  return <DashboardLayout headerTitle={"Чтение данных"}></DashboardLayout>;
};

export default Index;
