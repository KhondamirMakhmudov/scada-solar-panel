import { Typography, IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";

const MainContentHeader = ({ children, toggleSidebar }) => {
  const [scrolled, setScrolled] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={`
        sticky top-0 z-30 
        flex items-center justify-between
        transition-all duration-300 rounded-md
        px-6 py-4
        ${
          scrolled
            ? "bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-lg shadow-sm"
            : "bg-surface-light dark:bg-surface-dark"
        }
      `}
    >
      <div className="flex items-center gap-4">
        <IconButton
          onClick={toggleSidebar}
          className="
            group
            transition-all duration-200
            hover:bg-primary
            active:scale-95
            border border-gray-300 dark:border-gray-600
          "
          sx={{
            width: 44,
            height: 44,
            borderRadius: "10px",
            backgroundColor: "rgba(19, 236, 91, 0.1)",
            "&:hover": {
              backgroundColor: "#13ec5b",
              "& svg": {
                color: "#ffffff",
              },
            },
          }}
        >
          <MenuIcon
            sx={{
              fontSize: 22,
              color: "#13ec5b",
              transition: "color 0.2s",
            }}
          />
        </IconButton>

        <Typography
          variant="h5"
          className="
            font-spaceGrotesk 
            text-gray-900 dark:text-white
          "
          sx={{
            fontWeight: 700,
            fontSize: "1.375rem",
            background:
              theme === "dark"
                ? "linear-gradient(135deg, #13ec5b 0%, #0bc44d 100%)"
                : "linear-gradient(135deg, #13ec5b 0%, #089e3d 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontFamily: "Manrope",
          }}
        >
          {children}
        </Typography>
      </div>
    </div>
  );
};

export default MainContentHeader;
