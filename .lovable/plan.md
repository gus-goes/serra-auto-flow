

# Plano: Ajustes no Módulo de Entregas

## Resumo das mudanças solicitadas

1. **Sem integração com AS Tracking** — o módulo de entregas fica 100% interno no Serra Flow, sem conexão com a plataforma externa.
2. **Confirmação "Entrega pela pré-venda"** — ao criar a entrega, o valor do sinal é flexível (pode ser R$1.100, R$1.500, ou qualquer outro valor customizado).
3. **Pendência de pagamento visível no painel do cliente** — quando uma entrega é criada para um cliente, ele verá na sua área um alerta/card mostrando que tem um pagamento pendente (sinal ou restante).

## O que será feito

### 1. Remover referências ao AS Tracking
- Revisar `DeliveryDialog`, `DeliveryList` e `DeliveryStatusActions` para garantir que não há menção ou integração com plataforma externa de rastreamento. O módulo já está interno, mas confirmar que não há chamadas externas.

### 2. Valor do sinal flexível no dialog
- No `DeliveryDialog.tsx`, o campo de sinal já é editável (campo `depositAmount`). Adicionar **botões de atalho** para os valores mais comuns (R$1.100 e R$1.500) e permitir digitar qualquer valor. Melhorar o UX com chips clicáveis.

### 3. Seção "Entregas / Pendências" no painel do cliente
- Criar hook `useClientDeliveries()` em `useClientDocuments.ts` que busca entregas do cliente na tabela `tracking_runs` (via `client_id` linkado ao email do usuário logado).
- Adicionar uma **nova aba "Entregas"** ou um **card de alerta** no topo do `ClienteDashboardPage.tsx` mostrando:
  - Veículo da entrega
  - Status atual (Aguardando Sinal, Em Rota, etc.)
  - Valor do sinal pendente / pago
  - Valor restante a pagar
  - Data prevista de entrega
  - Badge "Pagamento Pendente" em destaque quando `deposit_status = 'pendente'`

### 4. RLS para clientes verem suas entregas
- A política RLS atual de `tracking_runs` para SELECT usa `USING (true)` para autenticados. Os clientes já podem ler, mas o hook filtrará pelo `client_id` do cliente logado.

## Arquivos a modificar

| Arquivo | Ação |
|---|---|
| `src/components/deliveries/DeliveryDialog.tsx` | Editar — adicionar chips de atalho para valores do sinal |
| `src/hooks/useClientDocuments.ts` | Editar — adicionar `useClientDeliveries()` |
| `src/pages/cliente/ClienteDashboardPage.tsx` | Editar — adicionar card/seção de pendência de pagamento e aba "Entregas" |

