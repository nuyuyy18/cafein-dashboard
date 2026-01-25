import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { useCreateCafe } from '@/hooks/useCafes';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const cafeSchema = z.object({
  name: z.string().min(2, 'Nama kafe minimal 2 karakter'),
  address: z.string().min(5, 'Alamat minimal 5 karakter'),
  phone: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

type CafeForm = z.infer<typeof cafeSchema>;

export default function CafeNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const createCafe = useCreateCafe();

  const form = useForm<CafeForm>({
    resolver: zodResolver(cafeSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
    },
  });

  const onSubmit = async (data: CafeForm) => {
    try {
      const result = await createCafe.mutateAsync({
        name: data.name,
        address: data.address,
        phone: data.phone || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        owner_id: user?.id || null,
        is_active: true,
      });
      toast({ title: 'Kafe berhasil ditambahkan' });
      navigate(`/cafes/${result.id}`);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Gagal menambahkan kafe' });
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/cafes')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
        <h1 className="text-2xl font-bold">Tambah Kafe Baru</h1>
      </div>

      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle>Informasi Kafe</CardTitle>
          <CardDescription>Isi detail kafe yang akan ditambahkan</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Kafe</FormLabel>
                    <FormControl>
                      <Input placeholder="Kopi Kenangan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alamat</FormLabel>
                    <FormControl>
                      <Input placeholder="Jl. Sudirman No. 123, Jakarta" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor Telepon (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="021-12345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude (Opsional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="-6.2088" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude (Opsional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="106.8456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => navigate('/cafes')}>
                  Batal
                </Button>
                <Button type="submit" disabled={createCafe.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  Simpan
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
