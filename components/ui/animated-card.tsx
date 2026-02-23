'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedCardProps {
    children: ReactNode;
    delay?: number;
    className?: string;
}

export default function AnimatedCard({ children, delay = 0, className = '' }: AnimatedCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.5,
                delay,
                ease: [0.4, 0, 0.2, 1], // Custom easing for smooth feel
            }}
            whileHover={{
                scale: 1.02,
                y: -4,
                transition: { duration: 0.2 },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
