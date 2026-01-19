import Image from "next/image";
import React from "react";
import { useRouter } from "next/router";

const Index = () => {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center text-center min-h-screen px-4 font-manrope bg-surface-dark">
      <div className="mb-8 animate-pulse">
        <Image src="/icons/500.svg" alt="500" width={400} height={400} />
      </div>

      <div className="max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Внутренняя ошибка сервера
        </h1>

        <p className="text-lg md:text-xl text-gray-300 mb-3">
          Упс! Что-то пошло не так с нашей стороны.
        </p>

        <p className="text-base text-gray-400 mb-8 max-w-lg mx-auto">
          Мы уже работаем над решением проблемы. Пожалуйста, попробуйте обновить
          страницу или вернуться позже.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => router.reload()}
            className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-all active:scale-95 shadow-lg hover:shadow-green-500/50"
          >
            Обновить страницу
          </button>

          <button
            onClick={() => router.push("/")}
            className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all active:scale-95"
          >
            На главную
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-8">Код ошибки: 500</p>
      </div>
    </div>
  );
};

export default Index;
