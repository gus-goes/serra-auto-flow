import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { clientStorage, vehicleStorage } from '@/lib/storage';
import { getCompanyConfig } from '@/lib/companyConfig';
import { formatCurrency, formatCPF, formatRG, maritalStatusLabels } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import type { Client } from '@/types';
import { FileText, User, Car, CreditCard, Download, Edit2 } from 'lucide-react';

interface ContractData {
  // Dados do cliente
  clientName: string;
  clientCpf: string;
  clientRg: string;
  clientEmail: string;
  clientPhone: string;
  clientMaritalStatus: string;
  clientOccupation: string;
  clientAddress: string;
  // Dados do veículo
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleColor: string;
  vehiclePlate: string;
  vehicleChassis: string;
  vehicleRenavam: string;
  vehicleFuel: string;
  vehicleTransmission: string;
  vehicleMileage: number;
  // Dados do pagamento
  vehiclePrice: number;
  paymentType: 'avista' | 'parcelado';
  downPayment: number;
  installments: number;
  installmentValue: number;
  dueDay: number; // Dia de vencimento (1-31)
  firstDueDate: string; // YYYY-MM-DD
}

interface ContractPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  vehicleId: string;
  initialPrice: number;
  initialPaymentType: 'avista' | 'parcelado';
  initialDownPayment: number;
  initialInstallments: number;
  initialInstallmentValue: number;
  onConfirm: (data: ContractData) => void;
}

