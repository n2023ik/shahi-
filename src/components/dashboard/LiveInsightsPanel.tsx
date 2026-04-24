import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, CheckCircle2, Clock, X } from 'lucide-react';

interface LiveInsightsPanelProps {
  onStatClick?: (statType: 'deliveries' | 'ontime' | 'tat') => void;
}

export const LiveInsightsPanel = ({ onStatClick }: LiveInsightsPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedStat, setSelectedStat] = useState<'deliveries' | 'ontime' | 'tat' | null>(null);

  const stats = [
    { 
      id: 'deliveries',
      icon: Truck, 
      label: 'Active Deliveries', 
      value: '24', 
      color: 'text-cyan-400',
      bgColor: 'from-cyan-500/10 to-cyan-600/5',
      borderColor: 'border-cyan-500/30 hover:border-cyan-400/50'
    },
    { 
      id: 'ontime',
      icon: CheckCircle2, 
      label: 'On-Time Rate', 
      value: '91.2%', 
      color: 'text-emerald-400',
      bgColor: 'from-emerald-500/10 to-emerald-600/5',
      borderColor: 'border-emerald-500/30 hover:border-emerald-400/50'
    },
    { 
      id: 'tat',
      icon: Clock, 
      label: 'Avg TAT', 
      value: '4.2d', 
      color: 'text-amber-400',
      bgColor: 'from-amber-500/10 to-amber-600/5',
      borderColor: 'border-amber-500/30 hover:border-amber-400/50'
    },
  ];

  const handleStatClick = (statId: 'deliveries' | 'ontime' | 'tat') => {
    setSelectedStat(statId);
    onStatClick?.(statId);
  };

  const collapsedView = (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      onClick={() => setIsExpanded(true)}
      className="group relative mx-3 mt-4 p-4 rounded-lg bg-gradient-to-br from-slate-800/40 via-slate-900/30 to-slate-800/20 backdrop-blur-md border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer"
    >
      {/* Animated glow effect on hover */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-cyan-500/0 via-transparent to-emerald-500/0 group-hover:from-cyan-500/5 group-hover:via-cyan-500/3 group-hover:to-emerald-500/5 transition-all duration-300 pointer-events-none" />

      {/* Scale transform on hover */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative z-10"
      >
        {/* Title */}
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
          Live Insights
        </h3>

        {/* Stats Grid */}
        <div className="space-y-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                whileHover={{ x: 4 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatClick(stat.id as any);
                }}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-900/40 border border-slate-700/30 hover:border-slate-600/50 hover:bg-slate-900/60 transition-all duration-200 group/item cursor-pointer"
              >
                {/* Icon */}
                <div className={`flex-shrink-0 p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 group-hover/item:border-slate-600 transition-all duration-200 ${stat.color}`}>
                  <Icon size={14} className="stroke-2" />
                </div>

                {/* Label and Value */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 truncate">{stat.label}</p>
                  <p className="text-sm font-bold text-slate-100">{stat.value}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );

  const expandedView = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4"
      onClick={() => setIsExpanded(false)}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 rounded-2xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 overflow-hidden"
      >
        {/* Header */}
        <div className="relative p-6 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Live Insights Details</h2>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <X size={20} className="text-slate-400 hover:text-slate-200" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.id}
                layoutId={`stat-${stat.id}`}
                onClick={() => handleStatClick(stat.id as any)}
                className={`p-4 rounded-xl border-2 bg-gradient-to-br ${stat.bgColor} ${stat.borderColor} cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-slate-500/10`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 p-3 rounded-lg bg-slate-800 border border-slate-700 ${stat.color}`}>
                    <Icon size={24} className="stroke-2" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-400 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-slate-500 mt-2">Click to view more details</p>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Delivery Card Preview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 p-4 rounded-xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-sm"
          >
            <div className="mb-3">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                ON TIME
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Active Delivery</h3>
            <p className="text-xs text-slate-400 mb-3">Okhla Phase I, New Delhi</p>
            <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-orange-500 h-full w-3/4 rounded-full" />
            </div>
            <p className="text-xs text-slate-500 mt-2">75% Complete • ETA 4.2 hours</p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <>
      {collapsedView}
      <AnimatePresence>
        {isExpanded && expandedView}
      </AnimatePresence>
    </>
  );
};
