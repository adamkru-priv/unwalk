interface HeroHeaderProps {
  date: Date;
}

export function HeroHeader({ date }: HeroHeaderProps) {
  return (
    <div className="text-center mb-2 px-5">
      <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1">
        Let's get moving
      </h1>
      <p className="text-sm text-gray-600 dark:text-white/50">
        {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
}
