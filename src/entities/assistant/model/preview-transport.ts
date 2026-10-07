import type { AssistantChunk, AssistantRequest, AssistantTransport } from "./types";

type Intent = "summary" | "leads" | "revenue" | "followUp" | "fallback";

const KEYWORDS: Record<Exclude<Intent, "fallback">, RegExp> = {
  summary: /summar|today|brief|overview|ملخص|اليوم|موجز/i,
  leads: /lead|pipeline|attention|طلب|طلبات|خط المبيعات|متابعة/i,
  revenue: /revenue|target|sales|margin|إيراد|هدف|مبيعات|هامش/i,
  followUp: /draft|follow|message|whatsapp|write|مسودة|رسالة|اكتب|واتساب/i,
};

/** Sample replies shown until the assistant API is connected; clearly marked as preview. */
const REPLIES: Record<"en" | "ar", Record<Intent, string>> = {
  en: {
    summary:
      "### Today at a glance\nHere is how a daily briefing will look once the assistant is connected:\n- **Sales:** new leads, conversions and the busiest source\n- **Money:** collected today, open balances and overdue instalments\n- **Operations:** departures this week and bookings still missing documents\n\nI'll highlight what needs you first and link straight to it.",
    leads:
      "Once connected I'll rank open leads by urgency and value. A typical answer:\n1. **Leads waiting for a first reply** longer than the SLA\n2. **Hot leads** with a travel date in the next 30 days\n3. **Stalled leads** with no activity for a week\n\nEach item will open the lead so you can assign or follow up.",
    revenue:
      "I'll compare revenue with your active targets using the finance ledger:\n- Booked vs collected for the period\n- **Pace** against the target and the forecast at period end\n- Who is driving the result, and where the margin is thin\n\nAsk for any branch, agent or period.",
    followUp:
      "Here is the kind of draft I'll write, in the customer's language:\n\n\"Hello Ahmed, thank you for your interest in our **Ramadan Umrah** package. Seats for the 12 March departure are filling up — shall I hold two places for you while you decide?\"\n\nYou'll always review and edit before sending.",
    fallback:
      "I'm the WODI assistant. In this preview I can show you what I'll do once connected: summarise your day, point out leads and bookings that need attention, explain revenue against targets, and draft messages to customers. Try one of the suggestions to see an example.",
  },
  ar: {
    summary:
      "### اليوم في لمحة\nهكذا سيبدو الملخص اليومي بعد ربط المساعد:\n- **المبيعات:** الطلبات الجديدة والتحويلات والمصدر الأنشط\n- **المال:** المحصّل اليوم والأرصدة المفتوحة والأقساط المتأخرة\n- **العمليات:** مغادرات هذا الأسبوع والحجوزات التي تنقصها مستندات\n\nسأبرز ما يحتاج إليك أولًا مع رابط مباشر إليه.",
    leads:
      "بعد الربط سأرتب الطلبات المفتوحة حسب الأولوية والقيمة. مثال على الإجابة:\n1. **طلبات تنتظر الرد الأول** أطول من مستوى الخدمة\n2. **طلبات ساخنة** بتاريخ سفر خلال 30 يومًا\n3. **طلبات متوقفة** بلا نشاط منذ أسبوع\n\nكل عنصر يفتح الطلب لتسنده أو تتابعه.",
    revenue:
      "سأقارن الإيرادات بأهدافك النشطة اعتمادًا على دفتر المالية:\n- المحجوز مقابل المحصّل للفترة\n- **الوتيرة** مقابل الهدف والتوقع في نهاية الفترة\n- من يقود النتيجة وأين الهامش منخفض\n\nاسأل عن أي فرع أو موظف أو فترة.",
    followUp:
      "هذا نوع المسودة التي سأكتبها بلغة العميل:\n\n«مرحبًا أحمد، شكرًا لاهتمامك بباقة **عمرة رمضان**. المقاعد في مغادرة 12 مارس تمتلئ بسرعة، هل أحجز لك مقعدين ريثما تقرر؟»\n\nستراجع المسودة وتعدّلها دائمًا قبل الإرسال.",
    fallback:
      "أنا مساعد WODI. في هذه المعاينة أعرض لك ما سأفعله بعد الربط: تلخيص يومك، والإشارة إلى الطلبات والحجوزات التي تحتاج إلى متابعة، وشرح الإيرادات مقابل الأهداف، وكتابة رسائل للعملاء. جرّب أحد الاقتراحات لترى مثالًا.",
  },
};

export function previewIntent(prompt: string): Intent {
  for (const [intent, pattern] of Object.entries(KEYWORDS) as [Exclude<Intent, "fallback">, RegExp][]) {
    if (pattern.test(prompt)) return intent;
  }
  return "fallback";
}

export function previewReply(request: AssistantRequest): string {
  const last = [...request.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  return REPLIES[request.context.locale][previewIntent(last)];
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(timer), reject(signal.reason)), { once: true });
  });

/** Streams the sample reply word by word, so the UI behaves exactly as with the live API. */
export function createPreviewTransport({ firstTokenMs = 650, tokenMs = 22 } = {}): AssistantTransport {
  return {
    mode: "preview",
    async *stream(request, signal): AsyncIterable<AssistantChunk> {
      await sleep(firstTokenMs, signal);
      for (const piece of previewReply(request).match(/\S+\s*|\s+/g) ?? []) {
        yield { type: "delta", text: piece };
        if (tokenMs > 0) await sleep(tokenMs, signal);
      }
      yield { type: "done" };
    },
  };
}
