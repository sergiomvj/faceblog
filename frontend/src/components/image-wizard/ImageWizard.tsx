import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  Image, 
  Zap, 
  Eye, 
  Download,
  Heart,
  Star,
  TrendingUp,
  Palette,
  Filter,
  Grid,
  List,
  RefreshCw
} from "lucide-react";

import { ImageResult, ImageAnalysis } from './types';

interface ImageWizardProps {
  onImageSelect?: (images: ImageResult[]) => void;
  initialQuery?: string;
  maxSelections?: number;
  contentContext?: string;
  targetAudience?: string;
  className?: string;
}

export const ImageWizard: React.FC<ImageWizardProps> = ({
  onImageSelect,
  initialQuery = '',
  maxSelections = 5,
  contentContext = '',
  targetAudience = '',
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ImageResult[]>([]);
  const [selectedImages, setSelectedImages] = useState<ImageResult[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('search');
  const [filters, setFilters] = useState({
    source: 'all',
    orientation: 'all',
    color: 'all',
    minSeoScore: 0
  });

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    try {
      // Simular busca inteligente de imagens
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockResults = generateMockImageResults(searchTerm, contentContext, targetAudience);
      setSearchResults(mockResults);
      setActiveTab('results');
    } catch (error) {
      console.error('Erro na busca de imagens:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleImageToggle = (image: ImageResult) => {
    const isSelected = selectedImages.some(img => img.id === image.id);
    
    if (isSelected) {
      const newSelection = selectedImages.filter(img => img.id !== image.id);
      setSelectedImages(newSelection);
      onImageSelect?.(newSelection);
    } else if (selectedImages.length < maxSelections) {
      const newSelection = [...selectedImages, image];
      setSelectedImages(newSelection);
      onImageSelect?.(newSelection);
    }
  };

  const analyzeImageForContent = (image: ImageResult): ImageAnalysis => {
    return {
      contentRelevance: image.relevanceScore,
      seoOptimization: image.seoScore,
      visualAppeal: image.qualityScore,
      emotionalResonance: Math.floor(Math.random() * 30) + 70,
      brandAlignment: Math.floor(Math.random() * 25) + 75,
      technicalQuality: Math.floor(Math.random() * 20) + 80,
      suggestions: generateImageSuggestions(image)
    };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEmotionalImpactIcon = (impact: string) => {
    switch (impact) {
      case 'inspiring': return '✨';
      case 'calming': return '🌊';
      case 'energetic': return '⚡';
      case 'professional': return '💼';
      case 'friendly': return '😊';
      default: return '🎯';
    }
  };

  return (
    <Card className={`border-0 shadow-lg bg-white/80 backdrop-blur-sm ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-600" />
          Image Wizard - Seleção Inteligente de Imagens
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Busca */}
        <div className="flex gap-2">
          <Input
            placeholder="Descreva o tipo de imagem que você precisa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button 
            onClick={() => handleSearch()}
            disabled={!searchQuery.trim() || isSearching}
            className="min-w-[120px]"
          >
            {isSearching ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Buscando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Buscar
              </div>
            )}
          </Button>
        </div>

        {/* Contexto adicional */}
        {(contentContext || targetAudience) && (
          <div className="flex gap-2 text-sm">
            {contentContext && (
              <Badge variant="outline" className="bg-blue-50">
                Contexto: {contentContext}
              </Badge>
            )}
            {targetAudience && (
              <Badge variant="outline" className="bg-green-50">
                Público: {targetAudience}
              </Badge>
            )}
          </div>
        )}

        {/* Resultados */}
        {searchResults.length > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="results">Resultados ({searchResults.length})</TabsTrigger>
              <TabsTrigger value="selected">Selecionadas ({selectedImages.length})</TabsTrigger>
              <TabsTrigger value="analysis">Análise</TabsTrigger>
            </TabsList>

            {/* Resultados da busca */}
            <TabsContent value="results" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
                <Badge variant="outline">
                  {selectedImages.length}/{maxSelections} selecionadas
                </Badge>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {searchResults.map((image) => {
                    const isSelected = selectedImages.some(img => img.id === image.id);
                    return (
                      <div
                        key={image.id}
                        className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          isSelected 
                            ? 'border-blue-500 shadow-lg' 
                            : 'border-transparent hover:border-gray-300'
                        }`}
                        onClick={() => handleImageToggle(image)}
                      >
                        <div className="aspect-square relative">
                          <img
                            src={image.thumbnailUrl}
                            alt={image.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          
                          {/* Overlay com informações */}
                          <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                            <div className="flex gap-1">
                              <Badge className="bg-black/70 text-white text-xs">
                                SEO: {image.seoScore}
                              </Badge>
                            </div>
                            {isSelected && (
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">✓</span>
                              </div>
                            )}
                          </div>

                          <div className="absolute bottom-2 left-2 right-2">
                            <div className="flex items-center gap-1 text-xs">
                              <Badge className="bg-black/70 text-white text-xs">
                                {getEmotionalImpactIcon(image.emotionalImpact)} {image.emotionalImpact}
                              </Badge>
                              <Badge className="bg-black/70 text-white text-xs">
                                {image.source}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="p-2">
                          <p className="text-sm font-medium truncate">{image.title}</p>
                          <p className="text-xs text-gray-600 truncate">{image.photographer}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={image.relevanceScore} className="flex-1 h-1" />
                            <span className="text-xs text-gray-500">{image.relevanceScore}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((image) => {
                    const isSelected = selectedImages.some(img => img.id === image.id);
                    return (
                      <div
                        key={image.id}
                        className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleImageToggle(image)}
                      >
                        <img
                          src={image.thumbnailUrl}
                          alt={image.title}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{image.title}</span>
                            {isSelected && <Badge className="bg-blue-500">Selecionada</Badge>}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{image.photographer}</p>
                          <div className="flex items-center gap-4 text-xs">
                            <span className={getScoreColor(image.seoScore)}>
                              SEO: {image.seoScore}/100
                            </span>
                            <span className={getScoreColor(image.relevanceScore)}>
                              Relevância: {image.relevanceScore}/100
                            </span>
                            <span className={getScoreColor(image.qualityScore)}>
                              Qualidade: {image.qualityScore}/100
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {image.source}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-gray-500">
                            {image.dimensions.width}x{image.dimensions.height}
                          </span>
                          <div className="flex gap-1">
                            {image.colorPalette.slice(0, 3).map((color, index) => (
                              <div
                                key={index}
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Imagens selecionadas */}
            <TabsContent value="selected" className="space-y-4">
              {selectedImages.length === 0 ? (
                <div className="text-center py-8">
                  <Image className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">Nenhuma imagem selecionada</p>
                  <p className="text-sm text-gray-400">Volte para "Resultados" e selecione até {maxSelections} imagens</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedImages.map((image, index) => (
                    <div key={image.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <img
                          src={image.thumbnailUrl}
                          alt={image.title}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">#{index + 1}</span>
                            <span className="text-sm">{image.title}</span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{image.photographer}</p>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500">SEO:</span>
                              <span className={`ml-1 font-medium ${getScoreColor(image.seoScore)}`}>
                                {image.seoScore}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Relevância:</span>
                              <span className={`ml-1 font-medium ${getScoreColor(image.relevanceScore)}`}>
                                {image.relevanceScore}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Qualidade:</span>
                              <span className={`ml-1 font-medium ${getScoreColor(image.qualityScore)}`}>
                                {image.qualityScore}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleImageToggle(image)}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Análise */}
            <TabsContent value="analysis" className="space-y-4">
              {selectedImages.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">Selecione imagens para ver a análise</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedImages.map((image, index) => {
                    const analysis = analyzeImageForContent(image);
                    return (
                      <Card key={image.id}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <span>#{index + 1} - {image.title}</span>
                            <Badge variant="outline">{image.source}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Relevância do Conteúdo</p>
                              <div className="flex items-center gap-2">
                                <Progress value={analysis.contentRelevance} className="flex-1" />
                                <span className="text-sm font-medium">{analysis.contentRelevance}%</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Otimização SEO</p>
                              <div className="flex items-center gap-2">
                                <Progress value={analysis.seoOptimization} className="flex-1" />
                                <span className="text-sm font-medium">{analysis.seoOptimization}%</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Apelo Visual</p>
                              <div className="flex items-center gap-2">
                                <Progress value={analysis.visualAppeal} className="flex-1" />
                                <span className="text-sm font-medium">{analysis.visualAppeal}%</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Ressonância Emocional</p>
                              <div className="flex items-center gap-2">
                                <Progress value={analysis.emotionalResonance} className="flex-1" />
                                <span className="text-sm font-medium">{analysis.emotionalResonance}%</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Alinhamento de Marca</p>
                              <div className="flex items-center gap-2">
                                <Progress value={analysis.brandAlignment} className="flex-1" />
                                <span className="text-sm font-medium">{analysis.brandAlignment}%</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Qualidade Técnica</p>
                              <div className="flex items-center gap-2">
                                <Progress value={analysis.technicalQuality} className="flex-1" />
                                <span className="text-sm font-medium">{analysis.technicalQuality}%</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-medium mb-2">Sugestões de Otimização:</p>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {analysis.suggestions.map((suggestion, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-blue-600">•</span>
                                  {suggestion}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Botão de aplicar seleção */}
        {selectedImages.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
            <div>
              <p className="font-medium">Imagens selecionadas: {selectedImages.length}</p>
              <p className="text-sm text-gray-600">
                Scores médios - SEO: {Math.round(selectedImages.reduce((sum, img) => sum + img.seoScore, 0) / selectedImages.length)}, 
                Relevância: {Math.round(selectedImages.reduce((sum, img) => sum + img.relevanceScore, 0) / selectedImages.length)}
              </p>
            </div>
            <Button onClick={() => onImageSelect?.(selectedImages)}>
              Aplicar Seleção
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Funções auxiliares
function generateMockImageResults(query: string, context: string, audience: string): ImageResult[] {
  const sources: Array<'unsplash' | 'pexels' | 'pixabay' | 'freepik'> = ['unsplash', 'pexels', 'pixabay', 'freepik'];
  const emotions = ['inspiring', 'calming', 'energetic', 'professional', 'friendly'];
  const results: ImageResult[] = [];

  for (let i = 0; i < 12; i++) {
    const source = sources[Math.floor(Math.random() * sources.length)];
    const emotion = emotions[Math.floor(Math.random() * emotions.length)];
    
    results.push({
      id: `img-${i + 1}`,
      url: `https://picsum.photos/800/600?random=${i + 1}`,
      thumbnailUrl: `https://picsum.photos/300/300?random=${i + 1}`,
      title: `${query} - Imagem ${i + 1}`,
      alt: `${query} - Imagem ${i + 1}`,
      description: `Imagem relacionada a ${query} com foco em ${context}`,
      photographer: `Photographer ${i + 1}`,
      source,
      tags: [query, context, audience].filter(Boolean),
      dimensions: {
        width: 800 + Math.floor(Math.random() * 400),
        height: 600 + Math.floor(Math.random() * 400)
      },
      orientation: Math.random() > 0.5 ? 'landscape' : 'portrait',
      seoScore: Math.floor(Math.random() * 30) + 70,
      relevanceScore: Math.floor(Math.random() * 25) + 75,
      qualityScore: Math.floor(Math.random() * 20) + 80,
      emotionalImpact: emotion,
      colorPalette: generateRandomColors(),
      downloadUrl: `https://picsum.photos/800/600?random=${i + 1}`,
      license: 'Free for commercial use'
    });
  }

  return results.sort((a, b) => b.seoScore - a.seoScore);
}

function generateRandomColors(): string[] {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
  return colors.slice(0, Math.floor(Math.random() * 3) + 3);
}

function generateImageSuggestions(image: ImageResult): string[] {
  const suggestions = [
    'Adicionar texto alt otimizado para SEO',
    'Comprimir imagem para melhor performance',
    'Usar em destaque no início do artigo',
    'Adicionar legenda descritiva',
    'Considerar versão em diferentes tamanhos',
    'Otimizar para redes sociais',
    'Adicionar marca d\'água se necessário'
  ];

  return suggestions.slice(0, Math.floor(Math.random() * 3) + 2);
}
