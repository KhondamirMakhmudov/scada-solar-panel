import React from "react";
import Image from "next/image";
const NoData = ({
  title = "Нет данных",
  description = "К сожалению, данные отсутствуют. Попробуйте изменить фильтры или добавить новые записи.",
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 font-ibmPlexSans">
      <div className="mb-6 opacity-40">
        <Image src="/icons/no-data.svg" alt="" width={160} height={160} />
      </div>

      <h3 className="text-base font-semibold text-text-primary mb-2">
        {title}
      </h3>

      <p className="text-[12.5px] text-text-muted max-w-md">{description}</p>
    </div>
  );
};

export default NoData;
