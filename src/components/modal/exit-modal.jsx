import { Modal, Box, Button, Typography } from "@mui/material";

const ExitModal = ({ open, onClose, handleLogout }) => {
  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 450,
          bgcolor: "#312b3f",
          boxShadow: 24,
          p: 4,
          borderRadius: "8px",
        }}
      >
        <div className="manrope">
          <Typography sx={{ color: "white", fontFamily: "Manrope" }}>
            Вы уверены, что хотите покинуть страницу?
          </Typography>
        </div>

        <div className="flex  gap-1 mt-4">
          <Button
            sx={{
              boxShadow: "none",
              color: "black",
              backgroundColor: "#C9C9C9",
              width: "50%",
            }}
            onClick={onClose}
            variant="contained"
          >
            Нет
          </Button>
          <Button
            sx={{
              fontFamily: "DM Sans, sans-serif",
              color: "#991300",
              backgroundColor: "#FCD8D3",
              boxShadow: "none",
              "&hover": {
                boxShadow: 14,
              },
              width: "50%",
            }}
            onClick={handleLogout}
          >
            Да
          </Button>
        </div>
      </Box>
    </Modal>
  );
};

export default ExitModal;
