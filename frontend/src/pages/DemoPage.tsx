import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SEODemo from '@/components/seo/demo/SEODemo';
import ImageWizardDemo from '@/components/image-wizard/demo/ImageWizardDemo';
import { Search, Image, Sparkles, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const DemoPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            FaceBlog & BigWriter - Sistema Integrado
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Demonstração completa dos sistemas SEO e ImageWizard
          </p>
          
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">100%</div>
                  <div className="text-sm text-gray-600">SEO Component</div>
                  <Badge variant="default" className="mt-2">Completo</Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">100%</div>
                  <div className="text-sm text-gray-600">ImageWizard</div>
                  <Badge variant="default" className="mt-2">Completo</Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">100%</div>
                  <div className="text-sm text-gray-600">Integração</div>
                  <Badge variant="default" className="mt-2">Completo</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Demo Tabs */}
        <Tabs defaultValue="seo" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="seo" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              SEO Wizard
            </TabsTrigger>
            <TabsTrigger value="images" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Image Wizard
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
          </TabsList>

          <TabsContent value="seo" className="mt-6">
            <SEODemo />
          </TabsContent>

          <TabsContent value="images" className="mt-6">
            <ImageWizardDemo />
          </TabsContent>

          <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
              {/* Project Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Visão Geral da Implementação
                  </CardTitle>
                  <CardDescription>
                    Status completo da integração entre FaceBlog e BigWriter
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">FaceBlog - SEO Component</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">SEOWizard principal implementado</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Hook useSEOAnalysis completo</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Backend services implementados</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Análise de concorrentes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Descoberta de conteúdo viral</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Links externos inteligentes</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">ImageWizard Universal</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Componente standalone criado</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Busca inteligente multi-fonte</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Análise de relevância e SEO</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Scoring de qualidade</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Análise de impacto emocional</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Integração com BigWriter</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Architecture Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Arquitetura dos Sistemas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">Frontend Components</h4>
                      <ul className="text-sm space-y-1">
                        <li>• SEOWizard.tsx</li>
                        <li>• ImageWizard.tsx</li>
                        <li>• useSEOAnalysis hook</li>
                        <li>• useImageWizard hook</li>
                        <li>• Tipos TypeScript</li>
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">Backend Services</h4>
                      <ul className="text-sm space-y-1">
                        <li>• seo-intelligence.js</li>
                        <li>• content-discovery.js</li>
                        <li>• competitor-analysis.js</li>
                        <li>• trends-api.js</li>
                        <li>• external-links.js</li>
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">Integrações</h4>
                      <ul className="text-sm space-y-1">
                        <li>• BigWriter ArticleForm</li>
                        <li>• KeywordSelectionSection</li>
                        <li>• ImageSelectionSection</li>
                        <li>• APIs externas (mock)</li>
                        <li>• Supabase PostgreSQL</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Next Steps */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Próximos Passos Recomendados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-medium">Fase 1 - Refinamento (1-2 semanas)</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm">Testes unitários completos</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm">Integração com APIs reais</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm">Otimização de performance</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm">Documentação técnica</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Fase 2 - Expansão (2-3 semanas)</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">Analytics dashboard</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">A/B testing de recomendações</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">Machine learning para scoring</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">API própria centralizada</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Technical Specs */}
              <Card>
                <CardHeader>
                  <CardTitle>Especificações Técnicas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Tecnologias Utilizadas</h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">React 18</Badge>
                        <Badge variant="outline">TypeScript</Badge>
                        <Badge variant="outline">Tailwind CSS</Badge>
                        <Badge variant="outline">Lucide React</Badge>
                        <Badge variant="outline">Node.js</Badge>
                        <Badge variant="outline">Supabase</Badge>
                        <Badge variant="outline">PostgreSQL</Badge>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">APIs Integradas (Planejadas)</h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">Google Trends</Badge>
                        <Badge variant="secondary">BuzzSumo</Badge>
                        <Badge variant="secondary">Keyword Planner</Badge>
                        <Badge variant="secondary">Unsplash</Badge>
                        <Badge variant="secondary">Pexels</Badge>
                        <Badge variant="secondary">Pixabay</Badge>
                        <Badge variant="secondary">Freepik</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DemoPage;
