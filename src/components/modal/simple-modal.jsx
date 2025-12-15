import { AnimatePresence, motion } from "framer-motion";

const SimpleModal = ({ children, classname }) => {
  return (
    <AnimatePresence>
      <motion.div
        className={`fixed  top-0 right-0 z-50 transition-all w-1/2 bg-opacity-70 duration-300 ${classname}`}
      >
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-[16px] shadow-lg  min-h-screen font-sf "
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SimpleModal;
