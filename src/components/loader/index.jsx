import clsx from "clsx";

const ContentLoader = ({ classNames }) => {
  return (
    <div
      className={clsx(
        "flex min-h-[75vh] justify-center items-center",
        classNames
      )}
    >
      <div class="spinner-box">
        <div class="circle-border">
          <div class="circle-core"></div>
        </div>
      </div>
    </div>
  );
};

export default ContentLoader;
