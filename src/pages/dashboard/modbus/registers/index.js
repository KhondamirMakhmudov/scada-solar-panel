import { useState } from "react";
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
  EyeButton,
} from "@/components/button/index";
import CustomSelect from "@/components/select";
import Input from "@/components/input";
import usePostQuery from "@/hooks/java/usePostQuery";
import usePutQuery from "@/hooks/java/usePutQuery";
import { Button, Typography } from "@mui/material";
import toast from "react-hot-toast";
import DeleteModal from "@/components/modal/delete-modal";
import { config } from "@/config";
import { useQueryClient } from "@tanstack/react-query";
import RegisterModal from "@/components/modal/register-modal";
import RegisterDetailsModal from "@/components/modal/register-detail-modal";

const Index = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectRegisterId, setSelectRegisterId] = useState(null);
  const [editingRegister, setEditingRegister] = useState(null);
  const [openRegisterModal, setOpenRegisterModal] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState(null); // ✅ Yangi state qo'shdik

  // Fetch all devices
  const {
    data: devices,
    isLoading: isLoadingDevices,
    isFetching: isFetchingDevices,
  } = useGetQuery({
    key: KEYS.MODBUSDevices,
    url: URLS.MODBUSDevices,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  // Fetch all registers (when no device is selected)
  const {
    data: registers,
    isLoading: isLoadingRegisters,
    isFetching: isFetchingRegisters,
  } = useGetQuery({
    key: KEYS.MODBUSRegisters,
    url: URLS.MODBUSRegisters,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken && !selectedDeviceId,
  });

  // Fetch registers by device ID (when device is selected)
  const {
    data: registersByDeviceId,
    isLoading: isLoadingRegistersByDeviceId,
    isFetching: isFetchingRegistersByDeviceId,
  } = useGetQuery({
    key: [KEYS.MODBUSRegistersByDeviceId, selectedDeviceId],
    url: `${URLS.MODBUSRegistersByDeviceId}/${selectedDeviceId}`,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken && !!selectedDeviceId,
  });

  // UseGetQuery ni o'chirib tashladik, chunki u kerak emas
  // const { data: register } = useGetQuery({
  //   key: KEYS.MODBUSRegister,
  //   url: `${URLS.MODBUSRegisters}${selectRegisterId}`,
  //   headers: {
  //     Authorization: `Bearer ${session?.accessToken}`,
  //     Accept: "application/json",
  //   },
  //   enabled: !!session?.accessToken && !!selectRegisterId,
  // });

  const { mutate: createRegister } = usePostQuery({
    listKeyId: KEYS.MODBUSRegisters,
  });

  const { mutate: updateRegister } = usePutQuery({
    listKeyId: KEYS.MODBUSRegisters,
  });

  // Determine which data to display
  const displayData = selectedDeviceId
    ? get(registersByDeviceId, "data", [])
    : get(registers, "data.content", []);

  const isLoading =
    isLoadingDevices || isLoadingRegisters || isLoadingRegistersByDeviceId;
  const isFetching =
    isFetchingDevices || isFetchingRegisters || isFetchingRegistersByDeviceId;

  // Prepare device options for select
  const deviceOptions = [
    { label: "Все устройства", value: null },
    ...get(devices, "data.content", []).map((device) => ({
      label: device.name,
      value: device.id,
    })),
  ];

  const handleCreate = (registerData) => {
    if (editingRegister) {
      // Update existing register
      updateRegister(
        {
          url: `${URLS.MODBUSRegisters}/${editingRegister.id}`,
          attributes: registerData,
          config: {
            headers: {
              Authorization: `Bearer ${session?.accessToken}`,
            },
          },
        },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            setEditingRegister(null);
            toast.success("Регистр успешно обновлен");
            queryClient.invalidateQueries(KEYS.MODBUSRegisters);
            if (selectedDeviceId) {
              queryClient.invalidateQueries([
                KEYS.MODBUSRegistersByDeviceId,
                selectedDeviceId,
              ]);
            }
          },
          onError: (error) => {
            console.error("Update error:", error);
            toast.error("Не удалось обновить регистр");
          },
        },
      );
    } else {
      // Create new register
      createRegister(
        {
          url: URLS.MODBUSRegisters,
          attributes: registerData,
          config: {
            headers: {
              Authorization: `Bearer ${session?.accessToken}`,
            },
          },
        },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            toast.success("Регистр успешно создан");
            queryClient.invalidateQueries(KEYS.MODBUSRegisters);
            if (selectedDeviceId) {
              queryClient.invalidateQueries([
                KEYS.MODBUSRegistersByDeviceId,
                selectedDeviceId,
              ]);
            }
          },
          onError: (error) => {
            console.error("Create error:", error);
            toast.error("Не удалось создать регистр");
          },
        },
      );
    }
  };

  const handleEdit = (register) => {
    setEditingRegister(register);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingRegister(null);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(
        `${config.JAVA_API_URL}${URLS.MODBUSRegisters}/${selectRegisterId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Ошибка при удалении");
      }

      setDeleteModal(false);
      setSelectRegisterId(null);
      queryClient.invalidateQueries(KEYS.MODBUSRegisters);
      if (selectedDeviceId) {
        queryClient.invalidateQueries([
          KEYS.MODBUSRegistersByDeviceId,
          selectedDeviceId,
        ]);
      }
      toast.success("Регистр успешно удален");
    } catch (error) {
      console.error(error);
      toast.error("Не удалось удалить");
    }
  };

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
      header: "Имя устройства",
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <p className="font-medium text-gray-100">{row.original.deviceName}</p>
        </div>
      ),
    },
    {
      accessorKey: "startAddress",
      header: "Адрес",
      cell: ({ row }) => (
        <span className="text-sm text-gray-300">
          {row.original.startAddress}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "Описание",
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <p className="font-medium text-gray-100">
            {row.original.description || "-"}
          </p>
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
    {
      accessorKey: "unit",
      header: "Единица",
      cell: ({ row }) => (
        <span className="text-sm text-gray-300">
          {row.original.unit || "-"}
        </span>
      ),
    },
    {
      accessorKey: "actions",
      header: "Действия",
      cell: ({ row }) => (
        <ActionButtonGroup>
          <EyeButton
            onClick={() => {
              setSelectedRegister(row.original); // ✅ Row datani statega saqlash
              setOpenRegisterModal(true);
            }}
          />
          <EditButton
            onClick={() => handleEdit(row.original)}
            tooltip="Изменить регистр"
          />
          <DeleteButton
            onClick={() => {
              setSelectRegisterId(row.original.id);
              setDeleteModal(true);
            }}
            tooltip="Удалить регистр"
          />
        </ActionButtonGroup>
      ),
      enableSorting: false,
    },
  ];

  // if (isLoading) {
  //   return (
  //     <DashboardLayout headerTitle={"Регистры"}>
  //       <ContentLoader />
  //     </DashboardLayout>
  //   );
  // }

  return (
    <DashboardLayout headerTitle={"Регистры"}>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ duration: 0.3 }}
        className="p-[15px] rounded-lg my-[20px] manrope border border-surface-dark bg-background-dark"
      >
        <div className="my-2 mb-6">
          <div className="flex justify-between">
            <div>
              <Typography
                variant="h5"
                sx={{ color: "white", fontFamily: "Manrope" }}
              >
                Регистры Modbus
              </Typography>

              <p className="text-gray-300 mb-4">
                Фильтрация и настройка регистров для выбранного устройства
              </p>
            </div>

            {/* Add Register Button */}
            <div className="mb-4">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg h-10 px-5 bg-primary text-background-dark text-sm font-bold font-display hover:bg-opacity-90 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] active:scale-95"
              >
                <span>Добавить регистр</span>
              </button>
            </div>
          </div>

          {/* Device Filter */}
          <div className="flex items-center gap-4">
            <div className="w-full max-w-md">
              <CustomSelect
                label="Фильтр по устройству"
                options={deviceOptions}
                value={selectedDeviceId}
                onChange={(value) => setSelectedDeviceId(value)}
                placeholder="Выберите устройство"
                sortOptions={false}
              />
            </div>

            {selectedDeviceId && (
              <button
                onClick={() => setSelectedDeviceId(null)}
                className="mt-6 px-4 py-2 bg-surface-dark text-gray-300 text-sm font-medium rounded-lg hover:bg-opacity-80 transition-all active:scale-95 border border-gray-700"
              >
                Сбросить фильтр
              </button>
            )}
          </div>

          {/* Results Info */}
          <div className="mt-4">
            <p className="text-sm text-gray-400">
              {selectedDeviceId ? (
                <>
                  Показаны регистры для устройства:{" "}
                  <span className="text-primary font-medium">
                    {
                      deviceOptions.find((d) => d.value === selectedDeviceId)
                        ?.label
                    }
                  </span>{" "}
                  ({displayData.length}{" "}
                  {displayData.length === 1
                    ? "регистр"
                    : displayData.length < 5
                      ? "регистра"
                      : "регистров"}
                  )
                </>
              ) : (
                <>
                  Показаны все регистры ({displayData.length}{" "}
                  {displayData.length === 1
                    ? "регистр"
                    : displayData.length < 5
                      ? "регистра"
                      : "регистров"}
                  )
                </>
              )}
            </p>
          </div>
        </div>

        {isFetching ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <CustomTable data={displayData} columns={columns} />
        )}
      </motion.div>

      {/* Register Details Modal */}
      <RegisterDetailsModal
        isOpen={openRegisterModal}
        onClose={() => {
          setOpenRegisterModal(false);
          setSelectedRegister(null);
        }}
        register={selectedRegister} // ✅ State'dan kelayotgan ma'lumot
      />

      {/* Register Create/Edit Modal */}
      <RegisterModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleCreate}
        editRegister={editingRegister}
        devices={get(devices, "data.content", [])}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        open={deleteModal}
        onClose={() => {
          setDeleteModal(false);
          setSelectRegisterId(null);
        }}
        deleting={handleDelete}
        title="Вы уверены, что хотите удалить этот регистр?"
      />
    </DashboardLayout>
  );
};

export default Index;
