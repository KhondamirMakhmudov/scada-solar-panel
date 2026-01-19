import clsx from "clsx";

const ContentLoader = ({ classNames }) => {
  return (
    <div
      className={clsx(
        "flex min-h-[75vh] justify-center items-center",
        classNames
      )}
    >
      <div className="spinner-box">
        <div className="circle-border">
          <div className="circle-core"></div>
        </div>
      </div>
    </div>
  );
};

export default ContentLoader;
