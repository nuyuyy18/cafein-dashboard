import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Phone, Star, Clock, Info } from 'lucide-react';
import type { Cafe } from '@/types/database';

interface CafeDetailDialogProps {
    cafe: Cafe | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CafeDetailDialog({ cafe, open, onOpenChange }: CafeDetailDialogProps) {
    if (!cafe) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        {cafe.name}
                        {cafe.rating > 4.5 && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                Top Rated
                            </Badge>
                        )}
                    </DialogTitle>
                    <DialogDescription className="text-base flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> {cafe.address}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                    <div className="space-y-6">
                        {/* Stats */}
                        <div className="flex items-center gap-6 p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                <div>
                                    <p className="font-semibold text-lg">{Number(cafe.rating).toFixed(1)}</p>
                                    <p className="text-xs text-muted-foreground">Rating</p>
                                </div>
                            </div>
                            <div className="w-px h-8 bg-border" />
                            <div className="flex items-center gap-2">
                                <Info className="h-5 w-5 text-blue-500" />
                                <div>
                                    <p className="font-semibold text-lg">{cafe.review_count}</p>
                                    <p className="text-xs text-muted-foreground">Ulasan</p>
                                </div>
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-lg">Informasi Kontak</h3>
                            <div className="grid gap-2">
                                {cafe.phone && (
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <Phone className="h-4 w-4" />
                                        <span>{cafe.phone}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span>{cafe.address}</span>
                                </div>
                            </div>
                        </div>

                        {/* Description or other details could go here */}
                        {/* Since the JSON schema is simple, we might not have much else yet, 
                but this structure is ready for operating hours, menu, etc. */}

                        <div className="flex justify-end pt-4">
                            {/* Placeholders for future actions */}
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
