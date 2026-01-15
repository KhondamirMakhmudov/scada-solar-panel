import Image from "next/image";

const Brand = () => {
  return (
    <div className="flex gap-2 items-center  ">
      <Image
        src={"/icons/solar-power.svg"}
        alt="solar-power"
        width={40}
        height={40}
      />

      <span className="text-white text-xl font-bold tracking-tight">
        Solar SCADA
      </span>
    </div>
  );
};

export default Brand;
