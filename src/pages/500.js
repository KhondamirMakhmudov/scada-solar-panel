import Image from "next/image";
import React from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Brand from "@/components/brand";

const Index = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen overflow-hidden bg-[#131313] text-[#e5e2e1] font-manrope">
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between bg-[#131313] px-6 shadow-[0_4px_20px_rgba(33,150,243,0.08)]">
        <Brand />
        <div className="flex items-center gap-6">
          <span className="material-symbols-outlined cursor-pointer rounded-lg p-2 text-[#bfc7d4]/70 transition-colors duration-200 hover:bg-[#393939]">
            help
          </span>
          <span className="material-symbols-outlined cursor-pointer rounded-lg p-2 text-[#bfc7d4]/70 transition-colors duration-200 hover:bg-[#393939]">
            settings
          </span>
          <span className="material-symbols-outlined cursor-pointer rounded-lg p-2 text-[#bfc7d4]/70 transition-colors duration-200 hover:bg-[#393939]">
            account_circle
          </span>
        </div>
      </header>

      <main className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#0e0e0e] pt-16">
        <div className="pointer-events-none absolute inset-0 opacity-20 bg-[linear-gradient(to_bottom,transparent_50%,rgba(158,202,255,0.02)_50%)] bg-[length:100%_4px]" />
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_center,transparent_0%,#0E0E0E_80%)]" />

        <div className="relative grid w-full max-w-5xl grid-cols-1 items-center gap-8 px-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-[0.2em] text-[#ffb4ab]">
                <span className="material-symbols-outlined text-sm">
                  report
                </span>
                Обнаружено прерывание системы
              </span>
              <h1 className="text-5xl font-black leading-tight tracking-tighter text-[#e5e2e1] md:text-7xl">
                КРИТИЧЕСКИЙ СБОЙ
                <br />
                <span className="text-[#ffb4ab] underline decoration-4 underline-offset-8">
                  СИСТЕМЫ
                </span>
              </h1>
            </div>

            <div className="border-l-4 border-[#ffb4ab] bg-[#1c1b1b] p-6 shadow-[0_0_15px_rgba(255,180,171,0.4)]">
              <p className="mb-4 font-mono text-sm leading-relaxed text-[#bfc7d4]">
                Произошла внутренняя ошибка сервера. Наши инженеры уже
                уведомлены и работают над решением проблемы.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 rounded-sm bg-[#93000a]/30 px-3 py-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#ffb4ab]">
                    Код ошибки:
                  </span>
                  <span className="text-xs font-mono text-[#ffdad6]">
                    500_INTERNAL_SERVER_ERROR
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-sm bg-[#2a2a2a] px-3 py-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#bfc7d4]">
                    ID трассировки:
                  </span>
                  <span className="text-xs font-mono text-[#9ecaff]">
                    SRV-7G-X99
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => router.reload()}
                className="flex items-center justify-center gap-3 bg-[#2196f3] px-8 py-4 text-sm font-bold uppercase tracking-wider text-[#002c4f] transition-all duration-200 hover:brightness-110 active:scale-95"
              >
                <span className="material-symbols-outlined">refresh</span>
                Повторить попытку
              </button>

              <Link
                href="/"
                className="flex items-center justify-center gap-3 border border-[#404752]/30 px-8 py-4 text-sm font-bold uppercase tracking-wider text-[#bfc7d4] transition-all duration-200 hover:bg-[#393939]/20"
              >
                <span className="material-symbols-outlined">home</span>
                Вернуться на главную
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-5">
            <div className="overflow-hidden rounded-lg bg-[#2a2a2a] p-1 shadow-2xl">
              <div className="flex items-center justify-between bg-[#353534] px-4 py-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#bfc7d4]">
                  Журнал_ядра_trace
                </span>
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-[#ffb4ab]/40" />
                  <div className="h-2 w-2 rounded-full bg-[#fabd00]/40" />
                  <div className="h-2 w-2 rounded-full bg-[#78dc77]/40" />
                </div>
              </div>

              <div className="h-[280px] overflow-y-auto bg-[#0e0e0e] p-4 font-mono text-[11px] leading-relaxed text-[#bfc7d4]/80">
                <div className="mb-2 text-[#ffb4ab]">
                  [!] ФАТАЛЬНО: ОБНАРУЖЕНА_СИСТЕМНАЯ_ОШИБКА
                </div>
                <div className="opacity-50">
                  0.000121 [ЗАГРУЗКА] Инициализация Forge_Core_v2.4...
                </div>
                <div className="opacity-50">
                  0.000145 [ПАМЯТЬ] Сканирование секторов... ОК
                </div>
                <div className="text-[#ffb4ab]">
                  0.000210 [ОШИБКА] База данных недоступна
                </div>
                <div className="opacity-50">
                  0.000244 [ЯДРО] Сопоставление Process_ID 4421...
                </div>
                <div className="text-[#fabd00]">
                  0.000311 [ПРЕДУПР] Джиттер задержки в шине Bus_01
                </div>
                <div className="font-bold text-[#ffb4ab]">
                  0.000412 [КРИТ] Потеряно соединение с ядром
                </div>
                <div className="font-bold text-[#ffb4ab]">
                  0.000413 [КРИТ] SIGSEGV: Недопустимая ссылка на память
                </div>
                <div className="font-bold text-[#ffb4ab]">
                  0.000414 [КРИТ] Дамп памяти создан. Остановка.
                </div>
                <div className="mt-4 border-t border-[#404752]/20 pt-4 text-[#78dc77]">
                  {">"} диагностика --запуск --тихо
                  <br />
                  Обработка дампа... завершено.
                  <br />
                  Ошибка идентифицирована в Forge_Bridge_UI:500
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2 rounded-lg bg-[#1c1b1b] p-4">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#bfc7d4]/60">
                  НАГРУЗКА CPU
                </span>
                <div className="flex items-end gap-1">
                  <div className="h-3 w-1 bg-[#78dc77]/20" />
                  <div className="h-5 w-1 bg-[#78dc77]/20" />
                  <div className="h-2 w-1 bg-[#78dc77]/20" />
                  <div className="h-8 w-1 bg-[#ffb4ab] shadow-[0_0_8px_rgba(255,180,171,0.5)]" />
                </div>
              </div>
              <div className="flex flex-col justify-center rounded-lg bg-[#1c1b1b] p-4">
                <span className="mb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-[#bfc7d4]/60">
                  NODE_ID
                </span>
                <span className="font-mono text-sm text-[#e5e2e1]">
                  FORGE_SRV_ALPHA_09
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 flex h-12 items-center justify-between border-t border-[#404752]/10 bg-[#0e0e0e]/50 px-6 backdrop-blur-md">
        <div className="flex gap-8">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[#ffb4ab]" />
            <span className="text-[10px] font-mono tracking-widest text-[#bfc7d4]">
              СБОЙ_АКТИВЕН
            </span>
          </div>
          <span className="hidden text-[10px] font-mono tracking-widest text-[#bfc7d4]/40 md:block">
            ВЕРСИЯ_ЯДРА: 1.0.4-LUMINESCENCE
          </span>
        </div>
        <span className="text-[10px] font-mono tracking-widest text-[#bfc7d4]/40">
          © 2144 FORGE_INDUSTRIES
        </span>
      </footer>

      <div className="pointer-events-none fixed right-8 top-20 opacity-20">
        <Image
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgALmFbSXt9vtLyRQiGi3XjltQ-DWeeF2LxLAZKyPlnztLa5G3iHl1K1HoYhfk9TjoTk2KnHuPGlgBHkSY-BSuuOA98lgAouMmV8KgBTZvVLLpirik3ggOyHS6Optya1To2Xo1OFSiR07lBsMOwBOcXtp7yCz0RDb5sjGeTMvw3dNJ9V4DhhbGLIeTkEVu01DBCOKn0FrNphpBkaFVOwW331d-m0W8Uq8f6OyN1Vx7hw1OOuVXEl_C7CUNdlU5WFEcvZcg6jf8Iw"
          alt="Предупреждение"
          width={64}
          height={64}
          className="h-16 w-16 grayscale opacity-50"
        />
      </div>

      <div className="pointer-events-none fixed bottom-20 left-8 opacity-10">
        <div className="select-none text-[12rem] font-black leading-none text-white/5">
          500
        </div>
      </div>
    </div>
  );
};

export default Index;
