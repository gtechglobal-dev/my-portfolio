import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Palette, Eye } from 'lucide-react';

interface GraphicsDesign {
  id: string;
  title: string;
  category: string;
  description: string;
  image: string;
  color: string;
  createdAt: string;
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 100, damping: 14 },
  },
};

const modalOverlay = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
};

const modalPanel = {
  hidden: { opacity: 0, scale: 0.92, y: 40 },
  show: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: 'spring' as const, stiffness: 200, damping: 25 },
  },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } },
};

function GraphicsModal({ design, onClose }: { design: GraphicsDesign; onClose: () => void }) {
  return (
    <motion.div
      variants={modalOverlay}
      initial="hidden"
      animate="show"
      exit="hidden"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        variants={modalPanel}
        initial="hidden"
        animate="show"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#151412] border border-white/[0.06] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="relative">
          <div className="w-full bg-[#0c0b0a] rounded-t-2xl flex items-center justify-center p-4 min-h-[200px] max-h-[65vh]">
            <img
              src={design.image}
              alt={design.title}
              className="max-w-full max-h-[60vh] object-contain rounded-lg"
            />
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>
        <div className="p-6 md:p-7">
          <span className="text-[11px] uppercase tracking-wider text-white/40">{design.category}</span>
          <h2 className="text-xl font-bold mt-1 mb-3">{design.title}</h2>
          {design.description && (
            <p className="text-sm text-[#a09890] leading-relaxed mb-5">{design.description}</p>
          )}
          <div className="flex items-center gap-2 pt-4 border-t border-white/[0.05]">
            <Eye className="w-3.5 h-3.5" style={{ color: design.color }} />
            <span className="text-xs text-white/40">
              Uploaded {new Date(design.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function GraphicsGallery() {
  const [designs, setDesigns] = useState<GraphicsDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GraphicsDesign | null>(null);

  useEffect(() => {
    fetch('/api/graphics')
      .then((r) => r.json())
      .then((data) => setDesigns(data.graphics || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-indigo border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <div className="text-center py-20">
        <Palette className="w-12 h-12 text-[#6b6560] mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Designs Yet</h3>
        <p className="text-sm text-[#a09890]">Graphics designs will appear here once uploaded from the admin panel.</p>
      </div>
    );
  }

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5"
      >
        {designs.map((d) => (
          <motion.div
            key={d.id}
            variants={cardVariants}
            whileHover={{ y: -6, scale: 1.02, transition: { type: 'spring' as const, stiffness: 300, damping: 15 } }}
            onClick={() => setSelected(d)}
            className="card p-0 overflow-hidden cursor-pointer group"
          >
            <div
              className="relative w-full aspect-[4/3] overflow-hidden bg-[#0c0b0a] flex items-center justify-center p-3"
            >
              <img
                src={d.image}
                alt={d.title}
                className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/[0.06]">
                  <Eye className="w-3 h-3 text-white/70" />
                  <span className="text-[10px] font-medium text-white/80 uppercase tracking-wider">View</span>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-5">
              <span className="text-[10px] uppercase tracking-wider text-white/40">{d.category}</span>
              <h3 className="text-sm font-semibold mt-0.5 mb-1.5">{d.title}</h3>
              {d.description && (
                <p className="text-xs text-[#a09890] leading-relaxed line-clamp-2">{d.description}</p>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence>
        {selected && <GraphicsModal design={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </>
  );
}
