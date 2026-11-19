// component.tsx
'use client';

import { useScroll, useTransform, motion, MotionValue } from 'motion/react';
import React, { useRef } from 'react';

interface SectionProps {
  scrollYProgress: MotionValue<number>;
}

/** Grid overlay used on both sections. */
const GRID =
  "absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]";

const IMAGES = [
  { src: '/assets/scene-02.jpg', alt: 'Cargo moving inland by rail' },
  { src: '/assets/scene-04.jpg', alt: 'Customs desk' },
  { src: '/assets/scene-06.jpg', alt: 'Yard slot optimizer at work' },
  { src: '/assets/scene-09.jpg', alt: 'Invoice and release' },
];

const Section1: React.FC<SectionProps> = ({ scrollYProgress }) => {
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, -5]);
  return (
    <motion.section
      style={{ scale, rotate }}
      className='sticky font-semibold top-0 h-screen bg-gradient-to-t to-[#dadada] from-[#ebebeb] flex flex-col items-center justify-center text-black'
    >
      <div className={GRID}></div>

      <h1 className='2xl:text-7xl text-6xl px-8 font-semibold text-center tracking-tight leading-[120%]'>
        One terminal. Every container, <br /> every move. Scroll on &darr;
      </h1>
    </motion.section>
  );
};

const Section2: React.FC<SectionProps> = ({ scrollYProgress }) => {
  const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
  const rotate = useTransform(scrollYProgress, [0, 1], [5, 0]);

  return (
    <motion.section
      style={{ scale, rotate }}
      className='relative h-screen bg-gradient-to-t to-[#1a1919] from-[#06060e] text-white '
    >
      <div className={GRID}></div>
      <article className='container mx-auto relative z-10 px-4'>
        <h1 className='text-4xl md:text-6xl leading-[100%] py-10 font-semibold tracking-tight '>
          From vessel to gate, <br /> nothing is out of place
        </h1>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          {IMAGES.map((img) => (
            <img key={img.src} src={img.src} alt={img.alt} className='object-cover w-full rounded-md h-full aspect-[3/4]' />
          ))}
        </div>
      </article>
    </motion.section>
  );
};

/** Two sections that scale and rotate into each other while the page scrolls. */
export function Component() {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start start', 'end end'],
  });

  return (
    <div className='tw-root'>
      {/* a div, not <main>: the legacy stylesheet pads every <main> */}
      <div ref={container} className='relative h-[200vh] bg-black'>
        <Section1 scrollYProgress={scrollYProgress} />
        <Section2 scrollYProgress={scrollYProgress} />
        <footer className='group bg-[#06060e] '>
          <h1 className='text-[16vw] translate-y-20 leading-[100%] uppercase font-semibold text-center bg-gradient-to-r from-gray-400 to-gray-800 bg-clip-text text-transparent transition-all ease-linear'>
            SmartPort
          </h1>
          <div className='bg-black text-white h-40 relative z-10 grid place-content-center text-2xl rounded-tr-full rounded-tl-full'></div>
        </footer>
      </div>
    </div>
  );
}

Component.displayName = 'Component';

export default Component;
