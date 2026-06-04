Vou corrigir o fluxo de recuperação de senha para não depender da chamada direta da Edge Function no navegador.

Plano:
1. Ajustar o frontend em `src/pages/Login.tsx` para tratar melhor falhas de rede da função e exibir uma mensagem útil em português, em vez do erro genérico “Failed to send a request to the Edge Function”.
2. Trocar a invocação atual por uma chamada mais robusta, usando a URL pública da função e cabeçalhos esperados, já que o teste direto da função respondeu com sucesso no backend.
3. Manter a Edge Function `reset-password-cnpj` como está, pois ela respondeu `success: true` no teste direto com o CNPJ da imagem.
4. Validar novamente o fluxo “Esqueci minha senha” após a alteração.

Detalhe técnico:
- A função implantada está funcionando quando chamada diretamente.
- O erro mostrado na tela indica falha na requisição feita pelo navegador/app, provavelmente na camada de invocação do SDK ou no preflight/rede, antes de chegar aos logs da função.