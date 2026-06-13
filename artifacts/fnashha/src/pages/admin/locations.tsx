import { useState } from "react";
import {
  useListGovernorates, getListGovernoratesQueryKey, useCreateGovernorate, useDeleteGovernorate,
  useListAreas, getListAreasQueryKey, useCreateArea, useDeleteArea,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2 } from "lucide-react";

export default function AdminLocations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"gov" | "area">("gov");

  const [newGovName, setNewGovName] = useState("");
  const [newGovNameAr, setNewGovNameAr] = useState("");
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaNameAr, setNewAreaNameAr] = useState("");
  const [newAreaGovId, setNewAreaGovId] = useState("");

  const { data: governorates = [] } = useListGovernorates({ query: { queryKey: getListGovernoratesQueryKey() } });
  const { data: areas = [] } = useListAreas(undefined as any, { query: { queryKey: getListAreasQueryKey() } });

  const createGovMutation = useCreateGovernorate();
  const deleteGovMutation = useDeleteGovernorate();
  const createAreaMutation = useCreateArea();
  const deleteAreaMutation = useDeleteArea();

  const govs = Array.isArray(governorates) ? governorates : [];
  const allAreas = Array.isArray(areas) ? areas : [];

  const addGov = () => {
    if (!newGovName || !newGovNameAr) return;
    createGovMutation.mutate(
      { data: { name: newGovName, nameAr: newGovNameAr } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGovernoratesQueryKey() });
          toast({ title: "تم إضافة المحافظة" });
          setNewGovName(""); setNewGovNameAr("");
        },
      }
    );
  };

  const addArea = () => {
    if (!newAreaName || !newAreaNameAr || !newAreaGovId) return;
    createAreaMutation.mutate(
      { data: { name: newAreaName, nameAr: newAreaNameAr, governorateId: parseInt(newAreaGovId) } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAreasQueryKey() });
          toast({ title: "تم إضافة المنطقة" });
          setNewAreaName(""); setNewAreaNameAr("");
        },
      }
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">إدارة المناطق</h1>
      </div>

      <div className="flex gap-2 mb-5">
        <Button variant={tab === "gov" ? "default" : "outline"} size="sm" onClick={() => setTab("gov")}>
          المحافظات ({govs.length})
        </Button>
        <Button variant={tab === "area" ? "default" : "outline"} size="sm" onClick={() => setTab("area")}>
          المناطق ({allAreas.length})
        </Button>
      </div>

      {tab === "gov" && (
        <>
          <div className="flex gap-2 mb-4">
            <Input value={newGovNameAr} onChange={(e) => setNewGovNameAr(e.target.value)} placeholder="الاسم بالعربي" data-testid="input-gov-name-ar" />
            <Input value={newGovName} onChange={(e) => setNewGovName(e.target.value)} placeholder="English name" data-testid="input-gov-name" />
            <Button onClick={addGov} disabled={createGovMutation.isPending} data-testid="button-add-gov">
              <PlusCircle className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {govs.map((g: any) => (
              <Card key={g.id} data-testid={`row-gov-${g.id}`}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{g.nameAr}</p>
                    <p className="text-xs text-muted-foreground">{g.name}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteGovMutation.mutate({ id: g.id } as any, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListGovernoratesQueryKey() }) })}
                    data-testid={`button-delete-gov-${g.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === "area" && (
        <>
          <div className="flex gap-2 mb-4">
            <Input value={newAreaNameAr} onChange={(e) => setNewAreaNameAr(e.target.value)} placeholder="الاسم بالعربي" data-testid="input-area-name-ar" />
            <Input value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} placeholder="English name" data-testid="input-area-name" />
            <Select value={newAreaGovId} onValueChange={setNewAreaGovId}>
              <SelectTrigger className="w-40" data-testid="select-gov">
                <SelectValue placeholder="المحافظة" />
              </SelectTrigger>
              <SelectContent>
                {govs.map((g: any) => <SelectItem key={g.id} value={g.id.toString()}>{g.nameAr}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={addArea} disabled={createAreaMutation.isPending} data-testid="button-add-area">
              <PlusCircle className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {allAreas.map((a: any) => (
              <Card key={a.id} data-testid={`row-area-${a.id}`}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{a.nameAr}</p>
                    <p className="text-xs text-muted-foreground">{a.governorate?.nameAr || a.name}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteAreaMutation.mutate({ id: a.id } as any, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAreasQueryKey() }) })}
                    data-testid={`button-delete-area-${a.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
