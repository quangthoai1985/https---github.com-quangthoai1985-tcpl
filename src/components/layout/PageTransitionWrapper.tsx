
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

// Định nghĩa các biến thể animation
const variants = {
  // Trạng thái ban đầu của trang khi bắt đầu vào
  initialState: {
    opacity: 0,
    x: 50, // Bắt đầu từ bên phải, giảm khoảng cách để hiệu ứng nhẹ nhàng hơn
  },
  // Trạng thái trang sẽ chuyển đến
  animateState: {
    opacity: 1,
    x: 0, // Di chuyển vào giữa màn hình
  },
  // Trạng thái của trang khi thoát ra
  exitState: {
    opacity: 0,
    x: -50, // Di chuyển sang bên trái (ngược hướng với khi vào)
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
