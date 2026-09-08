import toast from "react-hot-toast";
import { motion } from "framer-motion";

const ToastUI = (message: string, color: string) => {
  return (
    <div className="relative bg-green-900 text-white px-4 py-3 rounded-xl shadow-lg overflow-hidden min-w-55">
      <div className="text-sm font-medium">{message}</div>

      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 3, ease: "linear" }}
        className={`absolute bottom-0 left-0 h-1 w-full origin-left ${color}`}
      />
    </div>
  );
};

export const notify = {
  success: (message: string) => {
    toast.custom(() => ToastUI(message, "bg-green-500"));
  },

  error: (message: string) => {
    toast.custom(() => ToastUI(message, "bg-red-500"));
  },
};