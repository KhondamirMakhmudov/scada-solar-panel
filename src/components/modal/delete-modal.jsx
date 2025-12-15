import { Modal, Box, Button, Typography } from "@mui/material";

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
          bgcolor: "#4C1D95", // violet-800
          boxShadow: 24,
          p: 4,
          borderRadius: "12px",
          border: "1px solid #6D28D9", // violet-700
        }}
      >
        <Typography
          sx={{
            fontFamily: "Manrope",
            color: "#E9D5FF", // text-violet-200
            fontSize: "18px",
            fontWeight: 600,
            mb: 2,
          }}
        >
          {title}
        </Typography>

        {children}

        <div className="flex gap-2 mt-5 manrope">
          {/* Cancel Button */}
          <Button
            sx={{
              width: "50%",
              backgroundColor: "#7C3AED", // violet-600
              color: "white",
              textTransform: "initial",
              fontSize: "15px",
              fontFamily: "Manrope",
              borderRadius: "8px",
              "&:hover": {
                backgroundColor: "#6D28D9", // violet-700
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
              width: "50%",
              backgroundColor: "#A78BFA", // violet-400
              color: "#2E1065", // violet-950
              textTransform: "initial",
              fontSize: "15px",
              fontWeight: 600,
              fontFamily: "Manrope",
              borderRadius: "8px",
              "&:hover": {
                backgroundColor: "#8B5CF6", // violet-500
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
