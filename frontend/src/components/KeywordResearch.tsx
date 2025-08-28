import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  TrendingUp, 
  Target,
  BarChart3,
  Zap,
  Clock,
  DollarSign,
  Users
} from "lucide-react";

interface KeywordData {
  keyword: string;
  volume: number;
  difficulty: number;
  trend: 'up' | 'down' | 'stable';
  cpc: number;
  competition: 'low' | 'medium' | 'high';
  opportunity: number;
}

interface KeywordResearchProps {
  topic: string;
  onKeywordSelect?: (keywords: string[]) => void;
  className?: string;
}

export const KeywordResearch: React.FC<KeywordResearchProps> = ({
  topic,
  onKeywordSelect,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState(topic);
  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'volume' | 'difficulty' | 'opportunity'>('opportunity');

  useEffect(() => {
    if (topic) {
      setSearchTerm(topic);
      handleSearch();
    }
  }, [topic]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/seo/trending/${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      
      if (data.success) {
        // Simular dados de keywords baseados na resposta da API
        const mockKeywords = generateKeywordData(searchTerm, data.data);
        setKeywords(mockKeywords);
      }
    } catch (error) {
      console.error('Erro ao buscar keywords:', error);
      // Fallback com dados mock
      setKeywords(generateMockKeywords(searchTerm));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeywordToggle = (keyword: string) => {
    const newSelection = selectedKeywords.includes(keyword)
      ? selectedKeywords.filter(k => k !== keyword)
      : [...selectedKeywords, keyword];
    
    setSelectedKeywords(newSelection);
    onKeywordSelect?.(newSelection);
  };

  const sortedKeywords = [...keywords].sort((a, b) => {
    switch (sortBy) {
      case 'volume':
        return b.volume - a.volume;
      case 'difficulty':
        return a.difficulty - b.difficulty;
      case 'opportunity':
        return b.opportunity - a.opportunity;
      default:
        return 0;
    }
  });

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty < 30) return 'text-green-600';
    if (difficulty < 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCompetitionColor = (competition: string) => {
    switch (competition) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={`border-0 shadow-lg bg-white/80 backdrop-blur-sm ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Pesquisa de Palavras-chave
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Busca */}
        <div className="flex gap-2">
          <Input
            placeholder="Digite um tópico para pesquisar keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button 
            onClick={handleSearch}
            disabled={!searchTerm.trim() || isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Buscando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Pesquisar
              </div>
            )}
          </Button>
        </div>

        {/* Filtros */}
        {keywords.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Ordenar por:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="opportunity">Oportunidade</option>
                <option value="volume">Volume</option>
                <option value="difficulty">Dificuldade</option>
              </select>
            </div>
            <Badge variant="outline">
              {selectedKeywords.length} selecionadas
            </Badge>
          </div>
        )}

        {/* Lista de Keywords */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sortedKeywords.map((keyword, index) => (
            <div
              key={index}
              className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                selectedKeywords.includes(keyword.keyword)
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleKeywordToggle(keyword.keyword)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-lg">{keyword.keyword}</span>
                    {keyword.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                    {keyword.trend === 'down' && <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />}
                    <Badge className={getCompetitionColor(keyword.competition)}>
                      {keyword.competition}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-600">Volume:</span>
                      <span className="font-medium">{keyword.volume.toLocaleString()}/mês</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-600">Dificuldade:</span>
                      <span className={`font-medium ${getDifficultyColor(keyword.difficulty)}`}>
                        {keyword.difficulty}/100
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-600">CPC:</span>
                      <span className="font-medium">R$ {keyword.cpc.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-600">Oportunidade:</span>
                      <span className="font-medium text-green-600">{keyword.opportunity}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="ml-4">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Facilidade</div>
                    <Progress value={100 - keyword.difficulty} className="w-16" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Resumo da seleção */}
        {selectedKeywords.length > 0 && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-900">
                  {selectedKeywords.length} palavras-chave selecionadas
                </p>
                <p className="text-sm text-blue-700">
                  {selectedKeywords.slice(0, 3).join(', ')}
                  {selectedKeywords.length > 3 && ` +${selectedKeywords.length - 3} mais`}
                </p>
              </div>
              <Button 
                onClick={() => onKeywordSelect?.(selectedKeywords)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Aplicar Seleção
              </Button>
            </div>
          </div>
        )}

        {/* Estado vazio */}
        {!isLoading && keywords.length === 0 && searchTerm && (
          <div className="text-center py-8">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma palavra-chave encontrada para "{searchTerm}"</p>
            <p className="text-sm text-gray-400">Tente um termo diferente</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Função para gerar dados mock de keywords
function generateMockKeywords(topic: string): KeywordData[] {
  const variations = [
    topic,
    `${topic} 2025`,
    `como ${topic}`,
    `${topic} dicas`,
    `${topic} guia`,
    `${topic} tutorial`,
    `${topic} completo`,
    `${topic} iniciantes`,
    `melhor ${topic}`,
    `${topic} grátis`
  ];

  return variations.map(keyword => ({
    keyword,
    volume: Math.floor(Math.random() * 50000) + 1000,
    difficulty: Math.floor(Math.random() * 80) + 20,
    trend: Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'stable' : 'down',
    cpc: Math.random() * 5 + 0.5,
    competition: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
    opportunity: Math.floor(Math.random() * 60) + 40
  }));
}

function generateKeywordData(topic: string, apiData: any): KeywordData[] {
  // Integrar com dados reais da API quando disponível
  return generateMockKeywords(topic);
}

export default KeywordResearch;
