import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Действия страницы — кнопки создания, экспорта, обновления */
  actions?: ReactNode;
  children?: ReactNode;
}

/**
 * Заголовок содержимого страницы — под шапкой раздела, которую рисует
 * DashboardLayout.
 *
 * Намеренно плоский: раньше разделы открывались градиентным блоком высотой
 * ~150 px с дублирующей строкой «SCADA / Раздел», хотя тот же путь уже стоит
 * в «хлебных крошках» шапки. На экране оператора это вытесняло данные ниже
 * границы видимости.
 */
const PageHeader = ({ title, description, actions, children }: PageHeaderProps) => (
  <div className="flex flex-wrap items-start gap-3 mb-4">
    <div className="min-w-0 flex-1">
      <h2 className="text-[17px] font-semibold text-[#e5e2e1] leading-tight">{title}</h2>
      {description && (
        <p className="mt-1 text-[13px] text-[#6b7280] leading-snug max-w-3xl">{description}</p>
      )}
      {children}
    </div>
    {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeader;
