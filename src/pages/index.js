"use client";

import { useState, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Input from "@/components/input";
import { Button, Typography, Alert } from "@mui/material";
import Image from "next/image";
import Brand from "@/components/brand";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEnter = () => {
    router.push("/dashboard/main");
  };

  const handleExit = async () => {
    await signOut({ redirect: false });
    sessionStorage.clear();
    localStorage.clear();
    router.push("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Неверное имя пользователя или пароль");
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        router.push("/dashboard/main");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Произошла ошибка при входе");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0A1E] font-space-grotesk">
      <div className="grid lg:grid-cols-2 min-h-screen">
        <div className="relative hidden lg:flex flex-col p-8 overflow-hidden">
          {/* Background image */}
          <Image
            src="/images/bg-login.png"
            alt="background"
            className="absolute inset-0 w-full h-full object-cover"
            width={300}
            height={300}
            priority
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-[#102216]/90" />

          {/* Content */}
          <div className="relative z-20 flex flex-col justify-between w-full h-full">
            <Brand />

            <div className="max-w-md">
              <p className="text-3xl font-bold leading-tight mb-4 text-white">
                Мониторинг энергии будущего в реальном времени.
              </p>
              <div className="flex items-center gap-2 text-primary/80">
                <span className="material-symbols-outlined text-sm">bolt</span>
                <span className="text-sm font-medium tracking-wide uppercase">
                  Система активна
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Login Form Section */}
        <div className="flex items-center justify-center p-8 bg-background-dark manrope">
          <div className="w-full max-w-[430px]">
            {status === "loading" ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex gap-1 mb-4">
                  <div
                    className="w-3 h-3 rounded-full bg-[#13ec5b] animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-3 h-3 rounded-full bg-[#13ec5b] animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-3 h-3 rounded-full bg-[#13ec5b] animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
                <p className="text-[#92c9a4] text-base">Загрузка...</p>
              </div>
            ) : status === "authenticated" ? (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#13ec5b]/20 flex items-center justify-center animate-pulse">
                    <span className="material-symbols-outlined text-[#13ec5b] text-5xl">
                      account_circle
                    </span>
                  </div>
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{ color: "white", fontWeight: 600, mb: 1 }}
                  >
                    Вы уже в системе
                  </Typography>
                  <p className="text-[#92c9a4] text-sm">Активная сессия</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={handleEnter}
                    fullWidth
                    sx={{
                      backgroundColor: "#13ec5b",
                      color: "#FFFFFF",
                      height: "50px",
                      borderRadius: "8px",
                      textTransform: "none",
                      fontSize: "16px",
                      fontWeight: "600",
                      fontFamily: "Manrope, sans-serif",
                      "&:hover": {
                        backgroundColor: "#0fd650",
                        transform: "translateY(-2px)",
                        boxShadow: "0 4px 12px rgba(19, 236, 91, 0.4)",
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    <span className="material-symbols-outlined text-[20px] mr-2">
                      login
                    </span>
                    Войти
                  </Button>

                  <Button
                    onClick={handleExit}
                    fullWidth
                    sx={{
                      background:
                        "linear-gradient(135deg, #ff4444 0%, #cc0000 100%)",
                      color: "#FFFFFF",
                      height: "50px",
                      borderRadius: "8px",
                      textTransform: "none",
                      fontSize: "16px",
                      fontWeight: "600",
                      fontFamily: "Manrope, sans-serif",
                      border: "2px solid rgba(255, 68, 68, 0.3)",
                      boxShadow: "0 2px 8px rgba(255, 68, 68, 0.2)",
                      "&:hover": {
                        background:
                          "linear-gradient(135deg, #ff5555 0%, #dd0000 100%)",
                        transform: "translateY(-2px)",
                        boxShadow: "0 6px 16px rgba(255, 68, 68, 0.4)",
                        border: "2px solid rgba(255, 68, 68, 0.5)",
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    <span className="material-symbols-outlined text-[20px] mr-2">
                      logout
                    </span>
                    Выйти
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Typography
                  variant="h4"
                  component="h1"
                  gutterBottom
                  sx={{ color: "white", fontWeight: 600 }}
                >
                  Вход в систему
                </Typography>
                <p className="text-neutral-500 dark:text-[#92c9a4] text-base font-normal leading-normal mb-2">
                  SCADA-платформа для управления солнечными панелями
                </p>

                {error && (
                  <Alert severity="error" sx={{ mb: 3, fontFamily: "Manrope" }}>
                    {error}
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <Input
                    placeholder="Имя пользователя"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <Input
                    placeholder="Пароль"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />

                  <Button
                    type="submit"
                    fullWidth
                    disabled={isLoading}
                    sx={{
                      backgroundColor: "#13ec5b",
                      color: "#FFFFFF",
                      height: "45px",
                      borderRadius: "8px",
                      textTransform: "none",
                      fontSize: "17px",
                      fontWeight: "600",
                      fontFamily: "Manrope, sans-serif",
                      "&:hover": {
                        backgroundColor: "#0fd650",
                      },
                      "&:disabled": {
                        backgroundColor: "#0CA33E",
                        color: "#B8B8B8",
                      },
                    }}
                  >
                    <span className="material-symbols-outlined text-[20px] mr-2">
                      login
                    </span>
                    {isLoading ? "Вход..." : "Войти"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
