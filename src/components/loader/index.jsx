import clsx from "clsx";

const ContentLoader = ({ classNames }) => {
  return (
    <div
      className={clsx(
        "flex min-h-[75vh] justify-center items-center",
        classNames
      )}
    >
      <div className="loader">
        <div className="loader-small"></div>
        <div className="loader-large"></div>
      </div>
    </div>
  );
};

export default ContentLoader;
