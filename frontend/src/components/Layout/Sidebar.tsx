import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  FileText,
  Users,
  Building,
  MessageCircle,
  Hash,
  FolderOpen,
  Trophy,
  Award,
  Brain,
  Share2,
  BarChart3,
  Settings,
  Rocket
} from 'lucide-react';
import Logo from '../Logo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: FileText, label: 'Artigos', path: '/articles' },
    { icon: FolderOpen, label: 'Categorias', path: '/categories' },
    { icon: Hash, label: 'Tags', path: '/tags' },
    { icon: MessageCircle, label: 'Comentários', path: '/comments' },
    { icon: Users, label: 'Usuários', path: '/users' },
    { icon: Building, label: 'Tenants', path: '/tenants' },
    { icon: Rocket, label: 'Deployments', path: '/deployments' },
    { icon: Brain, label: 'Quizzes', path: '/quizzes' },
    { icon: Trophy, label: 'Ranking', path: '/leaderboards' },
    { icon: Award, label: 'Premiação', path: '/rewards' },
    { icon: Share2, label: 'Social', path: '/social-integrations' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: Settings, label: 'Configurações', path: '/settings' },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 lg:translate-x-0 lg:static lg:inset-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-center h-16 border-b border-gray-200 px-4">
          <Logo size="lg" showText={true} className="w-full justify-center" />
        </div>

        <nav className="mt-8">
          <div className="px-4 space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
                onClick={() => onClose()}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>


      </div>
    </>
  );
};

export default Sidebar;
