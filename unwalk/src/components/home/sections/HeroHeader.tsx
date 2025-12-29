interface HeroHeaderProps {
  xp?: number;
  level?: number;
  onProgressClick?: () => void;
}

export function HeroHeader(_props: HeroHeaderProps) {
  return (
    <div className="px-5">
      <div className="flex items-center justify-between mb-4">
        {/* Hero header without subtitle */}
      </div>
    </div>
  );
}
