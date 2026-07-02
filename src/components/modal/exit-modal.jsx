import { Modal, Box, Button, Typography } from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

const ExitModal = ({ open, onClose, handleLogout }) => {
  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "#1f2937",
          boxShadow: 24,
          p: 4,
          borderRadius: "12px",
          border: "1px solid #334155",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
            <LogoutRoundedIcon fontSize="small" />
          </div>
          <Typography
            sx={{
              fontFamily: "'Manrope', sans-serif",
              color: "#f8fafc",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            Выход из системы
          </Typography>
        </div>

        <Typography
          sx={{
            fontFamily: "'Manrope', sans-serif",
            color: "#cbd5e1",
            fontSize: "15px",
            mb: 3,
          }}
        >
          Вы уверены, что хотите завершить сеанс?
        </Typography>

        <div className="flex gap-3 mt-5">
          <Button
            sx={{
              flex: 1,
              backgroundColor: "#334155",
              color: "#ffffff",
              textTransform: "none",
              fontSize: "15px",
              fontFamily: "'Manrope', sans-serif",
              borderRadius: "8px",
              fontWeight: 500,
              py: 1.5,
              "&:hover": {
                backgroundColor: "#475569",
              },
            }}
            onClick={onClose}
            variant="contained"
          >
            Отмена
          </Button>

          <Button
            sx={{
              flex: 1,
              backgroundColor: "#dc2626",
              color: "#ffffff",
              textTransform: "none",
              fontSize: "15px",
              fontWeight: 600,
              fontFamily: "'Manrope', sans-serif",
              borderRadius: "8px",
              py: 1.5,
              "&:hover": {
                backgroundColor: "#b91c1c",
              },
            }}
            onClick={handleLogout}
          >
            Выйти
          </Button>
        </div>
      </Box>
    </Modal>
  );
};

export default ExitModal;
