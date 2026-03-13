

## Plano: Atualizar domínios no sistema

O sistema ainda referencia o domínio antigo `sistemaautosdaserra.netlify.app` em dois lugares na página de Clientes (mensagem de credenciais para WhatsApp). Precisa ser atualizado para `sistema.autosdaserra.com`.

### Alterações

1. **`src/pages/ClientsPage.tsx`** (linhas ~999 e ~1005): Trocar `https://sistemaautosdaserra.netlify.app` por `https://sistema.autosdaserra.com` nas duas ocorrências da mensagem de credenciais do cliente.

2. **Atualizar memória do projeto**: Registrar os novos domínios:
   - Sistema (admin/vendedor): `sistema.autosdaserra.com`
   - Site institucional: `autosdaserra.com`

