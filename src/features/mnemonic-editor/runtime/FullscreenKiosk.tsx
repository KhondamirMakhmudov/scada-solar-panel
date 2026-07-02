import { useEffect, useState } from "react";

const FullscreenKiosk = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
      className="w-8 h-8 flex items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 text-lg"
    >
      {isFullscreen ? "⤡" : "⤢"}
    </button>
  );
};

export default FullscreenKiosk;
