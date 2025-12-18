import { Modal, Box, Button, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

const DeleteModal = ({ open, onClose, deleting, title, children }) => {
  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "#1a2e22", // surface-dark
          boxShadow: 24,
          p: 4,
          borderRadius: "12px",
          border: "1px solid #374151", // gray-700
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Typography
            sx={{
              fontFamily: "'Manrope', sans-serif",
              color: "#ffffff", // white
              fontSize: "20px",
              fontWeight: 600,
            }}
          >
            {title}
          </Typography>
        </div>

        <Typography
          sx={{
            fontFamily: "'Manrope', sans-serif",
            color: "#9CA3AF", // gray-400
            fontSize: "15px",
            mb: 3,
          }}
        >
          {children}
        </Typography>

        <div className="flex gap-3 mt-5">
          {/* Cancel Button */}
          <Button
            sx={{
              flex: 1,
              backgroundColor: "#374151", // gray-700
              color: "#ffffff",
              textTransform: "none",
              fontSize: "15px",
              fontFamily: "'Manrope', sans-serif",
              borderRadius: "8px",
              fontWeight: 500,
              py: 1.5,
              "&:hover": {
                backgroundColor: "#4B5563", // gray-600
              },
            }}
            onClick={onClose}
            variant="contained"
          >
            Нет
          </Button>

          {/* Confirm Button */}
          <Button
            sx={{
              flex: 1,
              backgroundColor: "#13ec5b", // primary
              color: "#ffffff",
              textTransform: "none",
              fontSize: "15px",
              fontWeight: 600,
              fontFamily: "'Manrope', sans-serif",
              borderRadius: "8px",
              py: 1.5,
              "&:hover": {
                backgroundColor: "#0bc44d", // primary darker
              },
            }}
            onClick={deleting}
          >
            Да
          </Button>
        </div>
      </Box>
    </Modal>
  );
};

export default DeleteModal;
