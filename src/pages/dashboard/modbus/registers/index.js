import useGetQuery from "@/hooks/java/useGetQuery";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { useSession } from "next-auth/react";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { motion } from "framer-motion";
import CustomTable from "@/components/table";
import { get } from "lodash";
import ContentLoader from "@/components/loader";
import {
  EditButton,
  DeleteButton,
  ActionButtonGroup,
} from "@/components/button";

const Index = () => {
  const { data: session } = useSession();
  const {
    data: registers,
    isLoading,
    isFetching,
  } = useGetQuery({
    key: KEYS.MODBUSRegisters,
    url: URLS.MODBUSRegisters,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
  });

  const columns = [
    {
      header: "№",
      cell: ({ row }) => (
        <span className="font-medium text-gray-300">{row.index + 1}</span>
      ),
    },
    {
      accessorKey: "name",
      header: "Имя регистра",
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <p className="font-medium text-gray-100">{row.original.name}</p>
        </div>
      ),
    },
    {
      accessorKey: "deviceName",
      header: "Имя устройтва",
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <p className="font-medium text-gray-100">{row.original.deviceName}</p>
        </div>
      ),
    },
    {
      accessorKey: "dataType",
      header: "Тип данных",
      cell: ({ row }) => (
        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-blue-900/20 text-blue-400 border border-blue-900/30">
          {row.original.dataType}
        </span>
      ),
    },
    {
      accessorKey: "byteOrder",
      header: "Порядок байтов",
      cell: ({ row }) => (
        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-primary-900/20 text-primary border border-primary-900/30">
          {row.original.byteOrder}
        </span>
      ),
    },
  ];
  return (
    <DashboardLayout headerTitle={"Регистры"}>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ duration: 0.3 }}
        className="p-[15px] rounded-lg my-[20px] manrope border border-surface-dark bg-background-dark"
      >
        <CustomTable
          data={get(registers, "data.content", [])}
          columns={columns}
        />
      </motion.div>
    </DashboardLayout>
  );
};

export default Index;
