import { useState, useRef } from 'react';
import { useVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle, useUploadVehiclePhoto } from '@/hooks/useVehicles';
import { usePrivacy } from '@/contexts/PrivacyContext';
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
import { Skeleton } from '@/components/ui/skeleton';
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
  DollarSign,
  ImagePlus,
  X,
  Image,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type FuelType = Database['public']['Enums']['fuel_type'];
type TransmissionType = Database['public']['Enums']['transmission_type'];
type VehicleStatus = Database['public']['Enums']['vehicle_status'];

const fuelTypes: { value: FuelType; label: string }[] = [
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'etanol', label: 'Etanol' },
  { value: 'flex', label: 'Flex' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'eletrico', label: 'Elétrico' },
  { value: 'hibrido', label: 'Híbrido' },
];

const transmissionTypes: { value: TransmissionType; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatico', label: 'Automático' },
  { value: 'cvt', label: 'CVT' },
  { value: 'automatizado', label: 'Automatizado' },
];

const statusTypes: { value: VehicleStatus; label: string }[] = [
  { value: 'disponivel', label: 'Disponível' },
  { value: 'reservado', label: 'Reservado' },
  { value: 'vendido', label: 'Vendido' },
];

const MAX_IMAGES = 5;

interface VehicleForm {
  brand: string;
  model: string;
  version: string;
  yearFab: number;
  yearModel: number;
  price: number;
  mileage: number;
  fuel: FuelType;
  transmission: TransmissionType;
  color: string;
  plate: string;
  chassi: string;
  renavam: string;
  crvNumber: string;
  status: VehicleStatus;
  description: string;
}

