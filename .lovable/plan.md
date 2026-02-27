

## Plano de Implementacao - 4 Mudancas

### 1. Assinatura individual do vendedor (salva no perfil)

**Migracao SQL**: Adicionar coluna `signature` (text, nullable) na tabela `profiles`.

**Configuracoes (SettingsPage.tsx)**: Adicionar uma nova aba ou secao "Minha Assinatura" onde o vendedor logado pode desenhar e salvar sua assinatura pessoal usando o componente `SignaturePad` ja existente. A assinatura e salva no campo `signature` da tabela `profiles` do usuario logado.

**Propostas e Recibos (ProposalsPage.tsx, ReceiptsPage.tsx)**: Alterar `handleVendorSignature` para:
- Buscar a assinatura do usuario logado (`profiles.signature` onde `id = auth.uid()`)
- Se existir, aplicar automaticamente
- Se nao existir, abrir o pad de assinatura manual (comportamento atual de fallback)
- Trocar a mensagem de "representante legal" para "vendedor"

**Hook (useProfiles.ts)**: Criar um hook `useCurrentUserSignature` que busca a assinatura do perfil do usuario logado.

### 2. Corrigir UX dos inputs numericos no simulador

**SimulatorPage.tsx**: 
- Trocar os inputs de Valor do Veiculo, Entrada e Parcelas de `type="number"` para `type="text"`
- Usar estados intermediarios como string (`vehiclePriceStr`, `downPaymentStr`) para permitir digitacao livre
- Aplicar parse numerico no `onBlur` (quando sai do campo), nao no `onChange`
- Manter o Slider sincronizado: quando o slider muda, atualiza tanto o valor numerico quanto a string

### 3. Remover botao "Salvar Simulacao"

**SimulatorPage.tsx**:
- Remover os botoes "Salvar Simulacao" de ambas as abas (bancaria e propria)
- Remover as funcoes `handleSaveSimulation` e `handleSaveOwnSimulation`
- Remover o campo de selecao de cliente (ja que nao precisa mais vincular simulacao a cliente)
- Remover o import do icone `Save`

### 4. Texto formatado para copiar apos gerar credenciais

**ClientsPage.tsx** - Na tela de sucesso (`step === 'success'`):
- Substituir os campos separados de email/senha por uma caixa de texto (`textarea`) readonly com a mensagem completa:

```
Ola [Nome]! Suas credenciais de acesso ao portal da Autos da Serra foram criadas.

Acesse: https://sistemaautosdaserra.netlify.app/cliente

Login: [email]
Senha: [senha]

Qualquer duvida, estamos a disposicao!
```

- Adicionar botao "Copiar mensagem" que copia todo o texto de uma vez
- Manter o estado `copiedField` mas agora com valor `'message'` para feedback visual
- Remover os botoes individuais de copiar email e senha

---

### Detalhes tecnicos

**Migracao SQL**:
```sql
ALTER TABLE public.profiles ADD COLUMN signature text;
```

**Arquivos modificados**:
- Nova migracao SQL para coluna `signature` em `profiles`
- `src/pages/SimulatorPage.tsx` - UX dos inputs + remover botao salvar + remover selecao de cliente
- `src/pages/ClientsPage.tsx` - textarea com mensagem formatada para copiar
- `src/pages/ProposalsPage.tsx` - usar assinatura do vendedor logado em vez do representante legal
- `src/pages/ReceiptsPage.tsx` - idem
- `src/pages/SettingsPage.tsx` - secao para vendedor salvar sua assinatura
- `src/hooks/useProfiles.ts` - hook para buscar assinatura do usuario logado

