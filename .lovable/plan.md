

# Plano: Módulo de Gestão de Entregas

## Contexto do Fluxo de Entrega

Baseado no seu processo de vendas com entrega, o fluxo é:

```text
Cliente interessado
  → Pré-venda (dados do cliente + DUT)
  → Sinal de garantia (R$1.100 ou R$1.500)
  → Documentação enviada em PDF (contrato, recibo, ATPV, garantia)
  → Código de rastreamento gerado
  → Entrega pelo despachante + mecânico (1 dia útil)
  → Cliente paga restante na entrega
  → Se recusar: devolução 100% do sinal
```

## O que será construído

### 1. Migração no banco de dados

Adicionar colunas à tabela `tracking_runs` para suportar o fluxo completo:

- `deposit_amount` (numeric) — valor do sinal (1100 ou 1500)
- `deposit_status` (enum: `pendente`, `pago`, `devolvido`) — status do sinal
- `vehicle_total_price` (numeric) — valor total do veículo
- `remaining_amount` (numeric) — valor restante a pagar na entrega
- `estimated_delivery_date` (date) — data prevista de entrega
- `dispatcher_name` (text) — nome do despachante
- `mechanic_name` (text) — nome do mecânico
- `notes` (text) — observações
- `contract_id`, `receipt_id`, `warranty_id` (uuid, FK) — documentos vinculados
- `delivery_confirmed_at` (timestamptz) — quando o cliente confirmou recebimento
- `cancellation_reason` (text) — motivo do cancelamento/recusa

Também criar enum `deposit_status` e adicionar política de DELETE para staff.

### 2. Nova página: Entregas (`/entregas`)

Duas abas principais:

**Aba Lista** — Cards com:
- Veículo (marca/modelo/ano)
- Cliente (nome, telefone, endereço de entrega)
- Despachante e mecânico responsáveis
- Status com badge colorido (Aguardando Sinal → Sinal Pago → Em Rota → Entregue / Cancelado)
- Barra de progresso
- Valor do sinal + valor restante
- Documentos vinculados (links para contrato, recibo, ATPV, garantia)
- Data prevista de entrega
- Botões de ação: Atualizar Status, Cancelar/Devolver Sinal

**Aba Agenda** — Calendário mensal:
- Dias com entregas marcados
- Clique no dia mostra lista de entregas daquela data
- Cores por status

### 3. Dialog de Nova Entrega

Formulário com:
- Selecionar veículo (busca na lista de veículos)
- Selecionar cliente (busca na lista de clientes)
- Valor do sinal (R$1.100 ou R$1.500, campo editável)
- Nome do despachante
- Nome do mecânico
- Endereço de destino (pré-preenche com endereço do cliente)
- Data prevista de entrega
- Observações
- O valor restante é calculado automaticamente (preço veículo - sinal)

### 4. Fluxo de status

```text
aguardando → em_rota → no_local → concluido
                                 → cancelado (devolução do sinal)
```

Ao marcar como "concluído", registra `delivery_confirmed_at`.
Ao cancelar, pede motivo e marca `deposit_status = 'devolvido'`.

### 5. Hook `useDeliveries.ts`

CRUD completo na tabela `tracking_runs` com joins para `clients` e `vehicles`:
- `useDeliveries()` — lista todas as entregas
- `useCreateDelivery()` — criar nova entrega
- `useUpdateDeliveryStatus()` — atualizar status/progresso
- `useCancelDelivery()` — cancelar e marcar devolução do sinal

### 6. Navegação

- Novo item no Sidebar: "Entregas" (ícone `Truck`) entre "Funil de Vendas" e "Histórico"
- Nova rota `/entregas` no `App.tsx` (protegida para staff)

## Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/migrations/...` | Criar — adicionar colunas e enum |
| `src/pages/DeliveriesPage.tsx` | Criar — página principal |
| `src/components/deliveries/DeliveryList.tsx` | Criar — lista de entregas |
| `src/components/deliveries/DeliveryCalendar.tsx` | Criar — calendário |
| `src/components/deliveries/DeliveryDialog.tsx` | Criar — formulário |
| `src/components/deliveries/DeliveryStatusActions.tsx` | Criar — botões de ação |
| `src/hooks/useDeliveries.ts` | Criar — hook CRUD |
| `src/components/layout/Sidebar.tsx` | Editar — adicionar "Entregas" |
| `src/App.tsx` | Editar — adicionar rota |

