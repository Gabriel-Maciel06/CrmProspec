# CRM Prospecções (`CrmProspec`)

CRM B2B dedicado à gestão de prospecções comerciais, com Funil Kanban, Arena 3D e Analytics & Fechamento.

## Recursos Principais

- **Funil Kanban de Prospecções**: Captura rápida de leads, edição completa, histórico de interações, tags e movimentação por estágios (`Novo Lead`, `Qualificação`, `Proposta Enviada`, `Negociação`, `Fechado`, `Perdido` e `Cadência`).
- **Arena 3D**: Visualização gamificada dos prospectores em cena Three.js com personalização de avatar 3D.
- **Analytics & Fechamento**: Painel gerencial de conversão, qualidade dos leads e exportação de fechamento.
- **Persistência Híbrida**: Sincronização com projeto Supabase dedicado (`crm-prospec`) + fallback local em `localStorage`.

## Usuários Configurados

- `maciel` — Gabriel Maciel
- `daniel` — Daniel

*(Sem painel ou perfil de Diretoria — cada prospector opera sua própria carteira de prospecções.)*

## Como Executar Localmente

Basta servir a pasta com qualquer servidor HTTP estático:

```bash
python3 -m http.server 8080
```

E acessar `http://localhost:8080/login.html`.
