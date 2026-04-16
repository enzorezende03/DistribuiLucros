import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, PlayCircle, BookOpen } from 'lucide-react';

const passos = [
  { numero: 1, titulo: 'Clique em "Registrar Distribuição"', descricao: 'Acesse o menu Distribuições e clique no botão para iniciar uma nova distribuição.' },
  { numero: 2, titulo: 'Informe a data da distribuição', descricao: 'Selecione a data em que a distribuição será registrada.' },
  { numero: 3, titulo: 'Selecione o sócio e informe o valor', descricao: 'Escolha o sócio que receberá a retirada e informe o valor correspondente.' },
  { numero: 4, titulo: 'Adicione mais sócios (se necessário)', descricao: 'Caso a distribuição seja para mais de um sócio, clique em "Adicionar Sócio" e informe o valor de cada um.' },
  { numero: 5, titulo: 'Confira os valores informados', descricao: 'Revise atentamente todos os valores antes de finalizar.' },
  { numero: 6, titulo: 'Clique em "Registrar Distribuição"', descricao: 'Finalize o processo confirmando o registro da distribuição.' },
];

export default function AjudaPage() {
  return (
    <SidebarLayout>
      <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Ajuda & Tutorial</h1>
            <p className="text-sm text-muted-foreground">Aprenda a usar o sistema de distribuição de lucros</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📘 Como fazer a Distribuição de Lucros no Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              🔹 Passo a passo
            </h2>
            <ol className="space-y-3">
              {passos.map((p) => (
                <li key={p.numero} className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                  <Badge variant="default" className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-sm">
                    {p.numero}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{p.titulo}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{p.descricao}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-900 dark:text-amber-200 font-semibold">
            ⚠️ Observação importante
          </AlertTitle>
          <AlertDescription className="text-amber-900/90 dark:text-amber-100/90 mt-1">
            Quando o valor distribuído for superior a <strong>R$ 50.000,00</strong>, o sistema irá calcular o IR automaticamente, caso a empresa <strong>não possua ata de distribuição registrada</strong>.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              Vídeo demonstrativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden border bg-black">
              <video
                src="/videos/tutorial-distribuicao.mp4"
                controls
                className="w-full h-auto max-h-[600px]"
                preload="metadata"
              >
                Seu navegador não suporta a reprodução de vídeo.
              </video>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Demonstração prática de como registrar uma distribuição de lucros
            </p>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
