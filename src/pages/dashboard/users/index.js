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
import ChipSelect from "@/components/chip-select";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { config } from "@/config";
import DeleteModal from "@/components/modal/delete-modal";
import { useRouter } from "next/router";
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
      header: "Пользователь",
      cell: ({ row }) => (
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: 2,
              background: "#2a2a2a",
              display: "grid",
              placeItems: "center",
              font: "600 9px/1 'IBM Plex Mono'",
              color: "#e5e2e1",
              flexShrink: 0,
            }}
          >
            {`${row.original.first_name?.[0] || ""}${row.original.last_name?.[0] || ""}`.toUpperCase() || "U"}
          </span>
          <span style={{ font: "500 11.5px/1.3 'IBM Plex Mono'", color: "#e5e2e1" }}>
            {row.original.first_name} {row.original.last_name}
            <span style={{ color: "#7c8290" }}> @{row.original.username}</span>
          </span>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Роль",
      cell: ({ row }) => (
        <span
          style={{
            display: "inline-block",
            padding: "1px 5px",
            border: "1px solid #2a2a2a",
            borderRadius: 2,
            font: "600 9.5px/1.5 'IBM Plex Mono'",
            color: "#bfc7d4",
          }}
        >
          {row.original.role === "admin" ? "АДМИНИСТРАТОР" : "ПОЛЬЗОВАТЕЛЬ"}
        </span>
      ),
    },
    {
      id: "permissions",
      header: "Права",
      cell: () => <span style={{ font: "400 10.5px/1.3 'IBM Plex Mono'", color: "#7c8290" }}>—</span>,
    },
    {
      id: "lastSeen",
      header: "Был в сети",
      cell: () => <span style={{ font: "400 11px/1.3 'IBM Plex Mono'", color: "#7c8290" }}>—</span>,
    },
    {
      accessorKey: "actions",
      header: "Действия",
      cell: ({ row }) => (
        <div className="text-right" style={{ font: "500 10px/1.4 'IBM Plex Mono'" }}>
          <button
            type="button"
            onClick={() => {
              setSelectUser(row?.original.id);
              setDeleteModal(true);
            }}
            style={{ color: "#ef4444" }}
            className="hover:underline"
          >
            УДАЛИТЬ
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
            placeholder="поиск пользователей…"
            style={{
              width: 230,
              padding: "5px 8px",
              background: "#1c1b1b",
              border: "1px solid #2a2a2a",
              borderRadius: 2,
              color: "#e5e2e1",
              font: "400 11.5px/1.3 'IBM Plex Mono'",
              outline: "none",
            }}
          />
          <ChipSelect
            value={roleFilter}
            onChange={setRoleFilter}
            label="РОЛЬ"
            options={[{ label: "ВСЕ", value: "all" }, ...roleOptions.map((o) => ({ label: o.label.toUpperCase(), value: o.value }))]}
          />

          <div className="flex-1" />

          <div style={{ display: "flex", border: "1px solid #2a2a2a", borderRadius: 2, overflow: "hidden" }}>
            <div
              onClick={() => setActiveTab("table")}
              style={{
                padding: "4px 9px",
                cursor: "pointer",
                font: "500 10px/1.5 'IBM Plex Mono'",
                background: activeTab === "table" ? "#3b82f6" : "#1c1b1b",
                color: activeTab === "table" ? "#fff" : "#7c8290",
              }}
            >
              ТАБЛИЦА
            </div>
            <div
              onClick={() => setActiveTab("card")}
              style={{
                padding: "4px 9px",
                cursor: "pointer",
                font: "500 10px/1.5 'IBM Plex Mono'",
                borderLeft: "1px solid #2a2a2a",
                background: activeTab === "card" ? "#3b82f6" : "#1c1b1b",
                color: activeTab === "card" ? "#fff" : "#7c8290",
              }}
            >
              КАРТОЧКИ
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCreateModal(true)}
            className="h-8 px-3 rounded-[2px] border border-primary text-primary text-[10.5px] font-ibmPlexMono font-medium hover:bg-primary hover:text-white transition-colors"
          >
            + ПОЛЬЗОВАТЕЛЬ
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
