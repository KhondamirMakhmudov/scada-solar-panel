import React from "react";
import Image from "next/image";
const NoData = ({
  title = "Нет данных",
  description = "К сожалению, данные отсутствуют. Попробуйте изменить фильтры или добавить новые записи.",
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 font-manrope">
      <div className="mb-6 text-6xl opacity-50">
        <Image src="/icons/no-data.svg" alt="500" width={400} height={400} />
      </div>

      <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
        {title}
      </h3>

      <p className="text-base text-gray-500 dark:text-gray-400 max-w-md">
        {description}
      </p>
    </div>
  );
};

export default NoData;
