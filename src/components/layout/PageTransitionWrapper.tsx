
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

// Định nghĩa các biến thể animation
const variants = {
  // Trạng thái ban đầu của trang khi bắt đầu vào
  initialState: {
    opacity: 0,
    x: 100, 
  },
  // Trạng thái trang sẽ chuyển đến
  animateState: {
    opacity: 1,
    x: 0,
  },
  // Trạng thái của trang khi thoát ra
  exitState: {
    opacity: 0,
    x: -100,
  },
};

const PageTransitionWrapper = ({ children }: { children: ReactNode }) => {
  // Lấy đường dẫn URL hiện tại. Đây là "chìa khóa" để AnimatePresence biết khi nào trang thay đổi.
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        // Gán key bằng URL, mỗi khi URL thay đổi, Framer Motion sẽ coi đây là một component mới
        key={pathname}
        variants={variants}
        initial="initialState"
        animate="animateState"
        exit="exitState"
        transition={{ type: 'tween', ease: 'easeInOut', duration: 0.5 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransitionWrapper;
