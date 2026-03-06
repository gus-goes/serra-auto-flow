

# Plano: Integrar valor da entrada (proposta) no sinal da entrega

## O que será feito

Quando o usuário selecionar um **veículo + cliente** no dialog de nova entrega, o sistema buscará automaticamente a proposta mais recente desse par (client_id + vehicle_id) na tabela `proposals`. Se existir, o campo de sinal será pré-preenchido com o valor da entrada (`down_payment`) da proposta.

O campo continua **totalmente editável** — o usuário pode aceitar o valor sugerido, clicar nos chips (R$1.100 / R$1.500), ou digitar qualquer outro valor.

## Mudanças técnicas

### `src/components/deliveries/DeliveryDialog.tsx`
- Importar `supabase` para buscar a proposta
- Adicionar `useEffect` que, quando `vehicleId` e `clientId` mudarem, busca a proposta mais recente com `proposals.select('down_payment, vehicle_price').eq('client_id', clientId).eq('vehicle_id', vehicleId).order('created_at', { ascending: false }).limit(1)`
- Se encontrar proposta com `down_payment > 0`, pré-preenche `depositAmount` com esse valor
- Mostrar label indicativo: "Sugerido pela proposta: R$ X" ao lado do campo
- Manter chips e input editável normalmente

Nenhuma migração de banco necessária.

