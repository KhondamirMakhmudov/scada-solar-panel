import { useState, useEffect } from "react";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import useGetPythonQuery from "@/hooks/python/useGetQuery";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { signOut, useSession } from "next-auth/react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
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
      }
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
        }
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
        <div
          className={`${
            row.original.role === "admin"
              ? "bg-green-100 text-green-500 border border-green-500"
              : "bg-blue-100 text-blue-500 border border-blue-500"
          } inline py-1 px-2 rounded-md`}
        >
          {row.original.role === "admin" ? "Администратор" : "Пользователь"}
        </div>
      ),
    },

    {
      accessorKey: "actions",
      header: "Действия",
      cell: ({ row }) => (
        <div className="flex justify-start items-center gap-2">
          <Button
            onClick={() => {
              setSelectUser(row?.original.id);
              setDeleteModal(true);
            }}
            sx={{
              width: "32px",
              height: "32px",
              minWidth: "32px",
              background: "#FCD8D3",
              color: "#FF1E00",
            }}
          >
            <DeleteIcon fontSize="small" />
          </Button>
        </div>
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
      <div className="flex items-center justify-between my-[15px]">
        {/* Tugma */}
        <Button
          onClick={() => setCreateModal(true)}
          sx={{
            textTransform: "initial",
            backgroundColor: "#6E39CB",
            boxShadow: "none",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            fontSize: "14px",
            padding: "8px 16px",
            borderRadius: "10px",
            fontFamily: "Manrope",
            "&:hover": {
              backgroundColor: "#5b2bb3",
              boxShadow: "none",
            },
          }}
          variant="contained"
        >
          Создать
        </Button>

        {/* Tab switch */}
        <div className="relative flex items-center bg-gradient-to-r from-[#5B2BB3]/80 to-[#6E39CB]/80 dark:from-[#4B1E97]/90 dark:to-[#5C2DBD]/90 p-[6px] rounded-2xl shadow-md backdrop-blur-md">
          {/* Table button */}
          <button
            onClick={() => setActiveTab("table")}
            className={`z-10 flex items-center justify-center w-12 h-10 rounded-xl transition-all ${
              activeTab === "table"
                ? "text-white scale-110 bg-white/20 backdrop-blur-sm rounded-xl shadow-sm"
                : "text-white/60 hover:text-white/80"
            }`}
          >
            <TableRows fontSize="small" />
          </button>

          {/* Card button */}
          <button
            onClick={() => setActiveTab("card")}
            className={`z-10 flex items-center justify-center w-12 h-10 rounded-xl transition-all ${
              activeTab === "card"
                ? "text-white scale-110 bg-white/20 backdrop-blur-sm rounded-xl shadow-sm"
                : "text-white/60 hover:text-white/80"
            }`}
          >
            <GridView fontSize="small" />
          </button>
        </div>
      </div>

      <div className="my-[15px]">
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

      {createModal && (
        <MethodModal
          closeClick={() => setCreateModal(false)}
          open={createModal}
          showCloseIcon={true}
        >
          <h1 className="text-xl mb-[15px]">Создать пользователя</h1>

          <div className="space-y-[20px] manrope">
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
                backgroundColor: "#6E39CB",
                color: "#FFFFFF",
                height: "45px",
                borderRadius: "8px",
                textTransform: "none",
                fontSize: "17px",
                fontWeight: "600",
                width: "100%",
                fontFamily: "Manrope, sans-serif",
                "&:hover": {
                  backgroundColor: "#A877FD",
                },
              }}
            >
              {" "}
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
