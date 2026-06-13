import { Link } from "wouter";
import { useListOffers, getListOffersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ChevronLeft } from "lucide-react";
import { OFFER_STATUS_MAP } from "@/lib/status";

export default function TechnicianOffers() {
  const { data: offers = [], isLoading } = useListOffers(
    undefined as any,
    { query: { queryKey: getListOffersQueryKey() } }
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">عروضي</h1>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : (offers as any[]).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لم تقدم أي عروض بعد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(offers as any[]).map((offer: any) => {
            const status = OFFER_STATUS_MAP[offer.status] || { label: offer.status, color: "bg-gray-100" };
            return (
              <Link href={`/technician/requests/${offer.requestId}`} key={offer.id}>
                <Card className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" data-testid={`card-offer-${offer.id}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">طلب #{offer.requestId}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(offer.createdAt).toLocaleDateString("ar-EG")}</p>
                      {offer.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{offer.notes}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-lg font-black text-primary">{offer.price} جنيه</p>
                      <Badge className={`text-xs ${status.color} border-0`}>{status.label}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
