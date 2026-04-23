import { Typography, IconButton } from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import MenuOpenRoundedIcon from "@mui/icons-material/MenuOpenRounded";
import { useState, useEffect } from "react";

const MainContentHeader = ({ children, toggleSidebar, isSidebarOpen }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`
        sticky top-0 z-30 
        flex items-center justify-between
        transition-all duration-300 rounded-md border border-[#2a2a2a]
        px-6 py-4
        ${
          scrolled
            ? "bg-[#131313]/90 backdrop-blur-lg shadow-[0_4px_20px_rgba(59,130,246,0.10)]"
            : "bg-[#131313]"
        }
      `}
    >
      <div className="flex items-center gap-4">
        <IconButton
          onClick={toggleSidebar}
          sx={{
            color: "#bfc7d4",
            border: "1px solid #2a2a2a",
            borderRadius: "10px",
            backgroundColor: "#1c1b1b",
            "&:hover": {
              color: "#3b82f6",
              backgroundColor: "rgba(59,130,246,0.12)",
              borderColor: "rgba(59,130,246,0.35)",
            },
          }}
        >
          {isSidebarOpen ? <MenuOpenRoundedIcon /> : <MenuRoundedIcon />}
        </IconButton>

        <Typography
          variant="h5"
          className="
            font-spaceGrotesk 
            text-[#e5e2e1]
          "
          sx={{
            fontWeight: 700,
            fontSize: "1.375rem",
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
