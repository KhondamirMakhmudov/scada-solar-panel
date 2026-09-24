import clsx from "clsx";

/**
 * Page/section loading state: a thin arc spinner on a faint track plus a
 * mono caption. Styles live in styles/loader.css. The whole block fades in
 * after a short delay, so a fast response never flashes a spinner at all.
 */
const ContentLoader = ({ classNames, label = "Загрузка" }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        "flex min-h-[75vh] flex-col justify-center items-center gap-4",
        classNames,
      )}
    >
      <div className="content-loader">
        <svg viewBox="0 0 48 48" className="content-loader__svg" aria-hidden="true">
          <circle className="content-loader__track" cx="24" cy="24" r="20" />
          <circle className="content-loader__arc" cx="24" cy="24" r="20" />
        </svg>
      </div>
      <p className="content-loader__label">
        {label}
        <span className="content-loader__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </p>
    </div>
  );
};

export default ContentLoader;
