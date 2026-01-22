import { motion } from 'framer-motion';

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center gap-4 mb-8"
    >
      <div className="flex items-center">
        <img 
          src="/almax logo.png" 
          alt="ALMAX Logo" 
          className="h-20 w-auto"
        />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-almax-blue tracking-tight">
          Automação Fiscal
        </h1>
        <p className="text-sm text-almax-blue/70">
          XML → Excel • NF-e / CT-e
        </p>
      </div>
    </motion.header>
  );
}
