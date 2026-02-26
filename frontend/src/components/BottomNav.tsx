import { Home, Compass, PlusSquare, User, type LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

type Tab = 'feed' | 'explore' | 'upload' | 'profile';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs: { id: Tab; icon: ComponentType<LucideProps>; label: string }[] = [
  { id: 'feed', icon: Home, label: 'Home' },
  { id: 'explore', icon: Compass, label: 'Explore' },
  { id: 'upload', icon: PlusSquare, label: 'Upload' },
  { id: 'profile', icon: User, label: 'Profile' },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-nav safe-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200 relative"
              aria-label={tab.label}
            >
              {tab.id === 'upload' ? (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, #8A2BE2, #00FFFF)'
                      : 'linear-gradient(135deg, #8A2BE2, #6a1fb5)',
                    boxShadow: isActive
                      ? '0 0 20px rgba(138, 43, 226, 0.6)'
                      : '0 0 10px rgba(138, 43, 226, 0.3)',
                  }}
                >
                  <Icon size={20} strokeWidth={2} color="white" />
                </div>
              ) : (
                <>
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    color={isActive ? '#8A2BE2' : 'rgba(255,255,255,0.5)'}
                  />
                  {isActive && (
                    <span
                      className="absolute -bottom-0.5 w-1 h-1 rounded-full"
                      style={{ background: '#8A2BE2' }}
                    />
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
