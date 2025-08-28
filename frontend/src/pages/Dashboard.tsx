import React from 'react';
import { FileText, Users, MessageSquare, Eye, TrendingUp, Building2 } from 'lucide-react';

const Dashboard: React.FC = () => {
  const stats = [
    {
      name: 'Total de Artigos',
      value: '2,847',
      change: '+12%',
      changeType: 'positive',
      icon: FileText,
    },
    {
      name: 'Usuários Ativos',
      value: '1,234',
      change: '+8%',
      changeType: 'positive',
      icon: Users,
    },
    {
      name: 'Comentários',
      value: '5,678',
      change: '+23%',
      changeType: 'positive',
      icon: MessageSquare,
    },
    {
      name: 'Visualizações',
      value: '89,432',
      change: '+15%',
      changeType: 'positive',
      icon: Eye,
    },
    {
      name: 'Tenants Ativos',
      value: '47',
      change: '+5%',
      changeType: 'positive',
      icon: Building2,
    },
    {
      name: 'Taxa de Crescimento',
      value: '18.2%',
      change: '+2.1%',
      changeType: 'positive',
      icon: TrendingUp,
    },
  ];

  const recentArticles = [
    {
      id: 1,
      title: 'Como implementar autenticação JWT em Node.js',
      author: 'João Silva',
      status: 'published',
      views: 1234,
      publishedAt: '2025-08-10',
    },
    {
      id: 2,
      title: 'Guia completo de React Hooks',
      author: 'Maria Santos',
      status: 'draft',
      views: 0,
      publishedAt: null,
    },
    {
      id: 3,
      title: 'Melhores práticas para APIs REST',
      author: 'Pedro Costa',
      status: 'published',
      views: 856,
      publishedAt: '2025-08-09',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          Última atualização: {new Date().toLocaleString('pt-BR')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((item) => (
          <div
            key={item.name}
            className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden"
          >
            <dt>
              <div className="absolute bg-primary-500 rounded-md p-3">
                <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 text-sm font-medium text-gray-500 truncate">{item.name}</p>
            </dt>
            <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
              <p
                className={`ml-2 flex items-baseline text-sm font-semibold ${
                  item.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {item.change}
              </p>
            </dd>
          </div>
        ))}
      </div>

      {/* Recent Articles */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Artigos Recentes
          </h3>
          <div className="flow-root">
            <ul className="-my-5 divide-y divide-gray-200">
              {recentArticles.map((article) => (
                <li key={article.id} className="py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {article.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        Por {article.author} • {article.views} visualizações
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          article.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {article.status === 'published' ? 'Publicado' : 'Rascunho'}
                      </span>
                      {article.publishedAt && (
                        <span className="text-sm text-gray-500">
                          {new Date(article.publishedAt).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6">
            <a
              href="/articles"
              className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Ver todos os artigos
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