export function ContractPreviewDialog({
  open,
  onOpenChange,
  clientId,
  vehicleId,
  initialPrice,
  initialPaymentType,
  initialDownPayment,
  initialInstallments,
  initialInstallmentValue,
  onConfirm,
}: ContractPreviewDialogProps) {
  const [activeTab, setActiveTab] = useState('cliente');
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const company = getCompanyConfig();

  const buildClientAddress = (c: Client) => {
    if (!c.address) return '';
    return `${c.address.street}, ${c.address.number}${c.address.complement ? ', ' + c.address.complement : ''}, ${c.address.neighborhood}, ${c.address.city}/${c.address.state}, CEP ${c.address.zipCode}`;
  };

  const [data, setData] = useState<ContractData>({
    clientName: '',
    clientCpf: '',
    clientRg: '',
    clientEmail: '',
    clientPhone: '',
    clientMaritalStatus: '',
    clientOccupation: '',
    clientAddress: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: 0,
    vehicleColor: '',
    vehiclePlate: '',
    vehicleChassis: '',
    vehicleRenavam: '',
    vehicleFuel: '',
    vehicleTransmission: '',
    vehicleMileage: 0,
    vehiclePrice: initialPrice,
    paymentType: initialPaymentType,
    downPayment: initialDownPayment,
    installments: initialInstallments,
    installmentValue: initialInstallmentValue,
    dueDay: 10,
    firstDueDate: '',
  });

  // Load data when dialog opens (avoid depending on object references)
  useEffect(() => {
    if (!open) return;

    const client = clientStorage.getById(clientId);
    const vehicle = vehicleStorage.getById(vehicleId);
    if (!client || !vehicle) return;

    setData({
      clientName: client.name,
      clientCpf: client.cpf,
      clientRg: client.rg,
      clientEmail: client.email || '',
      clientPhone: client.phone || '',
      clientMaritalStatus: maritalStatusLabels[client.maritalStatus] || '',
      clientOccupation: client.occupation || '',
      clientAddress: buildClientAddress(client),
      vehicleBrand: vehicle.brand,
      vehicleModel: vehicle.model,
      vehicleYear: vehicle.year,
      vehicleColor: vehicle.color,
      vehiclePlate: vehicle.plate || '',
      vehicleChassis: vehicle.chassis || '',
      vehicleRenavam: vehicle.renavam || '',
      vehicleFuel: vehicle.fuel,
      vehicleTransmission: vehicle.transmission,
      vehicleMileage: vehicle.mileage,
      vehiclePrice: initialPrice || vehicle.price,
      paymentType: initialPaymentType,
      downPayment: initialDownPayment,
      installments: initialInstallments,
      installmentValue: initialInstallmentValue,
      dueDay: 10,
      firstDueDate: '',
    });

    setActiveTab('cliente');
    setIsEditing(false);
  }, [open, clientId, vehicleId, initialPrice, initialPaymentType, initialDownPayment, initialInstallments, initialInstallmentValue]);

  const client = clientStorage.getById(clientId);
  const vehicle = vehicleStorage.getById(vehicleId);
  if (!client || !vehicle) return null;

  const handleConfirm = () => {
    if (data.paymentType === 'parcelado' && !data.firstDueDate) {
      setActiveTab('pagamento');
      toast({
        title: 'Data do 1º vencimento',
        description: 'Informe a data exata do primeiro vencimento.',
        variant: 'destructive',
      });
      return;
    }

    onConfirm(data);
    onOpenChange(false);
  };
  
  // Generate days 1-31
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Revisão do Contrato
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex justify-end mb-2">
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            {isEditing ? 'Modo Visualização' : 'Editar Dados'}
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="cliente" className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Comprador</span>
            </TabsTrigger>
            <TabsTrigger value="veiculo" className="flex items-center gap-1">
              <Car className="h-4 w-4" />
              <span className="hidden sm:inline">Veículo</span>
            </TabsTrigger>
            <TabsTrigger value="pagamento" className="flex items-center gap-1">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Pagamento</span>
            </TabsTrigger>
            <TabsTrigger value="vendedor" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Vendedor</span>
            </TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[400px] mt-4">
            {/* COMPRADOR TAB */}
            <TabsContent value="cliente" className="space-y-4 pr-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">DADOS DO COMPRADOR</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome Completo</Label>
                      {isEditing ? (
                        <Input value={data.clientName} onChange={(e) => setData({ ...data, clientName: e.target.value })} />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-muted rounded">{data.clientName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>CPF</Label>
                      {isEditing ? (
                        <Input value={data.clientCpf} onChange={(e) => setData({ ...data, clientCpf: e.target.value })} />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-muted rounded">{formatCPF(data.clientCpf)}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>RG</Label>
                      {isEditing ? (
                        <Input value={data.clientRg} onChange={(e) => setData({ ...data, clientRg: e.target.value })} />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-muted rounded">{formatRG(data.clientRg)}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Estado Civil</Label>
                      {isEditing ? (
                        <Input value={data.clientMaritalStatus} onChange={(e) => setData({ ...data, clientMaritalStatus: e.target.value })} />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-muted rounded">{data.clientMaritalStatus}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Profissão</Label>
                      {isEditing ? (
                        <Input value={data.clientOccupation} onChange={(e) => setData({ ...data, clientOccupation: e.target.value })} />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-muted rounded">{data.clientOccupation || '-'}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      {isEditing ? (
                        <Input value={data.clientEmail} onChange={(e) => setData({ ...data, clientEmail: e.target.value })} />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-muted rounded">{data.clientEmail}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Endereço Completo</Label>
                    {isEditing ? (
                      <Input value={data.clientAddress} onChange={(e) => setData({ ...data, clientAddress: e.target.value })} />
                    ) : (
                      <p className="text-sm font-medium p-2 bg-muted rounded">{data.clientAddress}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* VEÍCULO TAB */}
            <TabsContent value="veiculo" className="space-y-4 pr-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">DADOS DO VEÍCULO</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Marca</Label>
                      {isEditing ? (
                        <Input value={data.vehicleBrand} onChange={(e) => setData({ ...data, vehicleBrand: e.target.value })} />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-muted rounded">{data.vehicleBrand}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Modelo</Label>
                      {isEditing ? (
                        <Input value={data.vehicleModel} onChange={(e) => setData({ ...data, vehicleModel: e.target.value })} />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-muted rounded">{data.vehicleModel}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Ano</Label>
                      {isEditing ? (
                        <Input type="number" value={data.vehicleYear} onChange={(e) => setData({ ...data, vehicleYear: parseInt(e.target.value) || 0 })} />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-muted rounded">{data.vehicleYear}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Cor</Label>
                      {isEditing ? (
                        <Input value={data.vehicleColor} onChange={(e) => setData({ ...data, vehicleColor: e.target.value })} />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-muted rounded">{data.vehicleColor}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Combustível</Label>
                      {isEditing ? (
                        <Input value={data.vehicleFuel} onChange={(e) => setData({ ...data, vehicleFuel: e.target.value })} />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-muted rounded">{data.vehicleFuel}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Câmbio</Label>
                      {isEditing ? (
                        <Input value={data.vehicleTransmission} onChange={(e) => setData({ ...data, vehicleTransmission: e.target.value })} />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-muted rounded">{data.vehicleTransmission}</p>
                      )}
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Placa</Label>
                      {isEditing ? (
                        <Input value={data.vehiclePlate} onChange={(e) => setData({ ...data, vehiclePlate: e.target.value })} />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-muted rounded">{data.vehiclePlate || 'A ser emplacado'}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>KM Rodados</Label>
                      {isEditing ? (
                        <Input type="number" value={data.vehicleMileage} onChange={(e) => setData({ ...data, vehicleMileage: parseInt(e.target.value) || 0 })} />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-muted rounded">{data.vehicleMileage.toLocaleString('pt-BR')} km</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Chassi</Label>
                      {isEditing ? (
                        <Input value={data.vehicleChassis} onChange={(e) => setData({ ...data, vehicleChassis: e.target.value.toUpperCase() })} maxLength={17} />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-muted rounded font-mono">{data.vehicleChassis || '-'}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Renavam</Label>
                      {isEditing ? (
                        <Input value={data.vehicleRenavam} onChange={(e) => setData({ ...data, vehicleRenavam: e.target.value })} maxLength={11} />
                      ) : (
                        <p className="text-sm font-medium p-2 bg-muted rounded font-mono">{data.vehicleRenavam || '-'}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* PAGAMENTO TAB */}
            <TabsContent value="pagamento" className="space-y-4 pr-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">CONDIÇÕES DE PAGAMENTO</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Valor do Veículo</Label>
                    {isEditing ? (
                      <Input 
                        type="number" 
                        value={data.vehiclePrice} 
                        onChange={(e) => setData({ ...data, vehiclePrice: parseFloat(e.target.value) || 0 })} 
                      />
                    ) : (
                      <p className="text-lg font-bold p-2 bg-muted rounded text-primary">{formatCurrency(data.vehiclePrice)}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Forma de Pagamento</Label>
                    <Select 
                      value={data.paymentType} 
                      onValueChange={(v: 'avista' | 'parcelado') => setData({ ...data, paymentType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="avista">À Vista</SelectItem>
                        <SelectItem value="parcelado">Parcelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {data.paymentType === 'parcelado' && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Valor da Entrada</Label>
                          <Input 
                            type="number" 
                            value={data.downPayment} 
                            onChange={(e) => setData({ ...data, downPayment: parseFloat(e.target.value) || 0 })} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Número de Parcelas</Label>
                          <Input 
                            type="number" 
                            value={data.installments} 
                            onChange={(e) => setData({ ...data, installments: parseInt(e.target.value) || 1 })}
                            min={1}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Valor da Parcela</Label>
                          <Input 
                            type="number" 
                            value={data.installmentValue} 
                            onChange={(e) => setData({ ...data, installmentValue: parseFloat(e.target.value) || 0 })} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Dia do Vencimento</Label>
                          <Select 
                            value={String(data.dueDay)} 
                            onValueChange={(v) => setData({ ...data, dueDay: parseInt(v) })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Dia" />
                            </SelectTrigger>
                            <SelectContent>
                              {days.map(day => (
                                <SelectItem key={day} value={String(day)}>
                                  Dia {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Data do 1º vencimento</Label>
                        <Input
                          type="date"
                          value={data.firstDueDate}
                          onChange={(e) => setData({ ...data, firstDueDate: e.target.value })}
                        />
                      </div>
                      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <p className="text-sm text-muted-foreground">Saldo a Financiar:</p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(data.vehiclePrice - data.downPayment)}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* VENDEDOR TAB */}
            <TabsContent value="vendedor" className="space-y-4 pr-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">DADOS DO VENDEDOR</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Razão Social</Label>
                    <p className="text-sm font-medium p-2 bg-muted rounded">{company.fantasyName}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <p className="text-sm font-medium p-2 bg-muted rounded">{company.cnpj}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Endereço</Label>
                    <p className="text-sm font-medium p-2 bg-muted rounded">
                      {`${company.address.street}, ${company.address.neighborhood} - ${company.address.city}/${company.address.state}, CEP ${company.address.zipCode}`}
                    </p>
                  </div>
                  {company.legalRepresentative && (
                    <>
                      <Separator />
                      <p className="text-xs text-muted-foreground font-medium">REPRESENTANTE LEGAL</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nome</Label>
                          <p className="text-sm font-medium p-2 bg-muted rounded">{company.legalRepresentative.name}</p>
                        </div>
                        <div className="space-y-2">
                          <Label>CPF</Label>
                          <p className="text-sm font-medium p-2 bg-muted rounded">{company.legalRepresentative.cpf}</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="btn-primary">
            <Download className="h-4 w-4 mr-2" />
            Gerar Contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { ContractData };
