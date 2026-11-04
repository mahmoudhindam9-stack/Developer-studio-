import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowLeftRight, Calculator, GitBranch, Plus, Trash2, Workflow } from "lucide-react";
import { ElementModel, ElementType, getElementDisplayName } from "../models/studio.types";
import { evaluateArithmeticExpression, formatArithmeticResult } from "../utils/arithmetic";

type FlowNodeKind = "trigger" | "action" | "condition" | "formula" | "result";
type FlowAction = "message" | "navigate" | "external" | "formula" | "toggle" | "submit" | "none";

interface FlowNode {
  id: string;
  kind: FlowNodeKind;
  label: string;
  action?: FlowAction;
  formula?: string;
  condition?: string;
  url?: string;
  message?: string;
  targetElementId?: string;
}
interface FlowConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
}
interface WorkflowDefinition {
  version: 1;
  nodes: FlowNode[];
  connections: FlowConnection[];
}

interface WorkflowEditorPanelProps {
  element: ElementModel | null;
  elements: Record<string, ElementModel>;
  onUpdateElement: (elementId: string, updates: Partial<ElementModel>) => void;
  onAddButton: () => void;
}

const NODE_LABELS: Record<FlowNodeKind, string> = {
  trigger: "بداية المسار",
  action: "تنفيذ إجراء",
  condition: "اتخاذ قرار",
  formula: "حساب معادلة",
  result: "النتيجة النهائية",
};
const ACTION_LABELS: Record<FlowAction, string> = {
  message: "إظهار رسالة",
  navigate: "الانتقال إلى صفحة",
  external: "فتح موقع خارجي",
  formula: "عرض نتيجة حساب",
  toggle: "إظهار أو إخفاء عنصر",
  submit: "إرسال نموذج",
  none: "متابعة دون إجراء",
};

function createDefaultWorkflow(element: ElementModel): WorkflowDefinition {
  const label = String(
    element.content?.label || element.content?.title || element.content?.text || "عند الضغط على العنصر",
  );
  return {
    version: 1,
    nodes: [
      { id: "start", kind: "trigger", label },
      { id: "step", kind: "action", label: "تنفيذ الإجراء المحدد", action: "message", message: "تم تنفيذ الإجراء." },
      { id: "finish", kind: "result", label: "تم إكمال العملية" },
    ],
    connections: [
      { id: "link-start-step", from: "start", to: "step", label: "عند الضغط" },
      { id: "link-step-finish", from: "step", to: "finish", label: "ثم" },
    ],
  };
}

function readWorkflow(element: ElementModel): WorkflowDefinition {
  const value = element.attributes?.studioWorkflow as Partial<WorkflowDefinition> | undefined;
  if (!value || !Array.isArray(value.nodes) || !value.nodes.length || !Array.isArray(value.connections)) {
    return createDefaultWorkflow(element);
  }
  const ids = new Set(value.nodes.map((node) => node?.id).filter(Boolean));
  const nodes = value.nodes.filter((node): node is FlowNode =>
    !!node && typeof node.id === "string" && !!node.id &&
    ["trigger", "action", "condition", "formula", "result"].includes(node.kind) &&
    typeof node.label === "string",
  );
  if (!nodes.length) return createDefaultWorkflow(element);
  const connections = value.connections.filter((link): link is FlowConnection =>
    !!link && typeof link.id === "string" && ids.has(link.from) && ids.has(link.to) && link.from !== link.to,
  );
  return { version: 1, nodes, connections };
}

function newId(prefix: string) {
  return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
}

