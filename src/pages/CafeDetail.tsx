import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, Star, MapPin, Phone, Clock, Coffee,
  Pencil, Trash2, Plus, Upload, X, Save
} from 'lucide-react';
import { useCafe, useUpdateCafe, useDeleteCafe, useCreateMenu, useDeleteMenu, useUploadCafeImage, useDeleteCafeImage, useCreateReview } from '@/hooks/useCafes';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { DAYS_OF_WEEK, MENU_CATEGORIES, type MenuCategory } from '@/types/database';

const menuSchema = z.object({
  name: z.string().min(1, 'Nama menu wajib diisi'),
  price: z.coerce.number().min(0, 'Harga tidak valid'),
  category: z.enum(['coffee', 'non_coffee', 'food']),
  description: z.string().optional(),
});

const reviewSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  comment: z.string().optional(),
});

type MenuForm = z.infer<typeof menuSchema>;
type ReviewForm = z.infer<typeof reviewSchema>;

export default function CafeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, isStoreManager } = useAuth();

  const { data: cafe, isLoading, refetch } = useCafe(id);
  const updateCafe = useUpdateCafe();
  const deleteCafe = useDeleteCafe();
  const createMenu = useCreateMenu();
  const deleteMenu = useDeleteMenu();
  const uploadImage = useUploadCafeImage();
  const deleteImage = useDeleteCafeImage();
  const createReview = useCreateReview();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    phone: '',
    is_active: true,
  });
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const canEdit = isAdmin || (isStoreManager && cafe?.owner_id === user?.id);

  const menuForm = useForm<MenuForm>({
    resolver: zodResolver(menuSchema),
    defaultValues: { name: '', price: 0, category: 'coffee', description: '' },
  });

  const reviewForm = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5, comment: '' },
  });

  useEffect(() => {
    if (cafe) {
      setEditForm({
        name: cafe.name,
        address: cafe.address,
        phone: cafe.phone || '',
        is_active: cafe.is_active,
      });
    }
  }, [cafe]);

  const handleSave = async () => {
    if (!id) return;

    try {
      await updateCafe.mutateAsync({ id, ...editForm });
      toast({ title: 'Kafe berhasil diperbarui' });
      setIsEditing(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Gagal memperbarui kafe' });
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteCafe.mutateAsync(id);
      toast({ title: 'Kafe berhasil dihapus' });
      navigate('/cafes');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Gagal menghapus kafe' });
    }
  };

  const handleAddMenu = async (data: MenuForm) => {
    if (!id) return;

    try {
      await createMenu.mutateAsync({
        cafe_id: id,
        name: data.name,
        price: data.price,
        category: data.category,
        description: data.description,
      });
      toast({ title: 'Menu berhasil ditambahkan' });
      setMenuDialogOpen(false);
      menuForm.reset();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Gagal menambahkan menu' });
    }
  };

  const handleDeleteMenu = async (menuId: string) => {
    if (!id) return;

    try {
      await deleteMenu.mutateAsync({ id: menuId, cafe_id: id });
      toast({ title: 'Menu berhasil dihapus' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Gagal menghapus menu' });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !e.target.files?.[0]) return;

    try {
      await uploadImage.mutateAsync({
        cafe_id: id,
        file: e.target.files[0],
        is_primary: !cafe?.cafe_images?.length
      });
      toast({ title: 'Gambar berhasil diunggah' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Gagal mengunggah gambar' });
    }
  };

  const handleDeleteImage = async (imageId: string, imageUrl: string) => {
    if (!id) return;

    try {
      await deleteImage.mutateAsync({ id: imageId, cafe_id: id, image_url: imageUrl });
      toast({ title: 'Gambar berhasil dihapus' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Gagal menghapus gambar' });
    }
  };

  const handleAddReview = async (data: ReviewForm) => {
    if (!id || !user) return;

    try {
      await createReview.mutateAsync({
        cafe_id: id,
        user_id: user.id,
        rating: data.rating,
        comment: data.comment || undefined,
        is_admin_created: isAdmin,
      });
      toast({ title: 'Ulasan berhasil ditambahkan' });
      setReviewDialogOpen(false);
      reviewForm.reset();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Gagal menambahkan ulasan' });
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!cafe) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg text-muted-foreground">Kafe tidak ditemukan</p>
        <Button variant="link" onClick={() => navigate('/cafes')}>
          Kembali ke daftar kafe
        </Button>
      </div>
    );
  }

  const primaryImage = cafe.cafe_images?.find(img => img.is_primary) || cafe.cafe_images?.[0];
  const placeholderImage = 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=400&fit=crop';

  const groupedMenus = cafe.cafe_menus?.reduce((acc, menu) => {
    const cat = menu.category as MenuCategory;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(menu);
    return acc;
  }, {} as Record<MenuCategory, typeof cafe.cafe_menus>) || {};

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/cafes')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>

        {canEdit && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Batal
                </Button>
                <Button onClick={handleSave} disabled={updateCafe.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  Simpan
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Hapus
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus Kafe?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tindakan ini tidak dapat dibatalkan. Semua data kafe termasuk menu dan ulasan akan dihapus.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        )}
      </div>

      {/* Hero Image */}
      <Card className="overflow-hidden border-0 shadow-card">
        <AspectRatio ratio={21 / 9}>
          <img
            src={primaryImage?.image_url || placeholderImage}
            alt={cafe.name}
            className="h-full w-full object-cover"
          />
        </AspectRatio>
      </Card>

      {/* Basic Info */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1 space-y-3">
              {isEditing ? (
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="text-2xl font-bold"
                />
              ) : (
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{cafe.name}</h1>
                  {!cafe.is_active && <Badge variant="destructive">Tutup</Badge>}
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-foreground">{Number(cafe.rating).toFixed(1)}</span>
                  <span>({cafe.review_count} ulasan)</span>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <Input
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      placeholder="Alamat"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="Nomor telepon"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Aktif</span>
                    <Switch
                      checked={editForm.is_active}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{cafe.address}</span>
                  </div>
                  {cafe.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{cafe.phone}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Operating Hours */}
              {cafe.operating_hours && cafe.operating_hours.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <h3 className="mb-2 font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Jam Operasional
                  </h3>
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                    {[...cafe.operating_hours]
                      .sort((a, b) => {
                        // Sort MON(1)..SUN(0) -> MON(1)..SUN(7)
                        const dayA = a.day_of_week === 0 ? 7 : a.day_of_week;
                        const dayB = b.day_of_week === 0 ? 7 : b.day_of_week;
                        return dayA - dayB;
                      })
                      .map((hour) => (
                        <div key={hour.id} className="flex items-center gap-6">
                          <span className="w-24 font-medium">{DAYS_OF_WEEK[hour.day_of_week]}</span>
                          <span>
                            {hour.is_closed
                              ? 'Tutup'
                              : `${hour.open_time?.slice(0, 5)} - ${hour.close_time?.slice(0, 5)}`}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="menu" className="space-y-4">
        <TabsList>
          <TabsTrigger value="menu" className="gap-2">
            <Coffee className="h-4 w-4" />
            Menu
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2">
            <Star className="h-4 w-4" />
            Ulasan
          </TabsTrigger>
          {canEdit && (
            <TabsTrigger value="images" className="gap-2">
              <Upload className="h-4 w-4" />
              Foto
            </TabsTrigger>
          )}
        </TabsList>

        {/* Menu Tab */}
        <TabsContent value="menu">
          <Card className="border-0 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Menu</CardTitle>
                <CardDescription>Daftar menu yang tersedia</CardDescription>
              </div>
              {/* Menu Link Button if exists */}
              {cafe.cafe_menus?.map(m => {
                if (m.name === 'Link Menu' && m.description) {
                  return (
                    <Button key={m.id} variant="outline" className="gap-2" onClick={() => window.open(m.description, '_blank')}>
                      <p className="font-semibold text-primary">Buka Menu Digital</p>
                    </Button>
                  )
                }
                return null;
              })}

              {canEdit && (
                <Dialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Tambah Menu
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <Form {...menuForm}>
                      <form onSubmit={menuForm.handleSubmit(handleAddMenu)}>
                        <DialogHeader>
                          <DialogTitle>Tambah Menu Baru</DialogTitle>
                          <DialogDescription>Isi detail menu yang akan ditambahkan</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <FormField
                            control={menuForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nama Menu</FormLabel>
                                <FormControl>
                                  <Input placeholder="Cappuccino" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={menuForm.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Harga (Rp)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="25000" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={menuForm.control}
                            name="category"
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
                                    {MENU_CATEGORIES.map((cat) => (
                                      <SelectItem key={cat.value} value={cat.value}>
                                        {cat.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={menuForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Deskripsi (opsional)</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Deskripsi menu..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={createMenu.isPending}>
                            Tambah
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {Object.keys(groupedMenus).length > 0 ? (
                <div className="space-y-6">
                  {/* Display Menu Images First if any */}
                  {cafe.cafe_images && cafe.cafe_images.length > 0 && (
                    <div className="mb-6">
                      <h3 className="mb-3 text-lg font-semibold">Foto Menu</h3>
                      <div className="flex gap-4 overflow-x-auto pb-4">
                        {cafe.cafe_images.map(img => (
                          <div key={img.id} className="relative h-40 w-40 flex-none overflow-hidden rounded-lg border">
                            <img src={img.image_url} alt="Menu" className="h-full w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {MENU_CATEGORIES.map((cat) => {
                    const menus = groupedMenus[cat.value]?.filter(m => m.name !== 'Link Menu'); // Filter out the link item
                    if (!menus?.length) return null;

                    return (
                      <div key={cat.value}>
                        <h3 className="mb-3 text-lg font-semibold">{cat.label}</h3>
                        <div className="space-y-2">
                          {menus.map((menu) => (
                            <div
                              key={menu.id}
                              className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                            >
                              <div>
                                <p className="font-medium">{menu.name}</p>
                                {menu.description && (
                                  <p className="text-sm text-muted-foreground">{menu.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold">
                                  Rp {Number(menu.price).toLocaleString('id-ID')}
                                </span>
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteMenu(menu.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground space-y-4">
                  <p>Belum ada detail menu terdaftar</p>
                  {/* If images exist even if no text menu items */}
                  {cafe.cafe_images && cafe.cafe_images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {cafe.cafe_images.map(img => (
                        <img key={img.id} src={img.image_url} className="rounded-lg border object-cover aspect-square" />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          <Card className="border-0 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Ulasan</CardTitle>
                <CardDescription>{cafe.review_count} ulasan dari pelanggan</CardDescription>
              </div>
              {user && (
                <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Tulis Ulasan
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <Form {...reviewForm}>
                      <form onSubmit={reviewForm.handleSubmit(handleAddReview)}>
                        <DialogHeader>
                          <DialogTitle>Tulis Ulasan</DialogTitle>
                          <DialogDescription>Bagikan pengalaman Anda</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <FormField
                            control={reviewForm.control}
                            name="rating"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rating</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {[5, 4, 3, 2, 1].map((num) => (
                                      <SelectItem key={num} value={String(num)}>
                                        {'⭐'.repeat(num)} ({num})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={reviewForm.control}
                            name="comment"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Komentar (opsional)</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Bagikan pengalaman Anda..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={createReview.isPending}>
                            Kirim Ulasan
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {cafe.reviews && cafe.reviews.length > 0 ? (
                <div className="space-y-4">
                  {cafe.reviews.map((review) => (
                    <div key={review.id} className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-muted-foreground/30'
                                  }`}
                              />
                            ))}
                          </div>
                          {review.is_admin_created && (
                            <Badge variant="secondary" className="text-xs">Admin</Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                      <div className="mb-2">
                        {review.profiles ? (
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-sm">{review.profiles.full_name}</div>
                          </div>
                        ) : (
                          // Parsing author name from comment if formatted like "[Author] Comment"
                          review.comment?.startsWith('[') ? (
                            <div className="font-semibold text-sm text-muted-foreground">
                              {review.comment.substring(1, review.comment.indexOf(']'))} (Google User)
                            </div>
                          ) : (
                            <div className="font-semibold text-sm text-muted-foreground">Google User</div>
                          )
                        )}
                      </div>
                      {review.comment && (
                        <p className="text-muted-foreground">
                          {/* Remove [Author] prefix for display if present */}
                          {review.comment.startsWith('[')
                            ? review.comment.substring(review.comment.indexOf(']') + 1).trim()
                            : review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">Belum ada ulasan</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Images Tab (Visible to all) */}
        <TabsContent value="images">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle>Foto Kafe</CardTitle>
              <CardDescription>Galeri foto suasana dan menu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {cafe.cafe_images?.map((image) => (
                  <div key={image.id} className="group relative">
                    <AspectRatio ratio={4 / 3}>
                      <img
                        src={image.image_url}
                        alt="Cafe"
                        loading="lazy"
                        className="h-full w-full rounded-lg object-cover"
                      />
                    </AspectRatio>
                    {canEdit && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => handleDeleteImage(image.id, image.image_url)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {image.is_primary && (
                      <Badge className="absolute left-2 top-2">Utama</Badge>
                    )}
                  </div>
                ))}

                {canEdit && (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 transition-colors hover:border-primary/50">
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
