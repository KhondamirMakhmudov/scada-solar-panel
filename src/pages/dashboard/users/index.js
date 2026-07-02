import { useState, useEffect } from "react";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import useGetPythonQuery from "@/hooks/python/useGetQuery";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { signOut, useSession } from "next-auth/react";
import CustomTable from "@/components/table";
import { get } from "lodash";
import { Button } from "@mui/material";
import ContentLoader from "@/components/loader";
import usePostPythonQuery from "@/hooks/python/usePostQuery";
import MethodModal from "@/components/modal/method-modal";
import Input from "@/components/input";
import CustomSelect from "@/components/select";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { config } from "@/config";
import DeleteModal from "@/components/modal/delete-modal";
import { useRouter } from "next/router";
import { TableRows, GridView } from "@mui/icons-material";
import { motion } from "framer-motion";
import UserCard from "@/components/card/UserCard";
import { ActionButtonGroup, DeleteButton } from "@/components/button";
const Index = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("table");
  const [createModal, setCreateModal] = useState(false);
  const [selectUser, setSelectUser] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    role: "",
    company_info_id: "",
    username: "",
    password: "",
  });
  const {
    data: users,
    error,
    isLoading: isLoadingUsers,
    isFetching: isFetchingUsers,
  } = useGetPythonQuery({
    key: KEYS.users,
    url: URLS.users,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  // useEffect(() => {
  //   if (!session?.accessToken) {
  //     signOut({ callbackUrl: "/" });
  //     return;
  //   }

  //   if (
  //     error?.response?.status === 401 ||
  //     error?.detail === "Token has expired"
  //   ) {
  //     // Agar next-auth ishlatilsa:
  //     // signOut();
  //     signOut({ callbackUrl: "/" });
  //   }
  // }, [session, error, router]);

  const {
    data: company,
    isLoading: isLoadingCompany,
    isFetching: isFetchingCompany,
  } = useGetPythonQuery({
    key: [KEYS.company.createModal],
    url: URLS.company,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken && !!createModal,
  });

  const companyOptions = get(company, "data.data", []).map((company) => ({
    value: company.id,
    label: company.name,
  }));

  const roleOptions = [
    { value: "user", label: "Пользователь" },
    { value: "admin", label: "Администратор" },
  ];

  const { mutate: createUser } = usePostPythonQuery({
    listKeyId: "create-user",
  });

  const submitCreateUser = () => {
    createUser(
      {
        url: URLS.register,
        attributes: formData,
        config: {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        },
      },
      {
        onSuccess: () => {
          toast.success("пользователь успешно создан", {
            position: "top-center",
          });
          setCreateModal(false);
          setFormData({
            first_name: "",
            last_name: "",
            role: "",
            company_info_id: "",
            username: "",
            password: "",
          });

          queryClient.invalidateQueries(KEYS.users);
        },
        onError: (error) => {
          toast.error(`Error is ${error}`, { position: "top-right" });
        },
      },
    );
  };

  const handleDeleteUser = async (id) => {
    try {
      const response = await fetch(
        `${config.PYTHON_API_URL}${URLS.users}/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: JSON.stringify({ id }), // faqat agar backend body kutsa
        },
      );

      if (!response.ok) {
        throw new Error("Ошибка при удалении");
      }

      let result = null;

      // Faqat agar javob body mavjud bo‘lsa
      if (response.status !== 200) {
        result = await response.json();
        console.log("Deleted:", result);
      }
      queryClient.invalidateQueries(KEYS.users);

      toast.success("Успешно удалено");
    } catch (error) {
      console.error(error);
      toast.error("Не удалось удалить");
    }
  };

  const columns = [
    {
      header: "№",
      cell: ({ row }) => row.index + 1,
    },
    { accessorKey: "first_name", header: "Имя" },
    { accessorKey: "last_name", header: "Фамилия" },
    { accessorKey: "username", header: "Имя пользователя" },
    {
      accessorKey: "role",
      header: "Роль",
      cell: ({ row }) => (
        <span
          className={`inline-flex rounded-md px-2.5 py-1 text-xs ${
            row.original.role === "admin"
              ? "bg-blue-500/15 text-blue-300 border border-blue-400/30"
              : "bg-slate-500/20 text-slate-300 border border-slate-400/30"
          }`}
        >
          {row.original.role === "admin" ? "Администратор" : "Пользователь"}
        </span>
      ),
    },

    {
      accessorKey: "actions",
      header: "Действия",
      cell: ({ row }) => (
        <ActionButtonGroup>
          <DeleteButton
            onClick={() => {
              setSelectUser(row?.original.id);
              setDeleteModal(true);
            }}
            tooltip="Удалить пользователя"
          />
        </ActionButtonGroup>
      ),
      enableSorting: false,
    },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (isLoadingUsers || isFetchingUsers) {
    return (
      <DashboardLayout>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle={"Пользователи"}>
      <div className="font-manrope py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button
          onClick={() => setCreateModal(true)}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            color: "#00111f",
            background: "linear-gradient(90deg, #38bdf8 0%, #60a5fa 100%)",
            borderRadius: "10px",
            height: "44px",
            "&:hover": { opacity: 0.9 },
          }}
          variant="contained"
        >
          Создать
        </Button>

        {/* Tab switch */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("table")}
            className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition ${
              activeTab === "table"
                ? "border-blue-500/70 bg-blue-500/15 text-blue-200"
                : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
            }`}
          >
            <TableRows fontSize="small" /> Таблица
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("card")}
            className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition ${
              activeTab === "card"
                ? "border-blue-500/70 bg-blue-500/15 text-blue-200"
                : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
            }`}
          >
            <GridView fontSize="small" /> Карточки
          </button>
        </div>
      </div>

      <div>
        {activeTab === "table" && (
          <CustomTable columns={columns} data={get(users, "data.data", [])} />
        )}

        {activeTab === "card" && (
          <div className="flex gap-4">
            {get(users, "data.data", []).map((user, index) => (
              <UserCard
                key={index}
                user={user}
                setSelectUser={setSelectUser}
                setDeleteModal={setDeleteModal}
              />
            ))}
          </div>
        )}
      </div>
      </div>

      {createModal && (
        <MethodModal
          closeClick={() => setCreateModal(false)}
          open={createModal}
          showCloseIcon={true}
        >
          <h1 className="text-xl mb-[15px]">Создать пользователя</h1>

          <div className="space-y-[20px] font-manrope">
            <div className="flex gap-2">
              <Input
                placeholder={"Имя"}
                name={"first_name"}
                classNames="w-1/2 "
                value={formData.first_name}
                onChange={handleChange}
              />
              <Input
                placeholder={"Фамилия"}
                name={"last_name"}
                classNames="w-1/2 "
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>
            <CustomSelect
              className="bg-gray-100"
              options={companyOptions}
              value={formData.company_info_id}
              placeholder="Выберите станцию"
              onChange={(val) =>
                setFormData((prev) => ({
                  ...prev,
                  company_info_id: val,
                }))
              }
            />

            <CustomSelect
              className="bg-gray-100"
              options={roleOptions}
              value={formData.role}
              placeholder="Выберите роль"
              onChange={(val) =>
                setFormData((prev) => ({
                  ...prev,
                  role: val,
                }))
              }
            />

            <Input
              placeholder={"Имя пользователя"}
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
            />
            <Input
              name="password"
              placeholder={"Пароль"}
              isPassword={true}
              type="password"
              value={formData.password}
              onChange={handleChange}
            />

            <Button
              onClick={submitCreateUser}
              sx={{
                color: "#00111f",
                background: "linear-gradient(90deg, #38bdf8 0%, #60a5fa 100%)",
                height: "45px",
                borderRadius: "8px",
                textTransform: "none",
                fontSize: "17px",
                fontWeight: "600",
                width: "100%",
                fontFamily: "Manrope, sans-serif",
                "&:hover": { opacity: 0.9 },
              }}
            >
              Создать
            </Button>
          </div>
        </MethodModal>
      )}

      {deleteModal && (
        <DeleteModal
          open={deleteModal}
          onClose={() => {
            setDeleteModal(false);
            setSelectUser(null);
          }}
          deleting={() => {
            handleDeleteUser(selectUser); // 👈 DELETE so‘rov
            setDeleteModal(false);
            setSelectUser(null);
          }}
          title="Вы уверены, что хотите удалить этого пользователя?"
        />
      )}
    </DashboardLayout>
  );
};

export default Index;
