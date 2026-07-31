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
const Index = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("table");
  const [searchValue, setSearchValue] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
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
      id: "user",
      header: "User",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-[2px] bg-surface-border flex items-center justify-center text-[9px] font-ibmPlexMono font-semibold text-text-primary">
            {`${row.original.first_name?.[0] || ""}${row.original.last_name?.[0] || ""}`.toUpperCase() || "U"}
          </span>
          <span className="font-medium text-text-primary">
            {row.original.first_name} {row.original.last_name}
          </span>
        </div>
      ),
    },
    { accessorKey: "username", header: "Username", cell: ({ row }) => (
      <span className="text-text-muted">@{row.original.username}</span>
    ) },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <span className="inline-block px-1.5 py-0.5 border border-surface-border rounded-[2px] text-[9.5px] font-semibold uppercase tracking-wide text-text-secondary">
          {row.original.role === "admin" ? "Admin" : "User"}
        </span>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1.5 font-ibmPlexMono text-[10px] font-medium">
          <button
            type="button"
            onClick={() => {
              setSelectUser(row?.original.id);
              setDeleteModal(true);
            }}
            className="text-status-fault hover:underline"
          >
            DEL
          </button>
        </div>
      ),
      enableSorting: false,
    },
  ];

  const filteredUsers = get(users, "data.data", []).filter((user) => {
    const query = searchValue.trim().toLowerCase();
    const matchesSearch =
      !query ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

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
      <div className="font-ibmPlexSans space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="filter users…"
            className="w-[230px] h-8 px-2.5 rounded-[2px] border border-surface-border bg-surface-dark text-[11.5px] font-ibmPlexMono text-text-primary placeholder:text-text-faint outline-none focus:border-primary/60 transition-colors"
          />
          <div className="w-[170px]">
            <CustomSelect
              value={roleFilter}
              onChange={(value) => setRoleFilter(value)}
              options={[{ label: "Все роли", value: "all" }, ...roleOptions]}
              placeholder="Роль"
              sortOptions={false}
            />
          </div>

          <div className="flex-1" />

          <div className="flex border border-surface-border rounded-[2px] overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveTab("table")}
              className={`flex items-center gap-1.5 h-8 px-2.5 text-[10.5px] font-ibmPlexMono uppercase tracking-wide transition-colors ${
                activeTab === "table"
                  ? "bg-primary/15 text-primary"
                  : "text-text-muted hover:text-text-secondary hover:bg-background-dark"
              }`}
            >
              <TableRows sx={{ fontSize: 14 }} />
              Table
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("card")}
              className={`flex items-center gap-1.5 h-8 px-2.5 text-[10.5px] font-ibmPlexMono uppercase tracking-wide border-l border-surface-border transition-colors ${
                activeTab === "card"
                  ? "bg-primary/15 text-primary"
                  : "text-text-muted hover:text-text-secondary hover:bg-background-dark"
              }`}
            >
              <GridView sx={{ fontSize: 14 }} />
              Cards
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCreateModal(true)}
            className="h-8 px-3 rounded-[2px] border border-primary text-primary text-[10.5px] font-ibmPlexMono font-medium hover:bg-primary hover:text-white transition-colors"
          >
            + NEW USER
          </button>
        </div>

        {activeTab === "table" && (
          <div className="rounded-[2px] border border-surface-border bg-surface-dark">
            <CustomTable columns={columns} data={filteredUsers} />
          </div>
        )}

        {activeTab === "card" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {filteredUsers.map((user, index) => (
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

          <div className="space-y-[20px] font-ibmPlexSans">
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
              className="bg-text-primary"
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
              className="bg-text-primary"
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
