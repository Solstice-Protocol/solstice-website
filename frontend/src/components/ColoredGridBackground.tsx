import { useState, useMemo, useEffect } from 'react';

// 2D Grid Cube with directional color trail
const GridCube = ({
    size,
}: {
    size: number;
}) => {
    const [hoverState, setHoverState] = useState<{
        active: boolean;
        direction: 'top' | 'bottom' | 'left' | 'right' | null;
    }>({ active: false, direction: null });

    const handleMouseEnter = (e: React.MouseEvent<HTMLLIElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        // Calculate angle and determine direction
        const angle = Math.atan2(y, x);
        const normalizedAngle = (angle * 180 / Math.PI + 180) % 360;

        // 45-135: Bottom, 135-225: Left, 225-315: Top, 315-45: Right
        let direction: 'top' | 'bottom' | 'left' | 'right';

        if (normalizedAngle >= 45 && normalizedAngle < 135) {
            direction = 'bottom';
        } else if (normalizedAngle >= 135 && normalizedAngle < 225) {
            direction = 'left';
        } else if (normalizedAngle >= 225 && normalizedAngle < 315) {
            direction = 'top';
        } else {
            direction = 'right';
        }

        setHoverState({ active: true, direction });
    };

    const handleMouseLeave = () => {
        setHoverState(prev => ({ ...prev, active: false }));
    };

    const getBackgroundColor = () => {
        if (!hoverState.direction) return 'transparent'; // Default state

        switch (hoverState.direction) {
            case 'top': return 'var(--color-vintage-grape-500)';
            case 'bottom': return '#60a5fa'; // Blue
            case 'left': return '#f472b6'; // Pink
            case 'right': return '#facc15'; // Yellow
            default: return 'transparent';
        }
    };

    return (
        <li
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="inline-block relative"
            style={{
                width: `${size}px`,
                height: `${size}px`,
            }}
        >
            <div
                className="absolute inset-0"
                style={{
                    backgroundColor: hoverState.active ? getBackgroundColor() : 'transparent',
                    opacity: hoverState.active ? 0.6 : 0, // Fade opacity for trail
                    border: '1px solid rgba(255, 255, 255, 0.03)',
                    // Instant in, slow out (trail effect)
                    transition: hoverState.active
                        ? 'background-color 0s, opacity 0s'
                        : 'background-color 0.8s, opacity 0.8s',
                }}
            />
        </li>
    );
};

// Cube Grid - high density
export function ColoredGridBackground() {
    const [dimensions, setDimensions] = useState({
        cols: 0,
        rows: 0
    });
    const cubeSize = 25;

    useEffect(() => {
        const updateDimensions = () => {
            const cols = Math.ceil(window.innerWidth / cubeSize) + 2;
            const rows = Math.ceil(window.innerHeight / cubeSize) + 2;
            setDimensions({ cols, rows });
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    const totalCubes = dimensions.cols * dimensions.rows;

    const cubes = useMemo(() =>
        Array.from({ length: totalCubes }).map((_, i) => i),
        [totalCubes]
    );

    if (totalCubes === 0) return null;

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            <ul
                className="list-none p-0 m-0 flex flex-wrap pointer-events-auto"
                style={{
                    width: `${dimensions.cols * cubeSize}px`,
                }}
            >
                {cubes.map((index) => (
                    <GridCube
                        key={index}
                        size={cubeSize}
                    />
                ))}
            </ul>
        </div>
    );
}

export default ColoredGridBackground;
