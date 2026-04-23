import Image from "next/image";

const Brand = ({
  title = "“ISSIQLIK ELЕKTR STANSIYALARI” AKSIYADORLIK JAMIYATI",
}) => {
  return (
    <div className="flex items-center gap-2">
      <Image
        src="/icons/ies_brand.svg"
        alt="logo"
        width={43}
        height={46}
        priority
        className="w-[43px] h-auto"
      />
      <p className="m-0 text-[18px] font-bold leading-tight">{title}</p>
    </div>
  );
};

export default Brand;
