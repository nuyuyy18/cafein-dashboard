import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Plus, Trash, Clock } from 'lucide-react';
import { useCreateCafe, useUpdateOperatingHours, useCreateMenu, useCreateReview } from '@/hooks/useCafes';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { DAYS_OF_WEEK, MENU_CATEGORIES } from '@/types/database';

const cafeSchema = z.object({
  name: z.string().min(2, 'Nama kafe minimal 2 karakter'),
  address: z.string().min(5, 'Alamat minimal 5 karakter'),
  phone: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  operatingHours: z.array(z.object({
    day: z.number(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
    isClosed: z.boolean(),
  })),
  menus: z.array(z.object({
    name: z.string().min(1, 'Nama menu harus diisi'),
    price: z.coerce.number().min(0, 'Harga harus positif'),
    category: z.enum(['coffee', 'non_coffee', 'food']),
    description: z.string().optional(),
  })),
  review: z.object({
    rating: z.coerce.number().min(1).max(5),
    comment: z.string().optional(),
  }).optional(),
});

type CafeForm = z.infer<typeof cafeSchema>;

export default function CafeNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const createCafe = useCreateCafe();
  const updateOperatingHours = useUpdateOperatingHours();
  const createMenu = useCreateMenu();
  const createReview = useCreateReview();

  const form = useForm<CafeForm>({
    resolver: zodResolver(cafeSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      operatingHours: DAYS_OF_WEEK.map((_, index) => ({
        day: index,
        openTime: '08:00',
        closeTime: '22:00',
        isClosed: false,
      })),
      menus: [],
      review: {
        rating: 5,
        comment: '',
      },
    },
  });

  const { fields: menuFields, append: appendMenu, remove: removeMenu } = useFieldArray({
    control: form.control,
    name: "menus",
  });

  const onSubmit = async (data: CafeForm) => {
    try {
      // 1. Create Cafe
      const cafe = await createCafe.mutateAsync({
        name: data.name,
        address: data.address,
        phone: data.phone || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        owner_id: user?.id || null,
        is_active: true,
      });

      // 2. Create Operating Hours
      if (data.operatingHours && data.operatingHours.length > 0) {
        await Promise.all(data.operatingHours.map(hour =>
          updateOperatingHours.mutateAsync({
            cafe_id: cafe.id,
            day_of_week: hour.day,
            open_time: hour.isClosed ? null : hour.openTime || null,
            close_time: hour.isClosed ? null : hour.closeTime || null,
            is_closed: hour.isClosed,
          })
        ));
      }

      // 3. Create Menus
      if (data.menus && data.menus.length > 0) {
        await Promise.all(data.menus.map(menu =>
          createMenu.mutateAsync({
            cafe_id: cafe.id,
            name: menu.name,
            price: menu.price,
            category: menu.category,
            description: menu.description,
          })
        ));
      }

      // 4. Create Review
      if (data.review) {
        await createReview.mutateAsync({
          cafe_id: cafe.id,
          user_id: user?.id || 'anonymous', // Should ideally be authenticated user id
          rating: data.review.rating,
          comment: data.review.comment,
          is_admin_created: true,
        });
      }

      toast({ title: 'Kafe berhasil ditambahkan' });
      navigate(`/cafes/${cafe.id}`);
    } catch (error) {
      console.error(error);
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

              {/* Operating Hours */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Jam Operasional</h3>
                <div className="grid gap-4">
                  {form.watch('operatingHours')?.map((_, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-24 font-medium">{DAYS_OF_WEEK[index]}</div>
                      <FormField
                        control={form.control}
                        name={`operatingHours.${index}.isClosed`}
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">Tutup</FormLabel>
                          </FormItem>
                        )}
                      />
                      {!form.watch(`operatingHours.${index}.isClosed`) && (
                        <>
                          <FormField
                            control={form.control}
                            name={`operatingHours.${index}.openTime`}
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <div className="relative">
                                    <Input type="time" className="w-[120px]" {...field} />
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <span>-</span>
                          <FormField
                            control={form.control}
                            name={`operatingHours.${index}.closeTime`}
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <div className="relative">
                                    <Input type="time" className="w-[120px]" {...field} />
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Menu */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Menu</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendMenu({ name: '', price: 0, category: 'coffee', description: '' })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Menu
                  </Button>
                </div>

                {menuFields.map((field, index) => (
                  <Card key={field.id} className="p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`menus.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nama Menu</FormLabel>
                            <FormControl>
                              <Input placeholder="Es Kopi Susu" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`menus.${index}.price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Harga</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`menus.${index}.category`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kategori</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {MENU_CATEGORIES.map((category) => (
                                  <SelectItem key={category.value} value={category.value}>
                                    {category.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name={`menus.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Deskripsi</FormLabel>
                                <FormControl>
                                  <Input placeholder="Deskripsi singkat..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeMenu(index)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Review */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Ulasan Awal (Opsional)</h3>
                <Card className="p-4">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="review.rating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rating (1-5)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={5}
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="review.comment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Komentar</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Tempatnya nyaman, kopinya enak..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
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
