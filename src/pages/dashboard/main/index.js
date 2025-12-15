import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { Typography, IconButton, Button } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MapOfUz from "@/components/map-country";
import useGetPythonQuery from "@/hooks/python/useGetQuery";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { useSession } from "next-auth/react";
import { get } from "lodash";
import ContentLoader from "@/components/loader";
import { useState, useEffect } from "react";
import usePostPythonQuery from "@/hooks/python/usePostQuery";
import MethodModal from "@/components/modal/method-modal";
import Input from "@/components/input";
import toast from "react-hot-toast";
import PrimaryButton from "@/components/button";
import { useQueryClient } from "@tanstack/react-query";
import DeleteModal from "@/components/modal/delete-modal";
import { config } from "@/config";

const Index = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [showHint, setShowHint] = useState(true);
  const [createCompanyModal, setCreateCompanyModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    latitude: 0,
    longitude: 0,
    description: "",
  });
  const [originalData, setOriginalData] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const {
    data: company,
    isLoading: isLoadingCompany,
    isFetching: isFetchingCompany,
  } = useGetPythonQuery({
    key: KEYS.company,
    url: URLS.company,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  const { mutate: createCompany } = usePostPythonQuery({
    listKeyId: "create-company",
  });

  // Get changed fields only
  const getChangedFields = () => {
    const changes = {};
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== originalData[key]) {
        changes[key] = formData[key];
      }
    });
    return changes;
  };

  const handleRemoveAll = () => {
    setFormData({
      name: "",
      address: "",
      latitude: 0,
      longitude: 0,
      description: "",
    });
    setOriginalData({});
    setSelectedCompany(null);
  };
  // create company
  const submitCreateCompany = () => {
    createCompany(
      {
        url: URLS.company,
        attributes: formData,
        config: {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        },
      },
      {
        onSuccess: () => {
          toast.success("Станция успешно создана", {
            position: "top-center",
          });
          setCreateCompanyModal(false);
          handleRemoveAll();
          queryClient.invalidateQueries(KEYS.company);
        },
        onError: (error) => {
          toast.error(`Error is ${error}`, { position: "top-right" });
        },
      }
    );
  };
  // edit company
  const submitEditCompany = async () => {
    try {
      const changedFields = getChangedFields();

      // Check if there are any changes
      if (Object.keys(changedFields).length === 0) {
        toast.error("Нет изменений для сохранения");
        return;
      }

      const response = await fetch(
        `${config.PYTHON_API_URL}${URLS.company}${selectedCompany}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: JSON.stringify(changedFields),
        }
      );

      if (!response.ok) {
        throw new Error("Ошибка при обновлении");
      }

      toast.success("Успешно обновлено");
      setOpenEditModal(false);
      handleRemoveAll();
      queryClient.invalidateQueries(KEYS.company);
    } catch (error) {
      console.error(error);
      toast.error("Не удалось обновить");
    }
  };

  const submitDeleteCompany = async () => {
    try {
      const response = await fetch(
        `${config.PYTHON_API_URL}${URLS.company}${selectedCompany}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: JSON.stringify({ id_: selectedCompany }),
        }
      );

      if (!response.ok) {
        throw new Error("Ошибка при удалении");
      }

      toast.success("Успешно удалено");
      setOpenDeleteModal(false);
      setSelectedCompany(null);
      queryClient.invalidateQueries(KEYS.company);
    } catch (error) {
      console.error(error);
      toast.error("Не удалось удалить");
    }
  };

  // Load company data when edit modal opens
  useEffect(() => {
    if (openEditModal && selectedCompany) {
      const companyData = get(company, "data.data", []).find(
        (c) => c.id === selectedCompany
      );

      if (companyData) {
        const initialData = {
          name: companyData.name || "",
          address: companyData.address || "",
          latitude: companyData.latitude || 0,
          longitude: companyData.longitude || 0,
          description: companyData.description || "",
        };
        setFormData(initialData);
        setOriginalData(initialData);
      }
    }
  }, [openEditModal, selectedCompany, company]);

  if (isLoadingCompany || isFetchingCompany) {
    return (
      <DashboardLayout>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle="Главная">
      <div className="my-[15px]">
        <PrimaryButton
          variant="contained"
          onClick={() => setCreateCompanyModal(true)}
        >
          Добавить станцию
        </PrimaryButton>
      </div>
      <div className="grid grid-cols-12 gap-4 my-[20px] bg-[#1A132A] p-[30px] border border-[#555555] shadow-sm rounded-lg">
        {/* Title */}
        <div className="col-span-12 mb-[15px] text-white">
          <Typography
            variant="h6"
            sx={{ fontFamily: "Manrope" }}
            className="font-semibold mb-2 manrope"
          >
            Карта теплоэлектростанций Узбекистана
          </Typography>
          <Typography
            variant="body2"
            className="text-gray-300 leading-relaxed"
            sx={{ fontFamily: "Manrope" }}
          >
            На данной карте представлены все действующие теплоэлектростанции
            (ИЭС) страны. Каждый объект играет ключевую роль в обеспечении
            регионов тепловой и электрической энергией. Выберите станцию, чтобы
            узнать больше о её характеристиках, местоположении и значении для
            энергетической системы Узбекистана.
          </Typography>
        </div>

        {/* Map + floating hint */}
        <div className="relative col-span-12 min-h-[600px] rounded-lg overflow-hidden">
          <MapOfUz
            markersData={get(company, "data.data")}
            onMarkerClick={() => setShowHint(false)}
            onClickEdit={(id) => {
              setOpenEditModal(true);
              setSelectedCompany(id);
            }}
            onClickDelete={(id) => {
              setOpenDeleteModal(true);
              setSelectedCompany(id);
            }}
          />

          {/* 💡 Floating hint panel */}
          {showHint && (
            <div className="absolute top-5 left-5 bg-[#2A1F3D]/90 text-white backdrop-blur-md rounded-xl shadow-lg border border-[#444] px-4 py-3 w-[300px] animate-fadeIn">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <InfoOutlinedIcon className="text-blue-400" />
                  <Typography
                    variant="subtitle1"
                    sx={{ fontFamily: "Manrope" }}
                    className="font-semibold"
                  >
                    Подсказка
                  </Typography>
                </div>
                <IconButton
                  size="small"
                  onClick={() => setShowHint(false)}
                  sx={{
                    color: "#ccc",
                    "&:hover": { color: "#fff" },
                    p: 0.5,
                  }}
                >
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </div>
              <Typography
                variant="body2"
                sx={{ fontFamily: "Manrope" }}
                className="text-gray-200 leading-relaxed"
              >
                Нажмите на одну из станций на карте, чтобы увидеть подробную
                информацию справа.
              </Typography>
            </div>
          )}
        </div>
      </div>

      {/* Create company modal */}
      {createCompanyModal && (
        <MethodModal
          open={createCompanyModal}
          showCloseIcon={true}
          closeClick={() => {
            setCreateCompanyModal(false);
            handleRemoveAll();
          }}
          title={"Создать станцию"}
        >
          <div className="space-y-[20px] manrope">
            <Input
              placeholder={"Название станции"}
              name={"name"}
              label={"Название станции"}
              value={formData.name}
              onChange={handleChange}
            />
            <Input
              placeholder={"Адрес"}
              label={"Адрес"}
              name={"address"}
              value={formData.address}
              onChange={handleChange}
            />

            <div className="flex gap-2">
              <Input
                placeholder={"Широта"}
                label={"Широта (Latitude)"}
                name="latitude"
                classNames="w-1/2"
                type="number"
                value={formData.latitude}
                onChange={handleChange}
              />

              <Input
                placeholder={"Долгота"}
                label={"Долгота (Longitude)"}
                name="longitude"
                classNames="w-1/2"
                type="number"
                value={formData.longitude}
                onChange={handleChange}
              />
            </div>

            <textarea
              name="description"
              placeholder="Описание станции"
              value={formData.description}
              onChange={handleChange}
              className="w-full min-h-[100px] p-3 bg-[#374151] text-white border border-gray-100 rounded-lg focus:outline-none focus:border-[#6E39CB] resize-none"
              style={{ fontFamily: "Manrope" }}
            />

            <Button
              onClick={submitCreateCompany}
              disabled={!formData.name || !formData.address}
              sx={{
                backgroundColor:
                  formData.name && formData.address ? "#6E39CB" : "#555",
                color: "#FFFFFF",
                height: "45px",
                borderRadius: "8px",
                textTransform: "none",
                fontSize: "17px",
                fontWeight: "600",
                width: "100%",
                fontFamily: "Manrope, sans-serif",
                "&:hover": {
                  backgroundColor:
                    formData.name && formData.address ? "#A877FD" : "#555",
                },
                cursor:
                  formData.name && formData.address ? "pointer" : "not-allowed",
              }}
            >
              Добавить
            </Button>
          </div>
        </MethodModal>
      )}

      {/* Edit company modal */}
      {openEditModal && (
        <MethodModal
          open={openEditModal}
          showCloseIcon={true}
          closeClick={() => {
            setOpenEditModal(false);
            handleRemoveAll();
          }}
          title={"Редактировать станцию"}
        >
          <div className="space-y-[20px] manrope">
            <Input
              placeholder={"Название станции"}
              name={"name"}
              value={formData.name}
              onChange={handleChange}
            />
            <Input
              placeholder={"Адрес"}
              name={"address"}
              value={formData.address}
              onChange={handleChange}
            />

            <div className="flex gap-2">
              <Input
                placeholder={"Широта"}
                label={"Широта (Latitude)"}
                name="latitude"
                classNames="w-1/2"
                type="number"
                value={formData.latitude}
                onChange={handleChange}
              />

              <Input
                placeholder={"Долгота"}
                label={"Долгота (Longitude)"}
                name="longitude"
                classNames="w-1/2"
                type="number"
                value={formData.longitude}
                onChange={handleChange}
              />
            </div>

            <textarea
              name="description"
              placeholder="Описание станции"
              value={formData.description}
              onChange={handleChange}
              className="w-full min-h-[100px] p-3 bg-[#374151] text-white border border-gray-100 rounded-lg focus:outline-none focus:border-[#6E39CB] resize-none"
              style={{ fontFamily: "Manrope" }}
            />

            <div className="flex justify-end gap-2 ">
              <PrimaryButton
                backgroundColor="#555"
                onClick={() => setOpenEditModal(false)}
                disabled={!formData.name || !formData.address}
              >
                Отмена
              </PrimaryButton>
              <PrimaryButton
                onClick={submitEditCompany}
                disabled={!formData.name || !formData.address}
              >
                Сохранить изменения
              </PrimaryButton>
            </div>
          </div>
        </MethodModal>
      )}

      {/* Delete company modal */}
      <DeleteModal
        open={openDeleteModal}
        title={"Вы точно хотите удалить эту станцию?"}
        onClose={() => {
          setOpenDeleteModal(false);
          setSelectedCompany(null);
        }}
        deleting={submitDeleteCompany}
      />
    </DashboardLayout>
  );
};

export default Index;
