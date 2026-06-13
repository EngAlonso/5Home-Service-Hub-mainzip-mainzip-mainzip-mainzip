import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRef, useState, useEffect } from "react";
import { useCreateRequest, useListServices, useListGovernorates, useListAreas, getListRequestsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Mic, X, Volume2, Square, Circle } from "lucide-react";

const schema = z.object({
  serviceId:    z.string().min(1, "اختر الخدمة"),
  fullName:     z.string().min(3, "الاسم مطلوب"),
  mobile:       z.string().min(8, "رقم الهاتف مطلوب"),
  governorateId: z.string().min(1, "اختر المحافظة"),
  areaId:       z.string().min(1, "اختر المنطقة"),
  address:      z.string().min(5, "العنوان مطلوب"),
  description:  z.string().min(10, "الوصف مطلوب"),
});

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/m4a", "audio/mp4"];

export default function CustomerNewRequest() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateRequest();

  const [images, setImages] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const imgRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: services = [] } = useListServices();
  const { data: governorates = [] } = useListGovernorates();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { serviceId: "", fullName: "", mobile: "", governorateId: "", areaId: "", address: "", description: "" },
  });

  const selectedGovId = form.watch("governorateId");
  const { data: areas = [] } = useListAreas({ governorateId: selectedGovId ? parseInt(selectedGovId) : undefined } as any);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => ACCEPTED_IMAGE_TYPES.includes(f.type));
    if (valid.length < files.length) toast({ title: "تحذير", description: "بعض الملفات لم تُقبل (JPG, PNG, WEBP فقط)", variant: "destructive" });
    const b64s = await Promise.all(valid.map(toBase64));
    setImages((prev) => [...prev, ...b64s].slice(0, 6));
    if (imgRef.current) imgRef.current.value = "";
  };

  const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_AUDIO_TYPES.includes(file.type) && !file.name.endsWith(".m4a")) {
      toast({ title: "صيغة غير مدعومة", description: "يُقبل MP3, WAV, M4A فقط", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "الملف كبير", description: "الحجم الأقصى 10 ميجابايت", variant: "destructive" });
      return;
    }
    const b64 = await toBase64(file);
    setAudioUrl(b64);
    setAudioName(file.name);
    if (audioRef.current) audioRef.current.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        stream.getTracks().forEach((t) => t.stop());
        try {
          const b64 = await blobToBase64(blob);
          setAudioUrl(b64);
          setAudioName("تسجيل صوتي مباشر");
        } catch {
          toast({ title: "خطأ في معالجة التسجيل", variant: "destructive" });
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      toast({ title: "تعذر الوصول للميكروفون", description: "تأكد من منح صلاحية الميكروفون", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const clearAudio = () => {
    setAudioUrl(null);
    setAudioName("");
    if (audioRef.current) audioRef.current.value = "";
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const onSubmit = (values: z.infer<typeof schema>) => {
    createMutation.mutate(
      {
        data: {
          serviceId: parseInt(values.serviceId),
          fullName: values.fullName,
          mobile: values.mobile,
          governorateId: parseInt(values.governorateId),
          areaId: parseInt(values.areaId),
          address: values.address,
          description: values.description,
          images,
          audioUrl: audioUrl || undefined,
        } as any
      },
      {
        onSuccess: (res: any) => {
          queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
          toast({ title: "تم إنشاء الطلب", description: "سيتقدم الفنيون بعروضهم قريباً" });
          navigate(`/customer/requests/${res.id}`);
        },
        onError: (err: any) => {
          toast({ title: "خطأ", description: err?.data?.error || "حدث خطأ", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">طلب خدمة جديد</h1>
        <p className="text-muted-foreground text-sm mt-1">أملأ البيانات وسنجد لك أفضل الفنيين</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Service */}
          <Card><CardContent className="pt-5 space-y-5">
            <FormField control={form.control} name="serviceId" render={({ field }) => (
              <FormItem>
                <FormLabel>نوع الخدمة <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger data-testid="select-service"><SelectValue placeholder="اختر الخدمة المطلوبة" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {(services as any[]).filter((s: any) => s.isActive).map((s: any) => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.nameAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم الكامل <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="اسمك" data-testid="input-fullname" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="mobile" render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الهاتف <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="01xxxxxxxxx" data-testid="input-mobile" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="governorateId" render={({ field }) => (
                <FormItem>
                  <FormLabel>المحافظة <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={(v) => { field.onChange(v); form.setValue("areaId", ""); }} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-governorate"><SelectValue placeholder="اختر" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(governorates as any[]).map((g: any) => <SelectItem key={g.id} value={g.id.toString()}>{g.nameAr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="areaId" render={({ field }) => (
                <FormItem>
                  <FormLabel>المنطقة <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedGovId}>
                    <FormControl><SelectTrigger data-testid="select-area"><SelectValue placeholder="اختر" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(areas as any[]).map((a: any) => <SelectItem key={a.id} value={a.id.toString()}>{a.nameAr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel>العنوان التفصيلي <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="الشارع، البناية، الدور..." data-testid="input-address" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>وصف المشكلة <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Textarea placeholder="صف المشكلة بالتفصيل لمساعدة الفنيين..." rows={4} data-testid="textarea-description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent></Card>

          {/* Images */}
          <Card><CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-sm">صور المشكلة</p>
                <p className="text-xs text-muted-foreground">حتى 6 صور (JPG, PNG, WEBP)</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => imgRef.current?.click()}>
                <ImagePlus className="w-4 h-4 ms-1" />
                إضافة صور
              </Button>
              <input ref={imgRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple className="hidden" onChange={handleImagesChange} />
            </div>
            {images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {images.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border group">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute top-1 left-1 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {images.length < 6 && (
                  <button
                    type="button"
                    onClick={() => imgRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/40 transition-colors"
                  >
                    <ImagePlus className="w-6 h-6 text-muted-foreground/40" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imgRef.current?.click()}
                className="w-full border-2 border-dashed border-muted-foreground/20 rounded-xl py-8 flex flex-col items-center gap-2 hover:border-primary/40 transition-colors"
              >
                <ImagePlus className="w-8 h-8 text-muted-foreground/30" />
                <span className="text-sm text-muted-foreground">اضغط لإضافة صور</span>
              </button>
            )}
          </CardContent></Card>

          {/* Audio */}
          <Card><CardContent className="pt-5">
            <div className="mb-3">
              <p className="font-semibold text-sm">تسجيل صوتي</p>
              <p className="text-xs text-muted-foreground">سجّل مباشرة أو ارفع ملفاً صوتياً</p>
            </div>

            {audioUrl ? (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                <Volume2 className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{audioName}</p>
                  <audio controls src={audioUrl} className="w-full mt-1 h-8" />
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={clearAudio}
                    className="text-destructive hover:text-destructive/80 p-1"
                    title="حذف التسجيل"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : isRecording ? (
              <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <Circle className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" />
                  <span className="text-sm font-mono font-bold text-red-600">{formatTime(recordingSeconds)}</span>
                </div>
                <span className="text-sm text-red-700 flex-1">جاري التسجيل...</span>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={stopRecording}
                  data-testid="button-stop-recording"
                >
                  <Square className="w-3 h-3 ms-1" />
                  إيقاف
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex-1 border-2 border-dashed border-red-200 rounded-xl py-5 flex flex-col items-center gap-2 hover:border-red-400 hover:bg-red-50 transition-colors"
                  data-testid="button-start-recording"
                >
                  <Mic className="w-7 h-7 text-red-400" />
                  <span className="text-sm text-muted-foreground">تسجيل مباشر</span>
                </button>
                <button
                  type="button"
                  onClick={() => audioRef.current?.click()}
                  className="flex-1 border-2 border-dashed border-muted-foreground/20 rounded-xl py-5 flex flex-col items-center gap-2 hover:border-primary/40 transition-colors"
                >
                  <Volume2 className="w-7 h-7 text-muted-foreground/40" />
                  <span className="text-sm text-muted-foreground">رفع ملف</span>
                </button>
                <input ref={audioRef} type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,.m4a,audio/m4a" className="hidden" onChange={handleAudioChange} />
              </div>
            )}
          </CardContent></Card>

          <Button type="submit" className="w-full font-bold py-5" disabled={createMutation.isPending} data-testid="button-submit">
            {createMutation.isPending ? "جاري الإرسال..." : "إرسال الطلب"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
