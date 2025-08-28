import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  Search,
  Target,
  BarChart3,
  Lightbulb,
  ExternalLink,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Wand2,
  Globe,
  Eye
} from 'lucide-react';

import { useSEOAnalysis } from './hooks/useSEOAnalysis';
import TrendingSuggestions from '../TrendingSuggestions';
import KeywordResearch from './KeywordResearch';
import CompetitorAnalysis from './CompetitorAnalysis';
import ExternalLinkSuggestions from './ExternalLinkSuggestions';
import SEOAnalyzer from './SEOAnalyzer';

import { SEOWizardProps, SEOAnalysisResult } from './types';

const SEOWizard: React.FC<SEOWizardProps> = ({
  content = '',
  targetKeyword = '',
  niche = 'general',
  geo = 'BR',
  onAnalysisComplete,
  className = ''
}) => {
  const [localContent, setLocalContent] = useState(content);
  const [localKeyword, setLocalKeyword] = useState(targetKeyword);
  const [localNiche, setLocalNiche] = useState(niche);
  const [localGeo, setLocalGeo] = useState(geo);
  const [activeTab, setActiveTab] = useState('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { analysis, loading, error, analyzeContent, clearAnalysis } = useSEOAnalysis();

  useEffect(() => {
    if (analysis && onAnalysisComplete) {
      onAnalysisComplete(analysis);
    }
  }, [analysis, onAnalysisComplete]);

  const handleAnalyze = async () => {
    if (!localContent.trim() || !localKeyword.trim()) {
      alert('Por favor, insira o conteúdo e a palavra-chave principal');
      return;
    }

    setIsAnalyzing(true);
    clearAnalysis();

    try {
      await analyzeContent(localContent, localKeyword, localNiche, localGeo);
      setActiveTab('results');
    } catch (err) {
      console.error('Erro na análise:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 60) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    return <AlertCircle className="h-5 w-5 text-red-600" />;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Wand2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-gray-900">SEO Wizard</CardTitle>
              <CardDescription className="text-gray-600">
                Sistema inteligente de otimização para mecanismos de busca
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Input Section */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-600" />
            <span>Configuração da Análise</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="keyword">Palavra-chave Principal *</Label>
              <Input
                id="keyword"
                placeholder="Ex: marketing digital"
                value={localKeyword}
                onChange={(e) => setLocalKeyword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="niche">Nicho</Label>
              <Input
                id="niche"
                placeholder="Ex: tecnologia, saúde, negócios"
                value={localNiche}
                onChange={(e) => setLocalNiche(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo do Artigo *</Label>
            <Textarea
              id="content"
              placeholder="Cole aqui o conteúdo do seu artigo para análise SEO..."
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{localContent.split(/\s+/).filter(word => word.length > 0).length} palavras</span>
              <span>Mínimo recomendado: 300 palavras</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-gray-500" />
              <select
                value={localGeo}
                onChange={(e) => setLocalGeo(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="BR">Brasil</option>
                <option value="US">Estados Unidos</option>
                <option value="PT">Portugal</option>
                <option value="ES">Espanha</option>
              </select>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || loading || !localContent.trim() || !localKeyword.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isAnalyzing || loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Analisar SEO
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Results Section */}
      {analysis && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-gray-100">
            <TabsTrigger value="results" className="flex items-center space-x-1">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Resultados</span>
            </TabsTrigger>
            <TabsTrigger value="keywords" className="flex items-center space-x-1">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Keywords</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center space-x-1">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Trends</span>
            </TabsTrigger>
            <TabsTrigger value="competitors" className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Concorrentes</span>
            </TabsTrigger>
            <TabsTrigger value="links" className="flex items-center space-x-1">
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Links</span>
            </TabsTrigger>
            <TabsTrigger value="analyzer" className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Análise</span>
            </TabsTrigger>
          </TabsList>

          {/* Results Overview */}
          <TabsContent value="results" className="space-y-6">
            {/* SEO Score Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className={`border-2 ${getScoreColor(analysis.score.overall)}`}>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    {getScoreIcon(analysis.score.overall)}
                  </div>
                  <div className="text-2xl font-bold">{analysis.score.overall}</div>
                  <div className="text-sm font-medium">Geral</div>
                </CardContent>
              </Card>

              <Card className={`border-2 ${getScoreColor(analysis.score.keyword)}`}>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Target className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold">{analysis.score.keyword}</div>
                  <div className="text-sm font-medium">Keywords</div>
                </CardContent>
              </Card>

              <Card className={`border-2 ${getScoreColor(analysis.score.content)}`}>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold">{analysis.score.content}</div>
                  <div className="text-sm font-medium">Conteúdo</div>
                </CardContent>
              </Card>

              <Card className={`border-2 ${getScoreColor(analysis.score.technical)}`}>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Search className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold">{analysis.score.technical}</div>
                  <div className="text-sm font-medium">Técnico</div>
                </CardContent>
              </Card>

              <Card className={`border-2 ${getScoreColor(analysis.score.backlinks)}`}>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <ExternalLink className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold">{analysis.score.backlinks}</div>
                  <div className="text-sm font-medium">Backlinks</div>
                </CardContent>
              </Card>

              <Card className={`border-2 ${getScoreColor(analysis.score.social)}`}>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold">{analysis.score.social}</div>
                  <div className="text-sm font-medium">Social</div>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  <span>Recomendações Prioritárias</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.recommendations.slice(0, 5).map((rec, index) => (
                    <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                      <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                        {rec.priority}
                      </Badge>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                        <p className="text-gray-600 text-sm mt-1">{rec.description}</p>
                        <p className="text-blue-600 text-sm mt-2 font-medium">{rec.implementation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Viral Potential */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>Potencial Viral</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl font-bold text-green-600">
                      {analysis.viralPotential.score}%
                    </div>
                    <Progress value={analysis.viralPotential.score} className="flex-1" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Fatores Identificados</h4>
                      <div className="space-y-1">
                        {analysis.viralPotential.factors.map((factor, index) => (
                          <Badge key={index} variant="outline" className="mr-2 mb-1">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Triggers Sociais</h4>
                      <div className="space-y-1">
                        {analysis.viralPotential.socialTriggers.map((trigger, index) => (
                          <Badge key={index} variant="secondary" className="mr-2 mb-1">
                            {trigger}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Dicas de Compartilhamento</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      {analysis.viralPotential.shareabilityTips.map((tip, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-blue-600">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Keywords Tab */}
          <TabsContent value="keywords">
            <KeywordResearch 
              keywords={analysis.keywords}
              targetKeyword={analysis.targetKeyword}
              onKeywordSelect={(keyword) => setLocalKeyword(keyword)}
            />
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends">
            <TrendingSuggestions
              mainTopic={analysis.targetKeyword}
              niche={localNiche}
              geo={localGeo}
              onSuggestionSelect={(type, value) => {
                if (type === 'keyword') {
                  setLocalKeyword(value);
                }
              }}
            />
          </TabsContent>

          {/* Competitors Tab */}
          <TabsContent value="competitors">
            <CompetitorAnalysis
              competitors={analysis.competitors}
              targetKeyword={analysis.targetKeyword}
            />
          </TabsContent>

          {/* External Links Tab */}
          <TabsContent value="links">
            <ExternalLinkSuggestions
              links={analysis.externalLinks}
              targetKeyword={analysis.targetKeyword}
            />
          </TabsContent>

          {/* SEO Analyzer Tab */}
          <TabsContent value="analyzer">
            <SEOAnalyzer
              content={analysis.content}
              score={analysis.score}
              suggestions={analysis.score.suggestions}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default SEOWizard;
