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
      className="w-8 h-8 flex items-center justify-center rounded-[2px] text-text-secondary transition-colors hover:bg-background-dark active:scale-90 text-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
    >
      {isFullscreen ? "⤡" : "⤢"}
    </button>
  );
};

export default FullscreenKiosk;
