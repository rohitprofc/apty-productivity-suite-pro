import { motion } from "framer-motion";

const ToggleSwitch = ({ isChecked, onChange }) => {
  return (
    <motion.label whileTap={{ scale: 0.9 }} className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={isChecked} onChange={onChange} className="sr-only peer" />
      <motion.div
        className="w-12 h-7 bg-gray-300 peer-focus:ring-2 peer-focus:ring-[#E04A2F] rounded-full peer peer-checked:bg-[#E04A2F] peer-checked:shadow-md peer-checked:shadow-orange-300 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"
      />
    </motion.label>
  );
};

export default ToggleSwitch;
