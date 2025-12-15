import Input from "@/components/input";
import CustomSelect from "@/components/select";
import { URLS } from "@/constants/url";
import usePostPythonQuery from "@/hooks/python/usePostQuery";
import { Button, Typography } from "@mui/material";
import Image from "next/image";

import { useRouter } from "next/router";
import { useState } from "react";
import toast from "react-hot-toast";

export default function Index() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    role: "",
    email: "",
    username: "",
    password: "",
  });
  const roleOptions = [
    { value: "user", label: "Пользователь" },
    { value: "admin", label: "Администратор" },
  ];

  const { mutate: register } = usePostPythonQuery({
    listKeyId: "register",
  });

  const submitRegister = () => {
    register(
      {
        url: URLS.register,
        attributes: formData,
      },
      {
        onSuccess: () => {
          router.push("/");
          toast.success("Successfully registered!!!", {
            position: "top-center",
          });
        },
        onError: (error) => {
          toast.error(`Error is ${error}`, { position: "top-right" });
        },
      }
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  return (
    <div className="h-screen">
      <div className="grid grid-cols-12 gap-2 place-items-center  h-full">
        <div className="lg:flex hidden col-span-6 bg-[#6E39CB] h-screen y-[10px] p-2 w-full  items-center justify-center">
          <Image
            src={"/icons/sign-up-animate.svg"}
            alt="solar"
            width={600}
            height={600}
            className="bg-transparent"
          />
        </div>
        <div className="col-span-12 lg:col-span-6 flex justify-center ">
          <div className="w-[600px]">
            <Typography variant="h4" component="h1" gutterBottom>
              Регистрация
            </Typography>

            <p className="text-sm text-gray-400 mb-5 manrope">
              Добро пожаловать в систему мониторинга солнечных панелей
            </p>
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
                options={roleOptions}
                value={formData.role}
                placeholder="Выберите пол"
                onChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    role: val,
                  }))
                }
              />

              <Input
                placeholder={"Э-почта"}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
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
                onClick={submitRegister}
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
                Войти
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
