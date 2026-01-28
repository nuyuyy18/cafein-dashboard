import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';

const profileSchema = z.object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function Profile() {
    const { profile, refreshProfile } = useAuth();
    const { toast } = useToast();
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<ProfileForm>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            fullName: profile?.full_name || '',
        },
    });

    // Update form default values when profile loads
    useEffect(() => {
        if (profile) {
            form.reset({
                fullName: profile.full_name || '',
            });
        }
    }, [profile, form]);

    const onSubmit = async (data: ProfileForm) => {
        if (!profile) return;
        setIsLoading(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: data.fullName })
                .eq('id', profile.id);

            if (error) throw error;

            await refreshProfile();

            toast({
                title: t('profile.success_title'),
                description: t('profile.success_desc'),
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            toast({
                variant: "destructive",
                title: t('profile.error_title'),
                description: t('profile.error_desc'),
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container max-w-2xl py-8">
            <h1 className="mb-8 text-3xl font-bold">{t('profile.title')}</h1>
            <Card>
                <CardHeader>
                    <CardTitle>{t('profile.edit')}</CardTitle>
                    <CardDescription>
                        {t('profile.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="fullName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('profile.fullname')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t('profile.placeholder')} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('profile.save')}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
