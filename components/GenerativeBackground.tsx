import React, { useRef, useEffect } from 'react';

interface GenerativeBackgroundProps {
  theme: 'light' | 'dark';
  isVisible: boolean;
}

const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

const GenerativeBackground: React.FC<GenerativeBackgroundProps> = ({ theme, isVisible }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        const mouse = { x: -1000, y: -1000, radius: 100 };
        
        const colors = theme === 'light' ? {
            particle: '#4f46e5', // light-primary
            line: '#BCC0C4'      // light-text-subtle
        } : {
            particle: '#6366f1', // dark-primary
            line: '#3A3B3C'      // dark-border
        };
        const lineColorRgb = hexToRgb(colors.line);

        const setCanvasSize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            radius: number;
            baseColor: string;
            color: string;

            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.radius = Math.random() * 1.5 + 1;
                this.baseColor = colors.particle;
                this.color = this.baseColor;
            }

            draw() {
                ctx!.save();
                ctx!.beginPath();
                ctx!.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx!.shadowBlur = 8;
                ctx!.shadowColor = this.color;
                ctx!.fillStyle = this.color;
                ctx!.fill();
                ctx!.restore();
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
                if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

                // Mouse interaction
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < mouse.radius) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (mouse.radius - distance) / mouse.radius * 0.5;
                    this.vx += forceDirectionX * force;
                    this.vy += forceDirectionY * force;
                }

                // Dampening to slow down particles
                this.vx *= 0.99;
                this.vy *= 0.99;
            }
        }

        const init = () => {
            setCanvasSize();
            particles = [];
            const particleCount = (canvas.width * canvas.height) / 12000;
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
        };

        const connect = () => {
            if (!lineColorRgb) return;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 120) {
                        ctx!.beginPath();
                        ctx!.moveTo(particles[i].x, particles[i].y);
                        ctx!.lineTo(particles[j].x, particles[j].y);
                        ctx!.strokeStyle = `rgba(${lineColorRgb.r}, ${lineColorRgb.g}, ${lineColorRgb.b}, ${1 - distance / 120})`;
                        ctx!.lineWidth = 0.5;
                        ctx!.stroke();
                    }
                }
            }
        };

        const animate = () => {
            ctx!.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            connect();
            animationFrameId = requestAnimationFrame(animate);
        };
        
        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        init();
        animate();

        window.addEventListener('resize', init);
        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('resize', init);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, [theme]); // Rerun effect if theme changes

    return (
        <div id="generative-bg-container" className={isVisible ? 'visible' : ''}>
            <div className="bg-image-layer"></div>
            <canvas id="generative-bg" ref={canvasRef} />
        </div>
    );
};

export default GenerativeBackground;