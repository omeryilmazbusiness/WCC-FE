"use client";

import { forwardRef, useImperativeHandle, useRef, type HTMLAttributes, type ReactNode } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/shared/lib/cn";

type ScrollFlyInProps = HTMLAttributes<HTMLDivElement> & {
  /** Static content pinned in the middle while the image flies across. */
  children: ReactNode;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  /** Empty for a purely decorative image. */
  imageAlt?: string;
};

/**
 * Scroll-linked hero: the content stays pinned for one screen of scrolling while the
 * image crosses it from one side to the other. Viewport units keep it SSR-safe; with
 * reduced motion the image is hidden by CSS (so server and client markup match).
 */
export const ScrollFlyIn = forwardRef<HTMLDivElement, ScrollFlyInProps>(function ScrollFlyIn(
  { children, imageUrl, imageWidth, imageHeight, imageAlt = "", className, ...props },
  ref,
) {
  const targetRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => targetRef.current as HTMLDivElement);

  const { scrollYProgress } = useScroll({ target: targetRef, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0.1, 0.8], ["-500vw", "250vw"]);
  const opacity = useTransform(scrollYProgress, [0.1, 0.25, 0.7, 0.8], [0, 1, 1, 0]);

  return (
    <div ref={targetRef} className={cn("relative h-[200vh]", className)} {...props}>
      <div className="sticky top-0 flex h-dvh items-center justify-center overflow-x-clip">
        <div className="relative z-10 text-center">{children}</div>
        <motion.div
          style={{ x, opacity }}
          className="pointer-events-none absolute inset-0 z-20 flex items-center will-change-transform motion-reduce:hidden"
          aria-hidden={imageAlt ? undefined : true}
        >
          <Image
            src={imageUrl}
            alt={imageAlt}
            width={imageWidth}
            height={imageHeight}
            sizes="(max-width: 768px) 160vw, 2000px"
            className="h-auto w-[min(160vw,2000px)] max-w-none select-none"
            draggable={false}
          />
        </motion.div>
      </div>
    </div>
  );
});
