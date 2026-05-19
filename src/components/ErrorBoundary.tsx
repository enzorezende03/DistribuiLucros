import { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the error in the console so we can see it in logs
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Captured render error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="p-6 max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ocorreu um erro ao exibir esta página</AlertTitle>
            <AlertDescription className="space-y-3">
              <p className="text-sm">
                {this.state.error?.message || 'Erro inesperado.'}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={this.handleReset} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Tentar novamente
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                  Recarregar página
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    return this.props.children;
  }
}