export function WorkflowEditorPanel({ element, elements, onUpdateElement, onAddButton }: WorkflowEditorPanelProps) {
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");
  const [newConnectionLabel, setNewConnectionLabel] = useState("");

  const workflow = useMemo(() => element ? readWorkflow(element) : null, [element]);
  const persist = (next: WorkflowDefinition) => {
    if (!element) return;
    onUpdateElement(element.id, {
      attributes: {
        ...(element.attributes || {}),
        studioWorkflow: next,
      },
    });
  };

  if (!element || !workflow) {
    return (
      <div className="flex-1 min-w-0 h-full overflow-auto p-6 flex items-center justify-center bg-muted/20">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Workflow size={26} />
          </div>
          <h2 className="text-lg font-black mb-2">ابدأ تصميم مسار عمل</h2>
          <p className="text-sm leading-6 text-muted-foreground mb-4">
            اختر زرًا أو بطاقة من شجرة العناصر، أو أنشئ زرًا جديدًا. بعد ذلك أضف خطوات المسار واربطها حتى تصل إلى النتيجة النهائية.
          </p>
          <button type="button" onClick={onAddButton} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">
            <Plus size={16} /> إنشاء زر بداية
          </button>
        </div>
      </div>
    );
  }

  const updateNode = (nodeId: string, patch: Partial<FlowNode>) => {
    persist({ ...workflow, nodes: workflow.nodes.map((node) => node.id === nodeId ? { ...node, ...patch } : node) });
  };
  const addNode = (kind: FlowNodeKind) => {
    const id = newId("step");
    const defaults: Record<FlowNodeKind, Partial<FlowNode>> = {
      trigger: { label: "بداية جديدة" },
      action: { label: "إجراء جديد", action: "message", message: "اكتب الرسالة هنا." },
      condition: { label: "فحص شرط", condition: "مثال: 10 > 5" },
      formula: { label: "حساب قيمة", formula: "(120 + 30) * 1.14" },
      result: { label: "النتيجة النهائية" },
    };
    const node: FlowNode = { id, kind, label: defaults[kind].label || NODE_LABELS[kind], ...defaults[kind] };
    const previous = workflow.nodes[workflow.nodes.length - 1];
    const connections = previous
      ? [...workflow.connections, { id: newId("link"), from: previous.id, to: id, label: "ثم" }]
      : workflow.connections;
    persist({ ...workflow, nodes: [...workflow.nodes, node], connections });
  };
  const deleteNode = (nodeId: string) => {
    const nodes = workflow.nodes.filter((node) => node.id !== nodeId);
    const connections = workflow.connections.filter((link) => link.from !== nodeId && link.to !== nodeId);
    persist({ ...workflow, nodes, connections });
  };
  const updateConnection = (id: string, patch: Partial<FlowConnection>) => {
    persist({ ...workflow, connections: workflow.connections.map((link) => link.id === id ? { ...link, ...patch } : link) });
  };
  const removeConnection = (id: string) => {
    persist({ ...workflow, connections: workflow.connections.filter((link) => link.id !== id) });
  };
  const validFrom = workflow.nodes.some((node) => node.id === newFrom) ? newFrom : workflow.nodes[0]?.id || "";
  const validTo = workflow.nodes.some((node) => node.id === newTo) && newTo !== validFrom
    ? newTo
    : workflow.nodes.find((node) => node.id !== validFrom)?.id || "";
  const addConnection = () => {
    if (!validFrom || !validTo || validFrom === validTo) return;
    if (workflow.connections.some((link) => link.from === validFrom && link.to === validTo)) return;
    persist({
      ...workflow,
      connections: [...workflow.connections, {
        id: newId("link"),
        from: validFrom,
        to: validTo,
        label: newConnectionLabel.trim() || "انتقال",
      }],
    });
    setNewConnectionLabel("");
  };

  return (
    <div className="flex-1 min-w-0 h-full overflow-auto bg-muted/20 p-3 sm:p-5 text-right">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <GitBranch size={18} className="text-primary shrink-0" />
                <h2 className="text-base font-black">مسار العمل للعنصر المحدد</h2>
              </div>
              <p className="text-xs text-muted-foreground leading-5">
                نقطة البداية: <strong className="text-foreground">{getElementDisplayName(element)}</strong>.
                تُحفظ خطوات هذا المسار ضمن المسودة الحالية دون تغيير التطبيق المنشور.
              </p>
            </div>
            <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary shrink-0">
              {workflow.nodes.length} خطوات
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["action", "condition", "formula", "result"] as FlowNodeKind[]).map((kind) => (
              <button key={kind} type="button" onClick={() => addNode(kind)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold hover:border-primary/50 hover:bg-primary/5">
                {kind === "formula" ? <Calculator size={14} /> : <Plus size={14} />}
                إضافة {NODE_LABELS[kind]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-0">
          {workflow.nodes.map((node, index) => {
            let formulaPreview = "";
            let formulaError = "";
            if (node.kind === "formula" && node.formula) {
              try {
                formulaPreview = formatArithmeticResult(evaluateArithmeticExpression(node.formula));
              } catch (error) {
                formulaError = error instanceof Error ? error.message : "تعذر حساب المعادلة.";
              }
            }
            return (
              <React.Fragment key={node.id}>
                <div className={`rounded-2xl border bg-card p-4 shadow-sm ${node.kind === "trigger" ? "border-primary/50" : node.kind === "result" ? "border-emerald-500/40" : "border-border"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-black">{index + 1}</span>
                    <span className="text-xs font-black">{NODE_LABELS[node.kind]}</span>
                    <div className="flex-1" />
                    {node.kind !== "trigger" && (
                      <button type="button" onClick={() => deleteNode(node.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="حذف الخطوة">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <label className="mb-1 block text-xs font-bold">اسم الخطوة</label>
                  <input value={node.label} onChange={(event) => updateNode(node.id, { label: event.target.value })} className="mb-3 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
                  {node.kind === "action" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-bold">نوع الإجراء</label>
                        <select value={node.action || "message"} onChange={(event) => updateNode(node.id, { action: event.target.value as FlowAction })} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs">
                          {(["message", "navigate", "external", "formula", "toggle", "submit", "none"] as FlowAction[]).map((action) => <option key={action} value={action}>{ACTION_LABELS[action]}</option>)}
                        </select>
                      </div>
                      {["navigate", "external"].includes(node.action || "") && (
                        <div>
                          <label className="mb-1 block text-xs font-bold">وجهة الربط</label>
                          <input value={node.url || ""} onChange={(event) => updateNode(node.id, { url: event.target.value })} placeholder="/admin/menu أو https://..." className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs" />
                        </div>
                      )}
                      {node.action === "message" && (
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-bold">الرسالة</label>
                          <textarea value={node.message || ""} onChange={(event) => updateNode(node.id, { message: event.target.value })} rows={2} className="w-full rounded-lg border border-border bg-background p-2 text-xs" />
                        </div>
                      )}
                      {node.action === "formula" && (
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-bold">المعادلة</label>
                          <input value={node.formula || ""} onChange={(event) => updateNode(node.id, { formula: event.target.value })} placeholder="مثال: 250 * 1.14" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs" />
                        </div>
                      )}
                    </div>
                  )}
                  {node.kind === "condition" && (
                    <div>
                      <label className="mb-1 block text-xs font-bold">وصف الشرط</label>
                      <input value={node.condition || ""} onChange={(event) => updateNode(node.id, { condition: event.target.value })} placeholder="مثال: إذا كانت الكمية أكبر من 0" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs" />
                      <p className="mt-1 text-[10px] text-muted-foreground">استخدم الروابط بالأسفل لتحديد المسار الذي يتبع كل نتيجة.</p>
                    </div>
                  )}
                  {node.kind === "formula" && (
                    <div className="space-y-2">
                      <label className="mb-1 block text-xs font-bold">المعادلة الحسابية</label>
                      <input value={node.formula || ""} onChange={(event) => updateNode(node.id, { formula: event.target.value })} placeholder="مثال: (120 + 30) * 1.14" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-left text-sm" dir="ltr" />
                      {formulaPreview && <p className="rounded-lg bg-emerald-500/10 p-2 text-xs font-bold text-emerald-700">نتيجة المعاينة: {formulaPreview}</p>}
                      {formulaError && <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{formulaError}</p>}
                      <p className="text-[10px] text-muted-foreground">يدعم الأرقام والأقواس والجمع والطرح والضرب والقسمة، دون كتابة أكواد.</p>
                    </div>
                  )}
                </div>
                {index < workflow.nodes.length - 1 && (
                  <div className="flex flex-col items-center py-2 text-primary">
                    <ArrowDown size={18} />
                    <span className="text-[10px] text-muted-foreground">انتقل إلى الخطوة التالية — عدّل الروابط أسفل المسار</span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ArrowLeftRight size={17} className="text-primary" />
            <h3 className="font-black text-sm">خيارات الربط الحالية</h3>
            <span className="text-[10px] text-muted-foreground">يمكنك تعديلها أو إنشاء ربط جديد</span>
          </div>
          {workflow.connections.length === 0 && <p className="mb-3 text-xs text-muted-foreground">لا توجد روابط بعد. أضف رابطًا لتحديد اتجاه الانتقال بين الخطوات.</p>}
          <div className="space-y-2">
            {workflow.connections.map((connection) => (
              <div key={connection.id} className="grid grid-cols-1 gap-2 rounded-xl border border-border/70 p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <select value={connection.from} onChange={(event) => updateConnection(connection.id, { from: event.target.value })} className="h-9 min-w-0 rounded-lg border border-border bg-background px-2 text-xs">
                  {workflow.nodes.map((node) => <option key={node.id} value={node.id}>{node.label || NODE_LABELS[node.kind]}</option>)}
                </select>
                <span className="text-center text-xs font-bold text-primary">يتجه إلى</span>
                <div className="flex min-w-0 gap-2">
                  <select value={connection.to} onChange={(event) => updateConnection(connection.id, { to: event.target.value })} className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-xs">
                    {workflow.nodes.filter((node) => node.id !== connection.from).map((node) => <option key={node.id} value={node.id}>{node.label || NODE_LABELS[node.kind]}</option>)}
                  </select>
                  <button type="button" onClick={() => removeConnection(connection.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="حذف الربط"><Trash2 size={14} /></button>
                </div>
                <input value={connection.label || ""} onChange={(event) => updateConnection(connection.id, { label: event.target.value })} placeholder="اسم الانتقال (اختياري)" className="h-8 rounded-lg border border-border bg-background px-2 text-xs sm:col-span-3" />
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-2 rounded-xl bg-muted/40 p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <select value={validFrom} onChange={(event) => setNewFrom(event.target.value)} className="h-9 min-w-0 rounded-lg border border-border bg-background px-2 text-xs">
              {workflow.nodes.map((node) => <option key={node.id} value={node.id}>{node.label || NODE_LABELS[node.kind]}</option>)}
            </select>
            <span className="text-center text-xs text-muted-foreground">يتجه إلى</span>
            <select value={validTo} onChange={(event) => setNewTo(event.target.value)} className="h-9 min-w-0 rounded-lg border border-border bg-background px-2 text-xs">
              {workflow.nodes.filter((node) => node.id !== validFrom).map((node) => <option key={node.id} value={node.id}>{node.label || NODE_LABELS[node.kind]}</option>)}
            </select>
            <input value={newConnectionLabel} onChange={(event) => setNewConnectionLabel(event.target.value)} placeholder="اسم الانتقال، مثل: نعم أو لا" className="h-9 rounded-lg border border-border bg-background px-3 text-xs sm:col-span-2" />
            <button type="button" onClick={addConnection} disabled={!validFrom || !validTo || validFrom === validTo || workflow.connections.some((link) => link.from === validFrom && link.to === validTo)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-40">
              <Plus size={14} /> إضافة ربط
            </button>
          </div>
          <p className="mt-3 text-[10px] leading-5 text-muted-foreground">كل التعديلات تُحفظ ضمن مسودة العنصر، ثم تُستخدم خطوة «حفظ ومزامنة» الحالية لتأكيدها على الخادم. التعديلات لا تنشر إلى المستخدمين قبل النشر المعتاد.</p>
        </section>
      </div>
    </div>
  );
}
