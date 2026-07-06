"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Brand from "@/components/brand";
import storage from "@/services/storage";
import {
  SAVED_ACCOUNTS_KEY,
  getSavedAccounts,
  saveAccount,
  removeSavedAccount,
} from "@/lib/savedAccounts";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [organization, setOrganization] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [showAccountList, setShowAccountList] = useState(false);
  const usernameFieldRef = useRef(null);

  useEffect(() => {
    setSavedAccounts(getSavedAccounts());
  }, []);

  const handleSelectAccount = (account) => {
    setUsername(account.username);
    setPassword(account.password);
    setShowAccountList(false);
  };

  const handleRemoveAccount = (event, usernameToRemove) => {
    event.stopPropagation();
    setSavedAccounts(removeSavedAccount(usernameToRemove));
  };

  const handleEnter = () => {
    router.push("/dashboard/main");
  };

  const handleExit = async () => {
    const preservedAccounts = storage.get(SAVED_ACCOUNTS_KEY);
    await signOut({ redirect: false });
    sessionStorage.clear();
    localStorage.clear();
    if (preservedAccounts) {
      storage.set(SAVED_ACCOUNTS_KEY, preservedAccounts);
    }
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
        setSavedAccounts(saveAccount(username, password));
        router.push("/dashboard/main");
      }
    } catch (error) {
      console.error("Ошибка входа:", error);
      setError("Произошла ошибка при входе");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#131313] px-6 py-12 text-[#e5e2e1] font-manrope">
      <div className="absolute left-6 top-6 z-20 max-w-[520px]">
        <Brand />
      </div>

      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(158,202,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(158,202,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-[#9ecaff]/10 blur-[120px]" />
        <div className="absolute -right-20 bottom-1/4 h-96 w-96 rounded-full bg-[#78dc77]/5 blur-[120px]" />
        <div className="absolute inset-0 opacity-20">
          <Image
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0esjStlSui1JRRDxmqo0IPeSyxt_mDT4cd50o6mKmiAgPQFDwfBk_AkzLpW2u5AXLo6b-oY6kn2H8IsE5OOaMl1XQRY7eF745uRFurmpNKIwgyK1h-SaXKSaT8iUmZ1cz1AX7CDeIPTFudqM6YejuQzJe74VYqgSvHp2zlXwEfJSeznawYguX9VbWo0oDpvkVJZqr5kTcFhDBKJUv_iEPcyuBbE_qvZobFCKr0Dcf_oagBV3mJwk0kmAvfS-Vkr2MiOnhlMKKjw"
            alt="Фон завода"
            width={1920}
            height={1080}
            priority
            className="h-full w-full object-cover grayscale brightness-50"
          />
        </div>
      </div>

      <main className="relative z-10 w-full max-w-[500px]">
        <div className="mb-10 text-center">
          <p className="mt-2 text-[0.65rem] font-bold uppercase tracking-widest text-[#bfc7d4]">
            Промышленный интерфейс SCADA v1.0.0
          </p>
        </div>

        <div className="overflow-hidden rounded-lg  bg-[#1c1b1b]/60 shadow-[0_0_40px_rgba(33,150,243,0.15)] backdrop-blur-xl">
          <div className="flex items-center justify-between bg-[#353534] px-8 py-4">
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-[#e5e2e1]">
              Доступ к терминалу
            </span>
            <div className="flex gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[#78dc77] shadow-[0_0_8px_#78dc77]" />
              <div className="h-2 w-2 rounded-full bg-[#393939]" />
            </div>
          </div>

          {status === "loading" ? (
            <div className="p-8">
              <div className="flex flex-col items-center justify-center py-10">
                <div className="mb-4 flex gap-2">
                  <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#78dc77]" />
                  <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#78dc77] [animation-delay:150ms]" />
                  <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#78dc77] [animation-delay:300ms]" />
                </div>
                <p className="text-sm text-[#bfc7d4]">Загрузка...</p>
              </div>
            </div>
          ) : status === "authenticated" ? (
            <div className="space-y-6 p-8">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#9ecaff]/20">
                  <span className="material-symbols-outlined text-4xl text-[#9ecaff]">
                    verified_user
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-[#e5e2e1]">
                  Вы уже в системе
                </h2>
                <p className="mt-1 text-sm text-[#bfc7d4]">Активная сессия</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleEnter}
                  className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#2196f3] text-sm font-bold uppercase tracking-[0.14em] text-[#002c4f] transition-all hover:shadow-[0_0_20px_rgba(33,150,243,0.4)]"
                  type="button"
                >
                  <span className="material-symbols-outlined text-base">
                    login
                  </span>
                  Войти
                </button>

                <button
                  onClick={handleExit}
                  className="flex h-12 items-center justify-center gap-2 rounded-lg border border-red-400/30 bg-red-700 text-sm font-bold uppercase tracking-[0.14em] text-red-100 transition-all hover:bg-red-600"
                  type="button"
                >
                  <span className="material-symbols-outlined text-base">
                    logout
                  </span>
                  Выйти
                </button>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-6 p-8">
                {/* <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-[#bfc7d4]">
                    <span className="material-symbols-outlined text-[14px]">
                      corporate_fare
                    </span>
                    ID организации
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="CORP-ALPHA-01"
                    className="h-12 w-full border-none bg-[#0e0e0e] px-4 font-mono text-sm tracking-wider text-[#9ecaff] transition-all focus:ring-1 focus:ring-[#9ecaff]"
                    disabled={isLoading}
                  />
                </div> */}

                <div className="space-y-4">
                  <div className="relative space-y-1.5">
                    <label className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-[#bfc7d4]">
                      <span className="material-symbols-outlined text-[14px]">
                        person
                      </span>
                      Логин / Имя пользователя
                    </label>
                    <input
                      ref={usernameFieldRef}
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setShowAccountList(true)}
                      onBlur={() => setShowAccountList(false)}
                      placeholder="admin"
                      className="h-12 w-full border-none bg-[#0e0e0e] px-4 text-sm text-[#e5e2e1] transition-all focus:ring-1 focus:ring-[#9ecaff]"
                      disabled={isLoading}
                      required
                    />

                    {showAccountList && savedAccounts.length > 0 && (
                      <div
                        onMouseDown={(e) => e.preventDefault()}
                        className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto border border-[#2a2a2a] bg-[#0e0e0e] shadow-lg"
                      >
                        {savedAccounts.map((account) => (
                          <div
                            key={account.username}
                            onClick={() => handleSelectAccount(account)}
                            className="group flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-sm text-[#e5e2e1] transition-colors hover:bg-[#1c1b1b]"
                          >
                            <span className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[16px] text-[#9ecaff]">
                                person
                              </span>
                              {account.username}
                            </span>
                            <button
                              type="button"
                              onClick={(e) =>
                                handleRemoveAccount(e, account.username)
                              }
                              className="text-[#89919d] opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                              title="Удалить сохранённый вход"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                close
                              </span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-[#bfc7d4]">
                      <span className="material-symbols-outlined text-[14px]">
                        lock_open
                      </span>
                      Защищённый пароль
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="h-12 w-full border-none bg-[#0e0e0e] px-4 pr-12 text-sm text-[#e5e2e1] transition-all focus:ring-1 focus:ring-[#9ecaff]"
                        disabled={isLoading}
                        required
                      />
                      <button
                        className="absolute right-3 top-[55%] -translate-y-1/2 text-[#bfc7d4] transition-colors hover:text-[#9ecaff]"
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        <span className="material-symbols-outlined text-lg">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <button
                  className="group flex w-full items-center justify-center gap-3 rounded-lg bg-[#2196f3] py-4 font-bold uppercase tracking-[0.2em] text-[#002c4f] transition-all duration-300 hover:shadow-[0_0_20px_rgba(33,150,243,0.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? "Вход..." : "Войти"}
                  <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">
                    login
                  </span>
                </button>
              </form>

              <div className="flex items-center gap-2 px-8 pb-8">
                <span className="h-px flex-grow bg-[#404752]/40" />
                <span className="text-[0.6rem] font-mono uppercase tracking-widest text-[#89919d]">
                  Биометрическая аутентификация готова
                </span>
                <span className="h-px flex-grow bg-[#404752]/40" />
              </div>
            </>
          )}
        </div>

        <footer className="mt-12 w-full">
          <div className="flex flex-col items-center justify-between gap-6 border-t border-[#404752]/30 pt-8 sm:flex-row">
            <div className="flex gap-8">
              <a
                className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-[#bfc7d4] transition-colors hover:text-[#9ecaff]"
                href="#"
              >
                <span className="material-symbols-outlined text-sm">
                  key_visualizer
                </span>
                Забыли пароль?
              </a>
              <a
                className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-[#bfc7d4] transition-colors hover:text-[#9ecaff]"
                href="#"
              >
                <span className="material-symbols-outlined text-sm">
                  support_agent
                </span>
                Связаться с администратором
              </a>
            </div>

            <div className="flex items-center gap-3 rounded-full border border-[#404752]/30 bg-[#1c1b1b] px-4 py-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#78dc77] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#78dc77]" />
              </span>
              <a
                className="text-[0.6rem] font-bold uppercase tracking-widest text-[#bfc7d4] transition-colors hover:text-[#78dc77]"
                href="#"
              >
                Статус платформы: Работает
              </a>
            </div>
          </div>
        </footer>
      </main>

      <div className="pointer-events-none fixed left-0 top-0 h-32 w-32 opacity-10">
        <div className="absolute left-4 top-4 h-12 w-12 border-l border-t border-[#9ecaff]" />
        <div className="absolute left-8 top-8 text-[8px] leading-tight text-[#9ecaff] font-mono">
          X: 104.2
          <br />
          Y: 442.9
          <br />
          СЕК: АЛЬФА
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-0 right-0 h-32 w-32 opacity-10">
        <div className="absolute bottom-4 right-4 h-12 w-12 border-b border-r border-[#9ecaff]" />
        <div className="absolute bottom-8 right-8 text-right text-[8px] leading-tight text-[#9ecaff] font-mono">
          СТАТУС: АКТИВЕН
          <br />
          БУФ: 1024КБ
          <br />
          КАНАЛ: 10ГБ/С
        </div>
      </div>
    </div>
  );
}
