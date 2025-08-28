import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useSEOAnalysis } from '../hooks/useSEOAnalysis';
import { Loader2, Search, TrendingUp, Users, ExternalLink, Lightbulb } from 'lucide-react';

const SEODemo: React.FC = () => {
  const [content, setContent] = useState('');
  const [keyword, setKeyword] = useState('');
  const [niche, setNiche] = useState('tecnologia');
  const { analyzeContent, analysis, loading, error } = useSEOAnalysis();

  const handleAnalyze = async () => {
    if (!content.trim() || !keyword.trim()) return;
    await analyzeContent(content, keyword, niche);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          SEO Wizard - Demonstração
        </h1>
        <p className="text-gray-600">
          Teste completo do sistema de análise SEO inteligente
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Análise de Conteúdo
          </CardTitle>
          <CardDescription>
            Insira seu conteúdo e palavra-chave principal para análise SEO completa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="keyword">Palavra-chave Principal</Label>
              <Input
                id="keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Ex: marketing digital"
              />
            </div>
            <div>
              <Label htmlFor="niche">Nicho</Label>
              <Input
                id="niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Ex: tecnologia, saúde, educação"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="content">Conteúdo para Análise</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Cole aqui o conteúdo que deseja analisar..."
              className="min-h-32"
            />
          </div>

          <Button 
            onClick={handleAnalyze} 
            disabled={loading || !content.trim() || !keyword.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Analisar SEO
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {analysis && (
        <div className="space-y-6">
          {/* Overall Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Score SEO Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(analysis.score.overall)}`}>
                    {analysis.score.overall}
                  </div>
                  <div className="text-sm text-gray-500">Score Geral</div>
                </div>
                <div className="flex-1 ml-8">
                  <Progress value={analysis.score.overall} className="h-3" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className={`p-3 rounded-lg ${getScoreBg(analysis.score.keyword)}`}>
                  <div className={`text-lg font-semibold ${getScoreColor(analysis.score.keyword)}`}>
                    {analysis.score.keyword}
                  </div>
                  <div className="text-xs text-gray-600">Keywords</div>
                </div>
                <div className={`p-3 rounded-lg ${getScoreBg(analysis.score.content)}`}>
                  <div className={`text-lg font-semibold ${getScoreColor(analysis.score.content)}`}>
                    {analysis.score.content}
                  </div>
                  <div className="text-xs text-gray-600">Conteúdo</div>
                </div>
                <div className={`p-3 rounded-lg ${getScoreBg(analysis.score.technical)}`}>
                  <div className={`text-lg font-semibold ${getScoreColor(analysis.score.technical)}`}>
                    {analysis.score.technical}
                  </div>
                  <div className="text-xs text-gray-600">Técnico</div>
                </div>
                <div className={`p-3 rounded-lg ${getScoreBg(analysis.score.backlinks)}`}>
                  <div className={`text-lg font-semibold ${getScoreColor(analysis.score.backlinks)}`}>
                    {analysis.score.backlinks}
                  </div>
                  <div className="text-xs text-gray-600">Backlinks</div>
                </div>
                <div className={`p-3 rounded-lg ${getScoreBg(analysis.score.social)}`}>
                  <div className={`text-lg font-semibold ${getScoreColor(analysis.score.social)}`}>
                    {analysis.score.social}
                  </div>
                  <div className="text-xs text-gray-600">Social</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Analysis */}
          <Tabs defaultValue="keywords" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="keywords">Keywords</TabsTrigger>
              <TabsTrigger value="competitors">Concorrentes</TabsTrigger>
              <TabsTrigger value="trending">Tendências</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
              <TabsTrigger value="viral">Viral</TabsTrigger>
            </TabsList>

            <TabsContent value="keywords" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Análise de Palavras-chave</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.keywords.slice(0, 5).map((kw, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{kw.keyword}</div>
                          <div className="text-sm text-gray-500">
                            Volume: {kw.searchVolume.toLocaleString()} | 
                            Dificuldade: {kw.difficulty} | 
                            CPC: ${kw.cpc}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={kw.competition === 'low' ? 'default' : kw.competition === 'medium' ? 'secondary' : 'destructive'}>
                            {kw.competition}
                          </Badge>
                          <Badge variant={kw.trend === 'rising' ? 'default' : 'secondary'}>
                            {kw.trend}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="competitors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Análise de Concorrentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.competitors.map((comp, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium">{comp.title}</div>
                            <div className="text-sm text-gray-500">{comp.domain}</div>
                          </div>
                          <Badge>#{comp.ranking}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500">DA</div>
                            <div className="font-medium">{comp.domainAuthority}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Backlinks</div>
                            <div className="font-medium">{comp.backlinks.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Palavras</div>
                            <div className="font-medium">{comp.contentLength.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Shares</div>
                            <div className="font-medium">
                              {Object.values(comp.socialShares).reduce((a, b) => a + b, 0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trending" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Tendências e Oportunidades
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-3">Termos em Alta</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {analysis.trending.trendingTerms.map((term, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{term.term}</div>
                              <div className="text-sm text-gray-500">
                                Volume: {term.searchVolume?.toLocaleString()}
                              </div>
                            </div>
                            <Badge variant={term.growth === 'high' ? 'default' : 'secondary'}>
                              {term.growth}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Oportunidades</h4>
                      <div className="space-y-3">
                        {analysis.trending.opportunities.map((opp, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">{opp.keyword}</div>
                              <Badge variant={opp.potential === 'high' ? 'default' : 'secondary'}>
                                {opp.potential}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">{opp.reason}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Dificuldade: {opp.difficulty} | CPC: ${opp.cpc}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="links" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    Sugestões de Links Externos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.externalLinks.map((link, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium">{link.title}</div>
                            <div className="text-sm text-gray-500">{link.domain}</div>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">DA: {link.domainAuthority}</Badge>
                            <Badge variant="secondary">{link.linkType}</Badge>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Anchor text:</strong> {link.anchorTextSuggestion}
                        </div>
                        <div className="text-sm text-gray-600">
                          <strong>Contexto:</strong> {link.contextSuggestion}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="viral" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Análise de Potencial Viral
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          {analysis.viralPotential.score}%
                        </div>
                        <div className="text-sm text-gray-500">Potencial Viral</div>
                      </div>
                      <Progress value={analysis.viralPotential.score} className="flex-1 ml-4" />
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Fatores Virais Identificados</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysis.viralPotential.factors.map((factor, index) => (
                          <Badge key={index} variant="outline">
                            {factor.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Triggers Sociais</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysis.viralPotential.socialTriggers.map((trigger, index) => (
                          <Badge key={index} variant="secondary">
                            {trigger}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Dicas para Aumentar Compartilhamento</h4>
                      <div className="space-y-2">
                        {analysis.viralPotential.shareabilityTips.map((tip, index) => (
                          <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="text-sm text-blue-800">{tip}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Recomendações Personalizadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.recommendations.map((rec, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{rec.title}</div>
                      <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'secondary' : 'outline'}>
                        {rec.priority}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{rec.description}</div>
                    <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                      <strong>Como implementar:</strong> {rec.implementation}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SEODemo;
