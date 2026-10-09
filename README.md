# ⚡ AppHub Studio - Web App de Vendas & Gestão de Aplicativos

O **AppHub Studio** é um aplicativo web funcional para exibição, venda, licenciamento e gestão financeira de aplicativos (móveis e web).

---

## 🚀 Como Executar o Web App

### Opção 1: Via Servidor Node.js (Recomendado)

O projeto inclui um servidor HTTP nativo em Node.js (`server.js`). Para iniciar:

```bash
node server.js
```
ou via NPM:
```bash
npm start
```

Depois, acesse no seu navegador:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### Opção 2: Abertura Direta no Navegador

Como a aplicação foi desenvolvida como uma SPA (Single Page Application) responsiva e autônoma, você também pode abrir diretamente o arquivo:
- `index.html` ou `painel_de_venda_de_aplicativos.html`

basta dar um duplo clique no arquivo ou arrastá-lo para qualquer navegador (Chrome, Edge, Firefox, Safari).

---

## 🔑 Acesso Administrativo (Área Restrita)

- **PIN Padrão de Fábrica**: `1234`
- Para acessar o Painel Admin:
  1. Clique em **"Área Restrita"** no topo superior direito da tela ou no rodapé.
  2. Digite o PIN `1234` e confirme.
  3. Uma vez autenticado, o menu exibirá as abas:
     - 🛒 **Vitrine**: Visão pública do cliente para navegação e compra.
     - 📈 **Painel Admin**: Cadastro/edição de apps, métricas de faturamento, gráfico por categoria e emissão manual de licenças.
     - 💳 **Pagamentos**: Configuração de conta bancária, chave Pix com desconto, gateways (Mercado Pago, Stripe, PayPal, Asaas) e alteração do PIN de segurança.

---

## 🛠️ Recursos do Aplicativo Web

- 📱 **Vitrine Interativa com Filtros e Busca**: Busca em tempo real por nome/nicho e filtro por categorias.
- 💳 **Checkout Completo com Multi-Pagamento**: Suporte a Pix (com código "copia e cola" gerado), Cartão de Crédito parcelado, PayPal e Boleto Bancário.
- 🔑 **Gerador Automático de Licenças**: Emissão instantânea de chave única (`LIC-XXXX-XXXX-XXXX`) após cada confirmação de compra.
- 📊 **Dashboard & Métricas com Chart.js**: Monitoramento de faturamento acumulado, total de aplicativos, licenças ativas e gráfico interativo de catálogo.
- 💾 **Catálogo Compartilhado**: Os aplicativos cadastrados são salvos pelo servidor em `data/apps.json`; as imagens são salvas em `data/uploads/` e ficam disponíveis em todos os aparelhos que acessam a mesma instalação. Transações, licenças, configurações e dados de acesso dos clientes (URL e usuário) continuam salvos localmente no navegador.
- 🔐 **Acesso ao Web App por pedido aprovado**: Na aba **Pagamentos > Transações & Pedidos**, configure o link e o usuário do cliente e prepare uma mensagem para envio manual. A senha inicial é exibida apenas temporariamente para cópia e não é armazenada. Pagamentos e dados de vendas ainda são demonstrativos e locais; não há confirmação real do gateway, backend autenticado ou envio automático de e-mail.
- 💬 **Gestor de Conta VIP Integrado**: Botão direto para contato via WhatsApp com o responsável pelo suporte do cliente.

---

## 🌐 Como Fazer Deploy na Nuvem

Você pode publicar este Web App gratuitamente em qualquer hospedagem estática ou de Node.js:

- **Vercel**: Conecte o repositório ou use `vercel deploy` (detecta o `index.html` automaticamente).
- **Netlify**: Arraste a pasta do projeto para a dashboard do Netlify.
- **GitHub Pages**: Envie o arquivo `index.html` para o branch `main` e ative o GitHub Pages nas configurações do repositório.
- **Render / Railway**: Selecione o projeto Node.js com comando de início `node server.js`.

Para que os aplicativos cadastrados, suas imagens e a instalação como atalho/PWA apareçam corretamente em outros aparelhos, publique os arquivos HTML, `apps.php`, `uploads.php`, `manifest.php`, `sw.js`, a pasta `api/` e o `server.js` juntos. Em hospedagem PHP, os endpoints ficam ao lado do HTML e salvam o catálogo e as imagens nas pastas `data/` e `uploads/`; ambas precisam ter permissão de escrita. A imagem definida como ícone é usada no manifesto específico de cada app. Em iPhones, abra o site no Safari e escolha Compartilhar > Adicionar à Tela de Início. Em hospedagem Node.js, execute o `server.js` atualizado e mantenha as mesmas permissões.
