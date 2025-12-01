"use client";
import React, { useRef, useEffect } from "react";
import { useTheme } from "next-themes";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
}

export const Sparkles = () => {
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      initParticles();
    };

    const createParticle = (): Particle => {
      const isDark = resolvedTheme === "dark";
      // Colors: Darker Blue-ish for light theme, White/Blue for dark theme
      const colors = isDark
        ? ["#FFFFFF", "#60A5FA", "#3B82F6"] // White, Blue-400, Blue-500
        : ["#172554", "#1e3a8a", "#1d4ed8"]; // Blue-950, Blue-900, Blue-700 (Darker for visibility)

      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5, // Size between 0.5 and 2.5
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random(),
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    };

    const initParticles = () => {
      particles = [];
      const particleCount = 100; // Number of sparkles

      for (let i = 0; i < particleCount; i++) {
        particles.push(createParticle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, index) => {
        // Update position
        p.x += p.speedX;
        p.y += p.speedY;

        // Pulse opacity
        p.opacity += (Math.random() - 0.5) * 0.02;
        if (p.opacity < 0.1) p.opacity = 0.1;
        if (p.opacity > 1) p.opacity = 1;

        // Wrap around screen
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Draw connecting lines for close particles (optional, makes it look like a mesh)
      // Keeping it simple: just sparkles for now as requested "bonito e visivel"
      // but let's add a subtle mouse interaction if we can?
      // User asked for "something beautiful and visible".
      // Let's stick to just nice floating particles to avoid clutter.

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [resolvedTheme]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-white dark:bg-black"
    >
      {/* Gradient Overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-300/60 via-transparent to-purple-300/60 dark:from-blue-900/20 dark:via-transparent dark:to-purple-900/20 pointer-events-none" />

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};
