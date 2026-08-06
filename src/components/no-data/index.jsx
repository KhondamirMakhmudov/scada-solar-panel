import React from "react";

const NoData = ({
  title = "Нет данных",
  description = "К сожалению, данные отсутствуют. Попробуйте изменить фильтры или добавить новые записи.",
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 font-ibmPlexSans">
      <svg
        width="44"
        height="44"
        viewBox="0 0 44 44"
        fill="none"
        className="mb-4"
        style={{ color: "#3a3a3a" }}
      >
        <rect x="7" y="9" width="24" height="26" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <line x1="12" y1="16" x2="26" y2="16" stroke="currentColor" strokeWidth="1.4" />
        <line x1="12" y1="21" x2="26" y2="21" stroke="currentColor" strokeWidth="1.4" />
        <line x1="12" y1="26" x2="20" y2="26" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="30" cy="30" r="6.5" fill="#131313" stroke="#5c6270" strokeWidth="1.4" />
        <line x1="34.6" y1="34.6" x2="39" y2="39" stroke="#5c6270" strokeWidth="1.4" strokeLinecap="round" />
      </svg>

      <h3 className="text-[13.5px] font-semibold font-ibmPlexSans text-text-primary mb-1.5">
        {title}
      </h3>

      <p className="text-[11px] font-ibmPlexMono text-text-muted max-w-md">{description}</p>
    </div>
  );
};

export default NoData;
