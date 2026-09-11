import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Brand from "@/components/brand";

const Index = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const roles = session?.user?.roles;
  const roleLabel = Array.isArray(roles) && roles.length ? roles.join(", ") : "не определена";

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] font-manrope selection:bg-[#9ecaff] selection:text-[#003258]">
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between bg-[#131313] px-6 shadow-[0_4px_20px_rgba(33,150,243,0.08)]">
        <Brand />
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="material-symbols-outlined cursor-pointer p-2 text-[#bfc7d4]/70 transition-colors duration-200 hover:bg-[#393939] active:scale-95"
          >
            help
          </button>
          <button
            type="button"
            className="material-symbols-outlined cursor-pointer p-2 text-[#bfc7d4]/70 transition-colors duration-200 hover:bg-[#393939] active:scale-95"
          >
            settings
          </button>
          <button
            type="button"
            className="material-symbols-outlined cursor-pointer p-2 text-[#bfc7d4]/70 transition-colors duration-200 hover:bg-[#393939] active:scale-95"
          >
            account_circle
          </button>
        </div>
      </header>

      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(45deg,rgba(250,189,0,0.05)_25%,transparent_25%,transparent_50%,rgba(250,189,0,0.05)_50%,rgba(250,189,0,0.05)_75%,transparent_75%,transparent)] bg-[size:56px_56px] px-6 pb-16 pt-16">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
          <span className="select-none font-mono text-[40rem] font-black tracking-tighter">
            403
          </span>
        </div>

        <div className="relative z-10 flex w-full max-w-4xl flex-col items-center">
          <div className="mb-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-sm text-[#fabd00]">
              lock
            </span>
            <span className="font-mono text-sm font-medium uppercase tracking-[0.2em] text-[#fabd00]">
              ДОСТУП_ОГРАНИЧЕН
            </span>
          </div>

          <div className="relative mb-8">
            <h1 className="flex select-none text-[8rem] font-black leading-none tracking-tighter text-[#e5e2e1] [text-shadow:0_0_20px_rgba(250,189,0,0.35)] md:text-[16rem]">
              403
            </h1>
            <div className="absolute -right-4 top-1/2 origin-center -translate-y-1/2 rotate-90 whitespace-nowrap">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#404752]">
                Доступ запрещён
              </span>
            </div>
          </div>

          <div className="w-full max-w-2xl rounded-lg border border-[#404752]/15 bg-gradient-to-br from-[#201f1f]/80 to-[#1c1b1b]/60 p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col justify-between gap-8 md:flex-row">
              <div className="flex-1 space-y-4">
                <h2 className="text-2xl font-bold tracking-tight text-[#fabd00]">
                  НЕДОСТАТОЧНО_ПРАВ
                </h2>
                <p className="text-sm leading-relaxed text-[#bfc7d4]">
                  У вашей учётной записи нет прав для просмотра этого раздела.
                  Если считаете, что доступ должен быть открыт, обратитесь к
                  администратору системы.
                </p>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="space-y-1">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-[#89919d]">
                      Код статуса
                    </span>
                    <span className="block font-mono text-sm text-[#e5e2e1]">
                      403_FORBIDDEN
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-[#89919d]">
                      Ваша роль
                    </span>
                    <span className="block truncate font-mono text-sm text-[#e5e2e1]">
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex min-w-[200px] flex-col justify-center gap-3">
                <Link
                  href="/dashboard/main"
                  className="group flex items-center justify-between rounded bg-[#2196f3] px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#002c4f] transition-all hover:brightness-110 active:scale-95 [box-shadow:0_0_15px_rgba(158,202,255,0.2)]"
                >
                  Перейти в панель
                  <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">
                    dashboard
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={() => router.back()}
                  className="group flex items-center justify-between rounded bg-[#353534] px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#e5e2e1] transition-all hover:bg-[#393939] active:scale-95"
                >
                  Назад
                  <span className="material-symbols-outlined text-sm">
                    arrow_back
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-12 w-full max-w-2xl overflow-hidden rounded border border-[#404752]/10 bg-[#0e0e0e]/80">
            <div className="flex items-center justify-between bg-[#2a2a2a] px-3 py-1.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#404752]">
                Журнал доступа
              </span>
              <div className="flex gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#404752]/40" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#404752]/40" />
              </div>
            </div>
            <div className="max-h-32 space-y-1 overflow-hidden p-4 font-mono text-[11px] leading-tight text-[#89919d] opacity-60">
              <p>[0.0018] Проверка сессии пользователя...</p>
              <p>
                [0.0041] <span className="text-[#9ecaff]">ИНФО:</span> Роль
                учётной записи: {roleLabel}
              </p>
              <p>
                [0.0177] <span className="text-[#fabd00]">ПРЕДУПРЕЖДЕНИЕ:</span>{" "}
                Роль не входит в список разрешённых для раздела
              </p>
              <p>
                [0.0203] <span className="text-[#fabd00]">ОТКАЗАНО:</span> Доступ
                к запрошенному ресурсу закрыт политикой безопасности
              </p>
              <p>[0.0204] Переадресация на безопасный маршрут...</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 left-10 hidden opacity-20 lg:block">
          <div className="flex h-48 w-48 items-center justify-center rounded-full border border-[#404752]/30">
            <div className="flex h-32 w-32 items-center justify-center rounded-full border border-dashed border-[#404752]/30">
              <span className="material-symbols-outlined scale-150 text-[#404752]">
                gpp_maybe
              </span>
            </div>
          </div>
        </div>

        <div className="absolute right-10 top-1/4 hidden rotate-12 opacity-20 lg:block">
          <div className="space-y-2 border-l-2 border-[#fabd00] p-4">
            <div className="h-1 w-24 bg-[#fabd00]" />
            <div className="h-1 w-16 bg-[#353534]" />
            <div className="h-1 w-20 bg-[#353534]" />
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-50 flex h-10 items-center justify-between bg-[#0e0e0e] px-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[#89919d]">
        <div className="flex items-center gap-4">
          <span>SCADA v1.0.0</span>
          <span className="text-[#353534]">|</span>
          <span>Доступность: 99.998%</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#fabd00]" />
            Политика доступа активна
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
