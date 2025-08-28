import React, { useState, useEffect } from 'react';
import {
  EyeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ShareIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface SEOPreviewProps {
  title: string;
  description: string;
  slug: string;
  imageUrl?: string;
  siteName?: string;
  domain?: string;
  className?: string;
}

const SEOPreview: React.FC<SEOPreviewProps> = ({
  title,
  description,
  slug,
  imageUrl,
  siteName = 'FaceBlog',
  domain = 'exemplo.com',
  className = ''
}) => {
  const [activePreview, setActivePreview] = useState<'google' | 'facebook' | 'twitter' | 'linkedin'>('google');
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');

  // Gerar URL completa
  const fullUrl = `https://${domain}/${slug}`;
  
  // Truncar texto para diferentes plataformas
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  // Validar comprimentos
  const titleLength = title.length;
  const descriptionLength = description.length;
  
  const getTitleStatus = () => {
    if (titleLength === 0) return { color: 'text-gray-400', message: 'Título necessário' };
    if (titleLength < 30) return { color: 'text-yellow-600', message: 'Muito curto' };
    if (titleLength > 60) return { color: 'text-red-600', message: 'Muito longo' };
    return { color: 'text-green-600', message: 'Ideal' };
  };

  const getDescriptionStatus = () => {
    if (descriptionLength === 0) return { color: 'text-gray-400', message: 'Descrição necessária' };
    if (descriptionLength < 120) return { color: 'text-yellow-600', message: 'Muito curta' };
    if (descriptionLength > 160) return { color: 'text-red-600', message: 'Muito longa' };
    return { color: 'text-green-600', message: 'Ideal' };
  };

  const titleStatus = getTitleStatus();
  const descriptionStatus = getDescriptionStatus();

  const previewTypes = [
    { id: 'google', name: 'Google', icon: MagnifyingGlassIcon },
    { id: 'facebook', name: 'Facebook', icon: ShareIcon },
    { id: 'twitter', name: 'Twitter', icon: ShareIcon },
    { id: 'linkedin', name: 'LinkedIn', icon: ShareIcon },
  ];

  const GooglePreview = () => (
    <div className={`bg-white p-4 ${deviceView === 'mobile' ? 'max-w-sm' : 'max-w-2xl'}`}>
      <div className="space-y-1">
        <div className="flex items-center text-sm text-gray-600">
          <span className="text-green-700">{domain}</span>
          <span className="mx-1">›</span>
          <span>{slug}</span>
        </div>
        <h3 className="text-xl text-blue-600 hover:underline cursor-pointer leading-tight">
          {truncateText(title, deviceView === 'mobile' ? 50 : 60) || 'Título do seu artigo'}
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {truncateText(description, deviceView === 'mobile' ? 120 : 160) || 'Descrição do seu artigo aparecerá aqui...'}
        </p>
        <div className="flex items-center text-xs text-gray-500 mt-2">
          <span>{new Date().toLocaleDateString('pt-BR')}</span>
          <span className="mx-2">•</span>
          <span>{siteName}</span>
        </div>
      </div>
    </div>
  );

  const FacebookPreview = () => (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${deviceView === 'mobile' ? 'max-w-sm' : 'max-w-lg'}`}>
      {imageUrl && (
        <div className="aspect-video bg-gray-200 flex items-center justify-center">
          <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-3">
        <div className="text-xs text-gray-500 uppercase mb-1">{domain}</div>
        <h3 className="font-semibold text-gray-900 leading-tight mb-1">
          {truncateText(title, 80) || 'Título do seu artigo'}
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {truncateText(description, 200) || 'Descrição do seu artigo aparecerá aqui...'}
        </p>
      </div>
    </div>
  );

  const TwitterPreview = () => (
    <div className={`bg-white border border-gray-200 rounded-2xl overflow-hidden ${deviceView === 'mobile' ? 'max-w-sm' : 'max-w-lg'}`}>
      {imageUrl && (
        <div className="aspect-video bg-gray-200 flex items-center justify-center">
          <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-3 border-t border-gray-100">
        <div className="text-xs text-gray-500 mb-1">{domain}</div>
        <h3 className="font-semibold text-gray-900 leading-tight mb-1">
          {truncateText(title, 70) || 'Título do seu artigo'}
        </h3>
        <p className="text-sm text-gray-600">
          {truncateText(description, 125) || 'Descrição do seu artigo aparecerá aqui...'}
        </p>
      </div>
    </div>
  );

  const LinkedInPreview = () => (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${deviceView === 'mobile' ? 'max-w-sm' : 'max-w-lg'}`}>
      {imageUrl && (
        <div className="aspect-video bg-gray-200 flex items-center justify-center">
          <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 leading-tight mb-2">
          {truncateText(title, 150) || 'Título do seu artigo'}
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed mb-2">
          {truncateText(description, 200) || 'Descrição do seu artigo aparecerá aqui...'}
        </p>
        <div className="text-xs text-gray-500">{domain}</div>
      </div>
    </div>
  );

  const renderPreview = () => {
    switch (activePreview) {
      case 'google':
        return <GooglePreview />;
      case 'facebook':
        return <FacebookPreview />;
      case 'twitter':
        return <TwitterPreview />;
      case 'linkedin':
        return <LinkedInPreview />;
      default:
        return <GooglePreview />;
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <EyeIcon className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Preview SEO</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setDeviceView('desktop')}
              className={`p-2 rounded-md ${
                deviceView === 'desktop' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Visualização Desktop"
            >
              <ComputerDesktopIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeviceView('mobile')}
              className={`p-2 rounded-md ${
                deviceView === 'mobile' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Visualização Mobile"
            >
              <DevicePhoneMobileIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Platform Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6 px-4" aria-label="Tabs">
          {previewTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setActivePreview(type.id as any)}
                className={`${
                  activePreview === type.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon className="h-4 w-4 mr-1" />
                {type.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Validation Status */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Título ({titleLength} caracteres):</span>
            <span className={`font-medium ${titleStatus.color}`}>
              {titleStatus.message}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Descrição ({descriptionLength} caracteres):</span>
            <span className={`font-medium ${descriptionStatus.color}`}>
              {descriptionStatus.message}
            </span>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="p-6">
        <div className="flex justify-center">
          <div className={`${deviceView === 'mobile' ? 'w-full max-w-sm' : 'w-full'}`}>
            {/* Platform Label */}
            <div className="text-center mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                {previewTypes.find(p => p.id === activePreview)?.name} Preview
                <span className="ml-2 text-xs text-gray-500">
                  ({deviceView === 'mobile' ? 'Mobile' : 'Desktop'})
                </span>
              </span>
            </div>

            {/* Preview Container */}
            <div className="flex justify-center">
              <div className={`${
                activePreview === 'google' 
                  ? 'bg-gray-50 p-4 rounded-lg' 
                  : 'bg-gray-50 p-4 rounded-lg'
              }`}>
                {renderPreview()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="border-t border-gray-200 px-4 py-3 bg-blue-50">
        <div className="text-sm text-blue-800">
          <strong>Dicas de Otimização:</strong>
          <ul className="mt-1 space-y-1 text-xs">
            <li>• Título: 30-60 caracteres para melhor exibição</li>
            <li>• Descrição: 120-160 caracteres para Google</li>
            <li>• Use palavras-chave no início do título</li>
            <li>• Inclua uma call-to-action na descrição</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>URL: {fullUrl}</span>
          <span>Atualizado em tempo real</span>
        </div>
      </div>
    </div>
  );
};

export default SEOPreview;
