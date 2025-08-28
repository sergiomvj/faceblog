import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Settings as SettingsIcon, 
  Upload, 
  Download, 
  RefreshCw, 
  Globe, 
  Shield, 
  Palette,
  Database,
  Users,
  Zap,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface SystemSettings {
  app_name: string;
  app_version: string;
  maintenance_mode: boolean;
  auto_updates: boolean;
  backup_enabled: boolean;
  analytics_enabled: boolean;
  seo_optimization: boolean;
  cache_enabled: boolean;
  cdn_enabled: boolean;
  ssl_enabled: boolean;
  custom_domain: string;
  max_tenants: number;
  max_articles_per_tenant: number;
  max_users_per_tenant: number;
  storage_limit_gb: number;
  theme_primary_color: string;
  theme_secondary_color: string;
  logo_url: string;
  favicon_url: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  social_login_enabled: boolean;
  google_analytics_id: string;
  facebook_pixel_id: string;
}

const Settings: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSettings>({
    app_name: 'FaceBlog',
    app_version: '2.1.0',
    maintenance_mode: false,
    auto_updates: true,
    backup_enabled: true,
    analytics_enabled: true,
    seo_optimization: true,
    cache_enabled: true,
    cdn_enabled: true,
    ssl_enabled: true,
    custom_domain: 'faceblog.top',
    max_tenants: 100,
    max_articles_per_tenant: 1000,
    max_users_per_tenant: 50,
    storage_limit_gb: 10,
    theme_primary_color: '#3B82F6',
    theme_secondary_color: '#10B981',
    logo_url: '',
    favicon_url: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    social_login_enabled: false,
    google_analytics_id: '',
    facebook_pixel_id: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [upgradeStatus, setUpgradeStatus] = useState<'idle' | 'checking' | 'available' | 'upgrading' | 'success' | 'error'>('idle');
  const [upgradeProgress, setUpgradeProgress] = useState(0);
  const [availableVersion, setAvailableVersion] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Mock loading settings - replace with actual API call
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Settings would be loaded from API here
      setIsLoading(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar configurações",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsLoading(true);
      
      // Mock API call to save settings
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Here would be the actual API call to save settings
      // await api.put('/api/settings', settings);
      
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso. Alterações aplicadas a todos os blogs.",
        variant: "default"
      });
      
      setIsLoading(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const checkForUpdates = async () => {
    setUpgradeStatus('checking');
    
    try {
      // Mock checking for updates
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate finding an update
      const hasUpdate = Math.random() > 0.5;
      
      if (hasUpdate) {
        setAvailableVersion('2.2.0');
        setUpgradeStatus('available');
        toast({
          title: "Atualização Disponível",
          description: "Nova versão 2.2.0 disponível com melhorias de SEO e performance.",
          variant: "default"
        });
      } else {
        setUpgradeStatus('idle');
        toast({
          title: "Sistema Atualizado",
          description: "Você já está usando a versão mais recente.",
          variant: "default"
        });
      }
    } catch (error) {
      setUpgradeStatus('error');
      toast({
        title: "Erro",
        description: "Falha ao verificar atualizações",
        variant: "destructive"
      });
    }
  };

  const performUpgrade = async () => {
    setUpgradeStatus('upgrading');
    setUpgradeProgress(0);
    
    try {
      // Simulate upgrade process
      const steps = [
        'Fazendo backup do sistema...',
        'Baixando nova versão...',
        'Atualizando banco de dados...',
        'Atualizando todos os blogs filhos...',
        'Aplicando configurações...',
        'Reiniciando serviços...'
      ];
      
      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setUpgradeProgress(((i + 1) / steps.length) * 100);
        
        toast({
          title: "Atualizando...",
          description: steps[i],
          variant: "default"
        });
      }
      
      setSettings(prev => ({ ...prev, app_version: availableVersion }));
      setUpgradeStatus('success');
      
      toast({
        title: "Atualização Concluída",
        description: `Sistema atualizado para versão ${availableVersion}. Todos os blogs filhos foram atualizados automaticamente.`,
        variant: "default"
      });
      
    } catch (error) {
      setUpgradeStatus('error');
      toast({
        title: "Erro na Atualização",
        description: "Falha durante o processo de atualização",
        variant: "destructive"
      });
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `faceblog-settings-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({
      title: "Configurações Exportadas",
      description: "Arquivo de configurações baixado com sucesso",
      variant: "default"
    });
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        setSettings({ ...settings, ...importedSettings });
        
        toast({
          title: "Configurações Importadas",
          description: "Configurações carregadas com sucesso. Clique em Salvar para aplicar.",
          variant: "default"
        });
      } catch (error) {
        toast({
          title: "Erro na Importação",
          description: "Arquivo de configurações inválido",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
          <p className="text-muted-foreground">
            Gerencie configurações globais que afetam todos os blogs da plataforma
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportSettings}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" onClick={() => document.getElementById('import-file')?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={importSettings}
            className="hidden"
          />
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="upgrade">Upgrade</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Configurações Gerais
              </CardTitle>
              <CardDescription>
                Configurações básicas da aplicação que se aplicam a todos os blogs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="app_name">Nome da Aplicação</Label>
                  <Input
                    id="app_name"
                    value={settings.app_name}
                    onChange={(e) => setSettings({...settings, app_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom_domain">Domínio Principal</Label>
                  <Input
                    id="custom_domain"
                    value={settings.custom_domain}
                    onChange={(e) => setSettings({...settings, custom_domain: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_tenants">Máximo de Tenants</Label>
                  <Input
                    id="max_tenants"
                    type="number"
                    value={settings.max_tenants}
                    onChange={(e) => setSettings({...settings, max_tenants: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_articles">Artigos por Tenant</Label>
                  <Input
                    id="max_articles"
                    type="number"
                    value={settings.max_articles_per_tenant}
                    onChange={(e) => setSettings({...settings, max_articles_per_tenant: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storage_limit">Limite de Storage (GB)</Label>
                  <Input
                    id="storage_limit"
                    type="number"
                    value={settings.storage_limit_gb}
                    onChange={(e) => setSettings({...settings, storage_limit_gb: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="maintenance_mode"
                  checked={settings.maintenance_mode}
                  onCheckedChange={(checked) => setSettings({...settings, maintenance_mode: checked})}
                />
                <Label htmlFor="maintenance_mode">Modo de Manutenção</Label>
                {settings.maintenance_mode && (
                  <Badge variant="destructive">Ativo</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upgrade" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Sistema de Upgrade
              </CardTitle>
              <CardDescription>
                Gerencie atualizações do sistema que afetam todos os blogs automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Versão Atual</h3>
                  <p className="text-sm text-muted-foreground">
                    FaceBlog v{settings.app_version}
                  </p>
                </div>
                <Badge variant="outline">
                  {upgradeStatus === 'success' ? 'Atualizado' : 'Atual'}
                </Badge>
              </div>

              {upgradeStatus === 'available' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Nova versão {availableVersion} disponível com melhorias de SEO, performance e novas funcionalidades.
                  </AlertDescription>
                </Alert>
              )}

              {upgradeStatus === 'upgrading' && (
                <Alert>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Atualizando sistema... {Math.round(upgradeProgress)}% concluído
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${upgradeProgress}%` }}
                      ></div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {upgradeStatus === 'success' && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Sistema atualizado com sucesso! Todos os blogs filhos foram atualizados automaticamente.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={checkForUpdates}
                  disabled={upgradeStatus === 'checking' || upgradeStatus === 'upgrading'}
                >
                  {upgradeStatus === 'checking' ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Verificar Atualizações
                    </>
                  )}
                </Button>

                {upgradeStatus === 'available' && (
                  <Button 
                    onClick={performUpgrade}
                    disabled={false}
                    variant="default"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Atualizar para v{availableVersion}
                  </Button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto_updates"
                  checked={settings.auto_updates}
                  onCheckedChange={(checked) => setSettings({...settings, auto_updates: checked})}
                />
                <Label htmlFor="auto_updates">Atualizações Automáticas</Label>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importante:</strong> Todas as atualizações são aplicadas automaticamente a todos os blogs filhos da plataforma. 
                  Um backup automático é criado antes de cada atualização.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Performance e Otimização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="cache_enabled"
                    checked={settings.cache_enabled}
                    onCheckedChange={(checked) => setSettings({...settings, cache_enabled: checked})}
                  />
                  <Label htmlFor="cache_enabled">Cache Habilitado</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="cdn_enabled"
                    checked={settings.cdn_enabled}
                    onCheckedChange={(checked) => setSettings({...settings, cdn_enabled: checked})}
                  />
                  <Label htmlFor="cdn_enabled">CDN Habilitado</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="seo_optimization"
                    checked={settings.seo_optimization}
                    onCheckedChange={(checked) => setSettings({...settings, seo_optimization: checked})}
                  />
                  <Label htmlFor="seo_optimization">Otimização SEO</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="backup_enabled"
                    checked={settings.backup_enabled}
                    onCheckedChange={(checked) => setSettings({...settings, backup_enabled: checked})}
                  />
                  <Label htmlFor="backup_enabled">Backup Automático</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="ssl_enabled"
                  checked={settings.ssl_enabled}
                  onCheckedChange={(checked) => setSettings({...settings, ssl_enabled: checked})}
                />
                <Label htmlFor="ssl_enabled">SSL/HTTPS Obrigatório</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="social_login_enabled"
                  checked={settings.social_login_enabled}
                  onCheckedChange={(checked) => setSettings({...settings, social_login_enabled: checked})}
                />
                <Label htmlFor="social_login_enabled">Login Social Habilitado</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Aparência Global
              </CardTitle>
              <CardDescription>
                Configurações visuais aplicadas a todos os blogs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Cor Primária</Label>
                  <Input
                    id="primary_color"
                    type="color"
                    value={settings.theme_primary_color}
                    onChange={(e) => setSettings({...settings, theme_primary_color: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary_color">Cor Secundária</Label>
                  <Input
                    id="secondary_color"
                    type="color"
                    value={settings.theme_secondary_color}
                    onChange={(e) => setSettings({...settings, theme_secondary_color: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logo_url">URL do Logo</Label>
                  <Input
                    id="logo_url"
                    value={settings.logo_url}
                    onChange={(e) => setSettings({...settings, logo_url: e.target.value})}
                    placeholder="https://exemplo.com/logo.png"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="favicon_url">URL do Favicon</Label>
                  <Input
                    id="favicon_url"
                    value={settings.favicon_url}
                    onChange={(e) => setSettings({...settings, favicon_url: e.target.value})}
                    placeholder="https://exemplo.com/favicon.ico"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Integrações Globais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="google_analytics">Google Analytics ID</Label>
                  <Input
                    id="google_analytics"
                    value={settings.google_analytics_id}
                    onChange={(e) => setSettings({...settings, google_analytics_id: e.target.value})}
                    placeholder="GA-XXXXXXXXX-X"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook_pixel">Facebook Pixel ID</Label>
                  <Input
                    id="facebook_pixel"
                    value={settings.facebook_pixel_id}
                    onChange={(e) => setSettings({...settings, facebook_pixel_id: e.target.value})}
                    placeholder="XXXXXXXXXXXXXXX"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Configurações SMTP</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="smtp.gmail.com"
                    value={settings.smtp_host}
                    onChange={(e) => setSettings({...settings, smtp_host: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="587"
                    value={settings.smtp_port}
                    onChange={(e) => setSettings({...settings, smtp_port: parseInt(e.target.value)})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="usuario@gmail.com"
                    value={settings.smtp_user}
                    onChange={(e) => setSettings({...settings, smtp_user: e.target.value})}
                  />
                  <Input
                    type="password"
                    placeholder="senha"
                    value={settings.smtp_password}
                    onChange={(e) => setSettings({...settings, smtp_password: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={loadSettings}>
          Cancelar
        </Button>
        <Button onClick={saveSettings} disabled={isLoading}>
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Configurações'
          )}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
