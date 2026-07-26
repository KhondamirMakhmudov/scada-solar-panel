import Image from "next/image";

interface BrandProps {
  title?: string;
  /** Классы подписи — чтобы ужать её там, где мало места */
  titleClassName?: string;
  iconSize?: number;
}

/**
 * Логотип с названием организации.
 *
 * `titleClassName` позволяет уменьшить подпись там, где мало места: в боковом
 * меню шириной 264 px размер по умолчанию (18 px) занимал бы три строки и
 * вытеснял пункты меню, тогда как на странице входа и страницах ошибок он
 * уместен.
 */
const Brand = ({
  title = "“ISSIQLIK ELЕKTR STANSIYALARI” AKSIYADORLIK JAMIYATI",
  titleClassName = "text-[18px] font-bold leading-tight",
  iconSize = 43,
}: BrandProps) => {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Image
        src="/icons/ies_brand.svg"
        alt="logo"
        width={iconSize}
        height={Math.round((iconSize * 46) / 43)}
        priority
        className="h-auto flex-shrink-0"
        style={{ width: iconSize }}
      />
      {title && <p className={`m-0 min-w-0 ${titleClassName}`}>{title}</p>}
    </div>
  );
};

export default Brand;
