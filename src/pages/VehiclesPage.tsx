import { useState } from 'react';
import { vehicleStorage, generateId } from '@/lib/storage';
import { usePrivacy } from '@/contexts/PrivacyContext';
import type { Vehicle } from '@/types';
import { formatCurrency, formatMileage } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import { PrivacyMask } from '@/components/PrivacyMask';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Car, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2,
  Fuel,
  Gauge,
  Calendar,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

const fuelTypes = ['Gasolina', 'Etanol', 'Flex', 'Diesel', 'Elétrico', 'Híbrido'] as const;
const transmissionTypes = ['Manual', 'Automático', 'CVT', 'Automatizado'] as const;
const statusTypes = ['disponivel', 'reservado', 'vendido'] as const;

const statusLabels = {
  disponivel: 'Disponível',
  reservado: 'Reservado',
  vendido: 'Vendido',
};

export default function VehiclesPage() {
  const { privacyMode } = usePrivacy();
  const [vehicles, setVehicles] = useState<Vehicle[]>(vehicleStorage.getAll());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    price: 0,
    mileage: 0,
    fuel: 'Flex' as Vehicle['fuel'],
    transmission: 'Manual' as Vehicle['transmission'],
    color: '',
    plate: '',
    status: 'disponivel' as Vehicle['status'],
    description: '',
  });

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = `${v.brand} ${v.model} ${v.plate}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const now = new Date().toISOString();
    const vehicle: Vehicle = {
      id: editingVehicle?.id || generateId(),
      ...form,
      images: editingVehicle?.images || [],
      createdAt: editingVehicle?.createdAt || now,
      updatedAt: now,
    };

    vehicleStorage.save(vehicle);
    setVehicles(vehicleStorage.getAll());
    setIsDialogOpen(false);
    resetForm();

    toast({
      title: editingVehicle ? 'Veículo atualizado' : 'Veículo cadastrado',
      description: `${vehicle.brand} ${vehicle.model} foi salvo com sucesso.`,
    });
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setForm({
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      price: vehicle.price,
      mileage: vehicle.mileage,
      fuel: vehicle.fuel,
      transmission: vehicle.transmission,
      color: vehicle.color,
      plate: vehicle.plate || '',
      status: vehicle.status,
      description: vehicle.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este veículo?')) {
      vehicleStorage.delete(id);
      setVehicles(vehicleStorage.getAll());
      toast({
        title: 'Veículo excluído',
        description: 'O veículo foi removido do sistema.',
      });
    }
  };

  const resetForm = () => {
    setEditingVehicle(null);
    setForm({
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      price: 0,
      mileage: 0,
      fuel: 'Flex',
      transmission: 'Manual',
      color: '',
      plate: '',
      status: 'disponivel',
      description: '',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Veículos</h1>
          <p className="text-muted-foreground">Gerencie o estoque de veículos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Novo Veículo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    placeholder="Toyota"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Modelo</Label>
                  <Input
                    id="model"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    placeholder="Corolla"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Ano</Label>
                  <Input
                    id="year"
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                    min={1900}
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Valor (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })}
                    min={0}
                    step={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mileage">Quilometragem</Label>
                  <Input
                    id="mileage"
                    type="number"
                    value={form.mileage}
                    onChange={(e) => setForm({ ...form, mileage: parseInt(e.target.value) })}
                    min={0}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Combustível</Label>
                  <Select value={form.fuel} onValueChange={(v) => setForm({ ...form, fuel: v as Vehicle['fuel'] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fuelTypes.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Câmbio</Label>
                  <Select value={form.transmission} onValueChange={(v) => setForm({ ...form, transmission: v as Vehicle['transmission'] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {transmissionTypes.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Vehicle['status'] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusTypes.map((s) => (
                        <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color">Cor</Label>
                  <Input
                    id="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    placeholder="Prata"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plate">Placa</Label>
                  <Input
                    id="plate"
                    value={form.plate}
                    onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
                    placeholder="ABC-1234"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detalhes adicionais do veículo..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="btn-primary">
                  {editingVehicle ? 'Salvar Alterações' : 'Cadastrar Veículo'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por marca, modelo ou placa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {statusTypes.map((s) => (
              <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vehicle Grid */}
      {filteredVehicles.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map((vehicle, index) => (
            <Card 
              key={vehicle.id} 
              className="overflow-hidden hover:shadow-lg transition-all duration-200 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="h-40 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                <Car className="h-16 w-16 text-muted-foreground/30" />
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">
                      <PrivacyMask type="blur">{vehicle.brand} {vehicle.model}</PrivacyMask>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      <PrivacyMask type="hide" placeholder="••••">{vehicle.year} • {vehicle.color}</PrivacyMask>
                    </p>
                  </div>
                  <span className={cn('badge-status', `badge-${vehicle.status}`)}>
                    {statusLabels[vehicle.status]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium text-foreground">
                      <PrivacyMask type="hide" placeholder="R$ •••••">
                        {formatCurrency(vehicle.price)}
                      </PrivacyMask>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Gauge className="h-4 w-4" />
                    <span>
                      <PrivacyMask type="hide" placeholder="••• km">
                        {formatMileage(vehicle.mileage)}
                      </PrivacyMask>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Fuel className="h-4 w-4" />
                    <span>{vehicle.fuel}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{vehicle.transmission}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(vehicle)}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(vehicle.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <Car className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">Nenhum veículo encontrado</h3>
            <p className="text-muted-foreground">
              {search || statusFilter !== 'all' 
                ? 'Tente ajustar os filtros de busca' 
                : 'Comece cadastrando seu primeiro veículo'}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
