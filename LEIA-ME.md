# Site Coliseu Convenções

Site estático (HTML, CSS e JS puros), sem build. Para abrir localmente:

```bash
npx --yes http-server@14.1.1 -p 5173 -c-1
```

Depois acesse http://localhost:5173. A arena 3D usa módulos ES, então o site precisa ser servido por HTTP; abrir o `index.html` com dois cliques não basta.

## Estrutura

- `index.html`: conteúdo e seções
- `css/style.css`: identidade visual (paleta e tipografia ficam em `:root`)
- `js/arena.js`: abertura cinematográfica em 3D (Three.js): a fachada do Coliseu com os portões de bronze, que se abrem com a rolagem e revelam a arena de 3.000 lugares. O roteiro da câmera fica na constante `KEYS`.
- `js/main.js`: loader, rolagem, percurso do espaço, simulador de montagem, telão de LED e formulários
- `assets/img/`: fotos

## O que trocar antes de publicar

1. **WhatsApp**: em `js/main.js`, troque `WHATSAPP_NUMBER` pelo número comercial real (só dígitos, com 55 e DDD).
2. **Fotos**: as imagens em `assets/img/` são fotos de banco de imagens (Unsplash, uso livre) usadas só como referência. Troque por fotos reais do Coliseu mantendo os mesmos nomes de arquivo. O tratamento de cor da marca é aplicado automaticamente.
3. **Capacidades por formato**: o simulador usa estimativas (auditório até 3.000, banquete até 1.200, coquetel até 3.000, feira até 80 estandes, show até 3.000) numa plenária de 50 × 40 m. Confirme com a equipe do Coliseu e ajuste o objeto `FORMATS` em `js/main.js`.
4. **Dados da casa**: endereço, horário (8h às 22h) e metragens vieram da página atual do Coliseu. Vale confirmar com eles.
5. **Domínio e hospedagem**: o site roda em qualquer hospedagem estática (Netlify, Vercel, Hostinger etc.).