export default function VehiclesPage() {
  const { privacyMode } = usePrivacy();
  const { toast } = useToast();
  
  const { data: vehicles = [], isLoading } = useVehicles();
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();
  const uploadPhoto = useUploadVehiclePhoto();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<typeof vehicles[0] | null>(null);
  const [viewingImages, setViewingImages] = useState<typeof vehicles[0] | null>(null);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<VehicleForm>({
    brand: '',
    model: '',
    version: '',
    yearFab: new Date().getFullYear(),
    yearModel: new Date().getFullYear(),
    price: 0,
    mileage: 0,
    fuel: 'flex',
    transmission: 'manual',
    color: '',
    plate: '',
    chassi: '',
    renavam: '',
    crvNumber: '',
    status: 'disponivel',
    description: '',
  });

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = `${v.brand} ${v.model} ${v.plate || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const currentCount = pendingImages.length + (editingVehicle?.photos?.length || 0);
    const remainingSlots = MAX_IMAGES - currentCount;

    if (files.length > remainingSlots) {
      toast({
        title: 'Limite de imagens',
        description: `Você pode adicionar no máximo ${MAX_IMAGES} fotos por veículo.`,
        variant: 'destructive',
      });
    }

    const filesToAdd = Array.from(files).slice(0, remainingSlots);
    setPendingImages(prev => [...prev, ...filesToAdd]);

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const vehicleData = {
        brand: form.brand,
        model: form.model,
        version: form.version || null,
        year_fab: form.yearFab,
        year_model: form.yearModel,
        price: form.price,
        mileage: form.mileage,
        fuel: form.fuel,
        transmission: form.transmission,
        color: form.color,
        plate: form.plate || null,
        chassi: form.chassi || null,
        renavam: form.renavam || null,
        crv_number: form.crvNumber || null,
        status: form.status,
        description: form.description || null,
      };

      let vehicleId: string;

      if (editingVehicle) {
        await updateVehicle.mutateAsync({ id: editingVehicle.id, ...vehicleData });
        vehicleId = editingVehicle.id;
      } else {
        const result = await createVehicle.mutateAsync(vehicleData);
        vehicleId = result.id;
      }

      // Upload pending images
      for (const file of pendingImages) {
        await uploadPhoto.mutateAsync({ vehicleId, file });
      }

      setIsDialogOpen(false);
      resetForm();

      toast({
        title: editingVehicle ? 'Veículo atualizado' : 'Veículo cadastrado',
        description: `${form.brand} ${form.model} foi salvo com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar o veículo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (vehicle: typeof vehicles[0]) => {
    setEditingVehicle(vehicle);
    setForm({
      brand: vehicle.brand,
      model: vehicle.model,
      version: vehicle.version || '',
      yearFab: vehicle.year_fab,
      yearModel: vehicle.year_model,
      price: Number(vehicle.price),
      mileage: vehicle.mileage || 0,
      fuel: vehicle.fuel,
      transmission: vehicle.transmission,
      color: vehicle.color,
      plate: vehicle.plate || '',
      chassi: vehicle.chassi || '',
      renavam: vehicle.renavam || '',
      crvNumber: vehicle.crv_number || '',
      status: vehicle.status,
      description: vehicle.description || '',
    });
    setPendingImages([]);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este veículo?')) {
      try {
        await deleteVehicle.mutateAsync(id);
        toast({
          title: 'Veículo excluído',
          description: 'O veículo foi removido do sistema.',
        });
      } catch (error) {
        toast({
          title: 'Erro ao excluir',
          description: 'Ocorreu um erro ao excluir o veículo.',
          variant: 'destructive',
        });
      }
    }
  };

  const resetForm = () => {
    setEditingVehicle(null);
    setPendingImages([]);
    setForm({
      brand: '',
      model: '',
      version: '',
      yearFab: new Date().getFullYear(),
      yearModel: new Date().getFullYear(),
      price: 0,
      mileage: 0,
      fuel: 'flex',
      transmission: 'manual',
      color: '',
      plate: '',
      chassi: '',
      renavam: '',
      crvNumber: '',
      status: 'disponivel',
      description: '',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

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

              <div className="space-y-2">
                <Label htmlFor="version">Versão</Label>
                <Input
                  id="version"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                  placeholder="XEi 2.0"
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yearFab">Ano Fab.</Label>
                  <Input
                    id="yearFab"
                    type="number"
                    value={form.yearFab}
                    onChange={(e) => setForm({ ...form, yearFab: parseInt(e.target.value) })}
                    min={1900}
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearModel">Ano Mod.</Label>
                  <Input
                    id="yearModel"
                    type="number"
                    value={form.yearModel}
                    onChange={(e) => setForm({ ...form, yearModel: parseInt(e.target.value) })}
                    min={1900}
                    max={new Date().getFullYear() + 2}
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
                  <Label htmlFor="mileage">KM</Label>
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
                  <Select value={form.fuel} onValueChange={(v) => setForm({ ...form, fuel: v as FuelType })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fuelTypes.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Câmbio</Label>
                  <Select value={form.transmission} onValueChange={(v) => setForm({ ...form, transmission: v as TransmissionType })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {transmissionTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as VehicleStatus })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusTypes.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
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

              {/* Documentação */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Documentação</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="chassi">Chassi</Label>
                    <Input
                      id="chassi"
                      value={form.chassi}
                      onChange={(e) => setForm({ ...form, chassi: e.target.value.toUpperCase().slice(0, 17) })}
                      placeholder="9BWZZZ377VT004251"
                      maxLength={17}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="renavam">Renavam</Label>
                    <Input
                      id="renavam"
                      value={form.renavam}
                      onChange={(e) => setForm({ ...form, renavam: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                      placeholder="00123456789"
                      maxLength={11}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crvNumber">CRV</Label>
                    <Input
                      id="crvNumber"
                      value={form.crvNumber}
                      onChange={(e) => setForm({ ...form, crvNumber: e.target.value })}
                      placeholder="Nº do CRV"
                    />
                  </div>
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImagePlus className="h-4 w-4" />
                  Fotos ({(editingVehicle?.vehicle_photos?.length || 0) + pendingImages.length}/{MAX_IMAGES})
                </Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  {/* Existing photos */}
                  {editingVehicle?.photos && editingVehicle.photos.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      {editingVehicle.photos.map((photo) => (
                        <div key={photo.id} className="relative">
                          <img 
                            src={photo.photo_url} 
                            alt="Foto"
                            className="h-16 w-full object-cover rounded border"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pending photos */}
                  {pendingImages.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      {pendingImages.map((file, idx) => (
                        <div key={idx} className="relative group">
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt={`Foto ${idx + 1}`} 
                            className="h-16 w-full object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={(editingVehicle?.photos?.length || 0) + pendingImages.length >= MAX_IMAGES}
                    className="w-full"
                  >
                    <ImagePlus className="h-4 w-4 mr-2" />
                    Adicionar Fotos
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detalhes adicionais..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingVehicle ? 'Salvar Alterações' : 'Cadastrar Veículo'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Image Gallery Dialog */}
      <Dialog open={!!viewingImages} onOpenChange={() => setViewingImages(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {viewingImages && `${viewingImages.brand} ${viewingImages.model}`}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {viewingImages?.photos?.map((photo) => (
              <img
                key={photo.id}
                src={photo.photo_url}
                alt="Foto do veículo"
                className="w-full rounded-lg object-cover aspect-video"
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por marca, modelo ou placa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {statusTypes.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vehicles Grid */}
      {filteredVehicles.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map((vehicle, index) => {
            const mainImage = vehicle.photos?.[0]?.photo_url || null;
            const fuelLabel = fuelTypes.find(f => f.value === vehicle.fuel)?.label || vehicle.fuel;
            const statusLabel = statusTypes.find(s => s.value === vehicle.status)?.label || vehicle.status;
            
            return (
              <Card 
                key={vehicle.id} 
                className={cn(
                  'overflow-hidden card-hover animate-slide-up',
                  vehicle.status === 'vendido' && 'opacity-60'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Image */}
                <div 
                  className="aspect-video bg-muted relative cursor-pointer"
                  onClick={() => vehicle.photos?.length && setViewingImages(vehicle)}
                >
                  {mainImage ? (
                    <img 
                      src={mainImage} 
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  {vehicle.photos && vehicle.photos.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-background/80 px-2 py-1 rounded-md text-xs flex items-center gap-1">
                      <Image className="h-3 w-3" />
                      {vehicle.photos.length}
                    </div>
                  )}
                  <div className={cn(
                    'absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-medium',
                    vehicle.status === 'disponivel' && 'bg-success/90 text-success-foreground',
                    vehicle.status === 'reservado' && 'bg-warning/90 text-warning-foreground',
                    vehicle.status === 'vendido' && 'bg-muted text-muted-foreground',
                  )}>
                    {statusLabel}
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{vehicle.brand} {vehicle.model}</h3>
                      {vehicle.version && (
                        <p className="text-xs text-muted-foreground">{vehicle.version}</p>
                      )}
                    </div>
                    <PrivacyMask>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(Number(vehicle.price))}
                      </span>
                    </PrivacyMask>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{vehicle.year_fab}/{vehicle.year_model}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5" />
                      <span>{formatMileage(vehicle.mileage || 0)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Fuel className="h-3.5 w-3.5" />
                      <span>{fuelLabel}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Car className="h-3.5 w-3.5" />
                      <span>{vehicle.color}</span>
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
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(vehicle.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <Car className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">Nenhum veículo encontrado</h3>
            <p className="text-muted-foreground">
              {search || statusFilter !== 'all' 
                ? 'Tente ajustar os filtros de busca'
                : 'Cadastre seu primeiro veículo clicando no botão acima'
              }
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
