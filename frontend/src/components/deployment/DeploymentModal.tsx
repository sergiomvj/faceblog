import React, { useState, useEffect } from 'react';
import { X, Rocket, Globe, Palette, Code, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Template {
  name: string;
  display_name: string;
  description: string;
  features: string[];
  framework: string;
}

interface FormData {
  blog_name: string;
  subdomain: string;
  custom_domain: string;
  owner_email: string;
  owner_name: string;
  company_name: string;
  niche: string;
  theme: string;
  primary_color: string;
  template: string;
}

const DeploymentModal: React.FC<DeploymentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    blog_name: '',
    subdomain: '',
    custom_domain: '',
    owner_email: '',
    owner_name: '',
    company_name: '',
    niche: 'general',
    theme: 'modern',
    primary_color: '#3B82F6',
    template: 'modern-blog'
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [subdomainChecking, setSubdomainChecking] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);

  const steps = [
    { id: 1, title: 'Informações Básicas', icon: Globe },
    { id: 2, title: 'Personalização', icon: Palette },
    { id: 3, title: 'Template & Deploy', icon: Code }
  ];

  const themes = [
    { value: 'modern', label: 'Moderno', color: '#3B82F6' },
    { value: 'classic', label: 'Clássico', color: '#6B7280' },
    { value: 'minimal', label: 'Minimalista', color: '#10B981' },
    { value: 'corporate', label: 'Corporativo', color: '#7C3AED' },
    { value: 'creative', label: 'Criativo', color: '#F59E0B' }
  ];

  const niches = [
    'general', 'technology', 'business', 'health', 'education', 
    'lifestyle', 'travel', 'food', 'fashion', 'sports'
  ];

  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
  ];

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.subdomain && formData.subdomain.length >= 3) {
      const timer = setTimeout(() => {
        checkSubdomainAvailability(formData.subdomain);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.subdomain]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/deployment/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      
      const data = await response.json();
      setTemplates(data.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Erro ao carregar templates');
    }
  };

  const checkSubdomainAvailability = async (subdomain: string) => {
    setSubdomainChecking(true);
    try {
      const response = await fetch(`/api/deployment/check-subdomain/${subdomain}`);
      const data = await response.json();
      setSubdomainAvailable(data.available);
    } catch (error) {
      console.error('Error checking subdomain:', error);
      setSubdomainAvailable(null);
    } finally {
      setSubdomainChecking(false);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<FormData> = {};

    if (step === 1) {
      if (!formData.blog_name.trim()) newErrors.blog_name = 'Nome do blog é obrigatório';
      if (!formData.subdomain.trim()) newErrors.subdomain = 'Subdomínio é obrigatório';
      if (!formData.owner_email.trim()) newErrors.owner_email = 'Email é obrigatório';
      if (!formData.owner_name.trim()) newErrors.owner_name = 'Nome é obrigatório';
      
      // Validar formato do subdomínio
      const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
      if (formData.subdomain && (!subdomainRegex.test(formData.subdomain) || formData.subdomain.length < 3)) {
        newErrors.subdomain = 'Subdomínio deve ter pelo menos 3 caracteres e usar apenas letras, números e hífens';
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (formData.owner_email && !emailRegex.test(formData.owner_email)) {
        newErrors.owner_email = 'Email inválido';
      }

      // Verificar se subdomínio está disponível
      if (subdomainAvailable === false) {
        newErrors.subdomain = 'Subdomínio não está disponível';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      const response = await fetch('/api/deployment/provision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create deployment');
      }

      const data = await response.json();
      onSuccess();
      toast.success('Deployment iniciado com sucesso!');
    } catch (error: any) {
      console.error('Error creating deployment:', error);
      toast.error(error.message || 'Erro ao criar deployment');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Auto-gerar subdomínio baseado no nome do blog
    if (field === 'blog_name' && !formData.subdomain) {
      const subdomain = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 30);
      setFormData(prev => ({ ...prev, subdomain }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Rocket className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">
              Novo Deployment
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  currentStep >= step.id 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-4 h-4" />
                  )}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-blue-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {/* Step 1: Informações Básicas */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Blog *
                </label>
                <input
                  type="text"
                  value={formData.blog_name}
                  onChange={(e) => handleInputChange('blog_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.blog_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Ex: Meu Blog Incrível"
                />
                {errors.blog_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.blog_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subdomínio *
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={formData.subdomain}
                    onChange={(e) => handleInputChange('subdomain', e.target.value.toLowerCase())}
                    className={`flex-1 px-3 py-2 border rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.subdomain ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="meublog"
                  />
                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-600">
                    .faceblog.com
                  </span>
                </div>
                {subdomainChecking && (
                  <p className="text-blue-500 text-sm mt-1">Verificando disponibilidade...</p>
                )}
                {subdomainAvailable === true && (
                  <p className="text-green-500 text-sm mt-1 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Subdomínio disponível
                  </p>
                )}
                {subdomainAvailable === false && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Subdomínio não disponível
                  </p>
                )}
                {errors.subdomain && (
                  <p className="text-red-500 text-sm mt-1">{errors.subdomain}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domínio Customizado (opcional)
                </label>
                <input
                  type="text"
                  value={formData.custom_domain}
                  onChange={(e) => handleInputChange('custom_domain', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="blog.meusite.com"
                />
                <p className="text-gray-500 text-sm mt-1">
                  Configure seu próprio domínio (requer configuração DNS)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Proprietário *
                  </label>
                  <input
                    type="text"
                    value={formData.owner_name}
                    onChange={(e) => handleInputChange('owner_name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.owner_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="João Silva"
                  />
                  {errors.owner_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.owner_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.owner_email}
                    onChange={(e) => handleInputChange('owner_email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.owner_email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="joao@exemplo.com"
                  />
                  {errors.owner_email && (
                    <p className="text-red-500 text-sm mt-1">{errors.owner_email}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Empresa (opcional)
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Minha Empresa"
                />
              </div>
            </div>
          )}

          {/* Step 2: Personalização */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nicho do Blog
                </label>
                <select
                  value={formData.niche}
                  onChange={(e) => handleInputChange('niche', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {niches.map(niche => (
                    <option key={niche} value={niche}>
                      {niche.charAt(0).toUpperCase() + niche.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tema
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {themes.map(theme => (
                    <div
                      key={theme.value}
                      onClick={() => handleInputChange('theme', theme.value)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        formData.theme === theme.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: theme.color }}
                        />
                        <div>
                          <h4 className="font-medium text-gray-900">{theme.label}</h4>
                          <p className="text-sm text-gray-500">
                            Tema {theme.label.toLowerCase()} e elegante
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Cor Primária
                </label>
                <div className="flex flex-wrap gap-3">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => handleInputChange('primary_color', color)}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        formData.primary_color === color
                          ? 'border-gray-900 scale-110'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="mt-3">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => handleInputChange('primary_color', e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Template & Deploy */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Template
                </label>
                <div className="space-y-3">
                  {templates.map(template => (
                    <div
                      key={template.name}
                      onClick={() => handleInputChange('template', template.name)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        formData.template === template.name
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full mt-2 ${
                          formData.template === template.name ? 'bg-blue-500' : 'bg-gray-300'
                        }`} />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{template.display_name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {template.features.slice(0, 4).map(feature => (
                              <span
                                key={feature}
                                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {feature.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Framework: {template.framework}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Preview do Deployment</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Blog:</span>
                    <span className="font-medium">{formData.blog_name || 'Nome do Blog'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">URL:</span>
                    <span className="font-medium text-blue-600">
                      {formData.custom_domain || `${formData.subdomain || 'subdomain'}.faceblog.com`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tema:</span>
                    <span className="font-medium">{themes.find(t => t.value === formData.theme)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Template:</span>
                    <span className="font-medium">{templates.find(t => t.name === formData.template)?.display_name}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Anterior
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancelar
            </button>
            
            {currentStep < steps.length ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Próximo
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    Criar Deployment
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeploymentModal;
