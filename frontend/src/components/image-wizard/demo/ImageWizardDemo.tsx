import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageWizard } from '../ImageWizard';
import { ImageResult } from '../types';
import { Search, Image, Sparkles, Target } from 'lucide-react';

const ImageWizardDemo: React.FC = () => {
  const [query, setQuery] = useState('');
  const [maxSelections, setMaxSelections] = useState(3);
  const [context, setContext] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [selectedImages, setSelectedImages] = useState<ImageResult[]>([]);
  const [showWizard, setShowWizard] = useState(false);

  const handleImageSelect = (images: ImageResult[]) => {
    setSelectedImages(images);
  };

  const handleSearch = () => {
    if (query.trim()) {
      setShowWizard(true);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ImageWizard - Demonstração
        </h1>
        <p className="text-gray-600">
          Teste completo do sistema de seleção inteligente de imagens
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Busca Inteligente de Imagens
          </CardTitle>
          <CardDescription>
            Configure os parâmetros para busca contextual e seleção inteligente de imagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="query">Termo de Busca</Label>
              <Input
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: marketing digital"
              />
            </div>
            <div>
              <Label htmlFor="context">Contexto do Conteúdo</Label>
              <Input
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Ex: artigo sobre estratégias"
              />
            </div>
            <div>
              <Label htmlFor="audience">Público-alvo</Label>
              <Input
                id="audience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Ex: empreendedores"
              />
            </div>
          </div>

          <Button 
            onClick={handleSearch} 
            disabled={!query.trim()}
            className="w-full"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Buscar Imagens Inteligentes
          </Button>
        </CardContent>
      </Card>

      {/* ImageWizard Component */}
      {showWizard && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Seleção Inteligente de Imagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ImageWizard
              initialQuery={query}
              contentContext={context}
              targetAudience={targetAudience}
              onImageSelect={handleImageSelect}
              maxSelections={maxSelections}
              className=""
            />
          </CardContent>
        </Card>
      )}

      {/* Selected Images Display */}
      {selectedImages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Imagens Selecionadas ({selectedImages.length})
            </CardTitle>
            <CardDescription>
              Imagens escolhidas com base na análise inteligente de relevância e SEO
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {selectedImages.map((image, index) => (
                <div key={image.id} className="space-y-3">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={image.url}
                      alt={image.alt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary">#{index + 1}</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium line-clamp-2">{image.alt}</div>
                    
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        SEO: {image.analysis?.seoOptimization || image.seoScore}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Relevância: {image.analysis?.contentRelevance || image.relevanceScore}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Qualidade: {image.analysis?.technicalQuality || image.qualityScore}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      <div>Fonte: {image.source}</div>
                      <div>Por: {image.photographer}</div>
                      <div>Orientação: {image.orientation}</div>
                    </div>
                    
                    {image.emotionalImpact && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {image.emotionalImpact.split(',').map((emotion: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {emotion.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {image.colorPalette && (
                      <div className="flex gap-1 mt-2">
                        {image.colorPalette.slice(0, 5).map((color: string, idx: number) => (
                          <div
                            key={idx}
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Como Usar o ImageWizard</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="features" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="features">Funcionalidades</TabsTrigger>
              <TabsTrigger value="scoring">Sistema de Pontuação</TabsTrigger>
              <TabsTrigger value="integration">Integração</TabsTrigger>
            </TabsList>

            <TabsContent value="features" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">🔍 Busca Inteligente</h4>
                  <p className="text-sm text-gray-600">
                    Busca contextual em múltiplas fontes (Unsplash, Pexels, Pixabay, Freepik) 
                    com análise de relevância baseada no conteúdo e público-alvo.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">📊 Análise SEO</h4>
                  <p className="text-sm text-gray-600">
                    Avaliação automática de alt text, nome do arquivo, relevância 
                    para palavras-chave e potencial de otimização.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">🎨 Análise Visual</h4>
                  <p className="text-sm text-gray-600">
                    Extração de paleta de cores, análise de composição, 
                    orientação e qualidade técnica das imagens.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">💡 Impacto Emocional</h4>
                  <p className="text-sm text-gray-600">
                    Identificação automática de elementos emocionais e 
                    psicológicos que aumentam o engajamento.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="scoring" className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Score SEO (0-100)</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Alt text otimizado com palavras-chave</li>
                    <li>• Nome do arquivo descritivo</li>
                    <li>• Relevância para o conteúdo</li>
                    <li>• Potencial de busca por imagem</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Score de Relevância (0-100)</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Correspondência com termo de busca</li>
                    <li>• Adequação ao contexto do conteúdo</li>
                    <li>• Alinhamento com público-alvo</li>
                    <li>• Coerência temática</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Score de Qualidade (0-100)</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Resolução e nitidez</li>
                    <li>• Composição e enquadramento</li>
                    <li>• Iluminação e contraste</li>
                    <li>• Profissionalismo visual</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="integration" className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">FaceBlog Integration</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    O ImageWizard está integrado ao sistema de criação de posts do FaceBlog:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Seleção automática baseada no conteúdo do post</li>
                    <li>• Análise de compatibilidade com o tema</li>
                    <li>• Otimização para diferentes formatos de post</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">BigWriter Integration</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    No BigWriter, o ImageWizard complementa a criação de artigos:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Seleção baseada no assunto e palavras-chave</li>
                    <li>• Análise de adequação ao público-alvo</li>
                    <li>• Integração com o sistema SEO existente</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">API Usage</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    O componente pode ser usado programaticamente:
                  </p>
                  <div className="bg-gray-100 p-3 rounded text-xs font-mono">
                    {`import { ImageWizard } from '@/components/image-wizard';

<ImageWizard
  query="marketing digital"
  context="artigo sobre estratégias"
  targetAudience="empreendedores"
  onImageSelect={handleSelection}
  maxSelection={3}
/>`}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageWizardDemo;
