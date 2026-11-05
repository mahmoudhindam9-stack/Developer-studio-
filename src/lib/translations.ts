export type Language = "ar" | "en";

export type ThemeId =
  | "pearl-4k" // Light 1
  | "crystal-blue" // Light 2
  | "warm-ivory" // Light 3
  | "modern-violet" // Light 4
  | "obsidian-4k"; // Dark 1

export interface ThemeOption {
  id: ThemeId;
  type: "light" | "dark";
  nameAr: string;
  nameEn: string;
  colorHex: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "pearl-4k",
    type: "light",
    nameAr: "فاتح 1: اللؤلؤي والزمردي",
    nameEn: "Light 1: Pearl Emerald",
    colorHex: "#047857",
  },
  {
    id: "crystal-blue",
    type: "light",
    nameAr: "فاتح 2: الكريستال السفير",
    nameEn: "Light 2: Sapphire Crystal",
    colorHex: "#1d4ed8",
  },
  {
    id: "warm-ivory",
    type: "light",
    nameAr: "فاتح 3: العاج الدافئ",
    nameEn: "Light 3: Warm Ivory",
    colorHex: "#0f766e",
  },
  {
    id: "modern-violet",
    type: "light",
    nameAr: "فاتح 4: البنفسجي العصري",
    nameEn: "Light 4: Modern Violet",
    colorHex: "#6d28d9",
  },
  {
    id: "obsidian-4k",
    type: "dark",
    nameAr: "غامق: أوبسيديان الليلي",
    nameEn: "Dark: Obsidian OLED",
    colorHex: "#10b981",
  },
];

export const translations = {
  ar: {
    // Navigation & Pages
    appName: "Developer Studio Pro",
    pageHome: "الرئيسية",
    pageImport: "استيراد مشروع جديد",
    pageAgents: "مركز وكلاء الذكاء الاصطناعي",
    pageWorkspace: "محرر ملفات المشروع",
    pageVisual: "المحرر المرئي المستقل",
    pageGitHub: "مستودعات GitHub",
    
    // Header Actions
    back: "رجوع",
    language: "اللغة",
    arabic: "العربية",
    english: "English",
    theme: "النمط",
    activeAgentsCount: "الوكلاء النشطون",
    
    // Home View
    importNewProject: "استيراد مشروع جديد",
    aiAgentsHub: "وكلاء الذكاء الاصطناعي",
    activeBadge: "نشط",
    openActiveProject: "فتح المشروع الحالي",
    
    // Import View
    chooseSourceTitle: "استيراد مشروع جديد",
    localSource: "Local (من الكمبيوتر)",
    githubSource: "GitHub (المستودعات)",
    zipOrFiles: "ملف مضغوط (ZIP) أو ملفات",
    uncompressedFolder: "مجلد مشروع غير مضغوط",
    dragDropHint: "سحب وإفلات المشروع هنا",
    loginWithGitHub: "تسجيل الدخول عبر GitHub",
    refreshRepos: "تحديث",
    logout: "خروج",
    searchReposPlaceholder: "بحث في المستودعات...",
    filterAll: "الكل",
    filterPublic: "عام",
    filterPrivate: "خاص",
    noReposFound: "لا توجد مستودعات",
    importRepoBtn: "استيراد",
    connecting: "جارٍ الاتصال...",
    
    // Workspace & Editor
    projectFiles: "ملفات المشروع",
    searchFilesPlaceholder: "بحث في الملفات...",
    saveFile: "حفظ الملف",
    newFile: "ملف جديد",
    saveProject: "حفظ المشروع",
    saveLocalZip: "حفظ محلي (ZIP)",
    exportGitHub: "تصدير إلى GitHub",
    visualEditorBtn: "المحرر المرئي",
    logsTerminal: "السجل",
    ready: "جاهز",
    working: "جارٍ العمل...",
    saved: "محفوظ",
    unsaved: "غير محفوظ",
    deleteFile: "حذف الملف",
    noFileSelected: "اختر ملفاً من القائمة لعرضه وتعديله",
    
    // AI Agents Hub
    addAgent: "إضافة وكيل",
    agentName: "اسم الوكيل",
    agentEndpoint: "IP / Endpoint (http://...)",
    apiKey: "API Key (اختياري)",
    agentModel: "الموديل (اختياري)",
    agentRole: "الدور (اختياري)",
    agentActive: "نشط",
    agentInactive: "متوقف",
    saveAgent: "حفظ الوكيل",
    cancel: "إلغاء",
    editAgent: "تعديل",
    deleteAgent: "حذف",
    runActiveAgentsConcurrently: "تشغيل النشطين معاً",
    runAgentsPromptPlaceholder: "أمر التشغيل المتزامن لجميع الوكلاء النشطين...",
    noAgentsYet: "لا يوجد وكلاء مضافون حالياً",
    
    // Save & Export Modal
    saveProjectTitle: "حفظ وتصدير المشروع",
    exportToGitHubTitle: "تصدير إلى GitHub",
    sameRepoOption: "نفس المستودع",
    existingRepoOption: "مستودع موجود",
    newRepoOption: "مستودع جديد",
    newRepoNameLabel: "اسم المستودع الجديد",
    privacyLabel: "الخصوصية",
    branchLabel: "الفرع (Branch)",
    commitMessageLabel: "رسالة التحديث (Commit)",
    publishToGitHubBtn: "نشر على GitHub",
    publishing: "جارٍ النشر...",
    close: "إغلاق",
    
    // Visual Editor Studio
    visualCanvasTitle: "مساحة العمل المرئية",
    elementTree: "شجرة العناصر",
    propertiesPanel: "خصائص العنصر",
    designAndAssets: "التصميم والوسائط",
    advancedTools: "الأدوات المتقدمة",
    historyRollback: "سجل التغييرات",
    publishAndSaveBar: "شريط الحفظ والتطبيق",
    discardChanges: "تجاهل التعديلات",
    saveDraft: "حفظ المسودة",
    previewMode: "معاينة الصفحة",
    editMode: "نمط التعديل",
    addSection: "إضافة قسم",
    
    // Confirmations
    confirmTitle: "تأكيد الإجراء",
    confirmActionBtn: "تأكيد",
  },
  en: {
    // Navigation & Pages
    appName: "Developer Studio Pro",
    pageHome: "Home",
    pageImport: "Import New Project",
    pageAgents: "AI Agents Hub",
    pageWorkspace: "Project Code Workspace",
    pageVisual: "Visual Studio Editor",
    pageGitHub: "GitHub Repositories",
    
    // Header Actions
    back: "Back",
    language: "Language",
    arabic: "العربية",
    english: "English",
    theme: "Theme",
    activeAgentsCount: "Active Agents",
    
    // Home View
    importNewProject: "Import New Project",
    aiAgentsHub: "AI Agents Hub",
    activeBadge: "Active",
    openActiveProject: "Open Active Project",
    
    // Import View
    chooseSourceTitle: "Import New Project",
    localSource: "Local (Computer)",
    githubSource: "GitHub (Repositories)",
    zipOrFiles: "ZIP Archive or Files",
    uncompressedFolder: "Uncompressed Folder",
    dragDropHint: "Drag and drop project here",
    loginWithGitHub: "Sign in with GitHub",
    refreshRepos: "Refresh",
    logout: "Log out",
    searchReposPlaceholder: "Search repositories...",
    filterAll: "All",
    filterPublic: "Public",
    filterPrivate: "Private",
    noReposFound: "No repositories found",
    importRepoBtn: "Import",
    connecting: "Connecting...",
    
    // Workspace & Editor
    projectFiles: "Project Files",
    searchFilesPlaceholder: "Search files...",
    saveFile: "Save File",
    newFile: "New File",
    saveProject: "Save Project",
    saveLocalZip: "Save Local (ZIP)",
    exportGitHub: "Export to GitHub",
    visualEditorBtn: "Visual Studio",
    logsTerminal: "Terminal Logs",
    ready: "Ready",
    working: "Working...",
    saved: "Saved",
    unsaved: "Unsaved",
    deleteFile: "Delete File",
    noFileSelected: "Select a file from the sidebar to view & edit",
    
    // AI Agents Hub
    addAgent: "Add Agent",
    agentName: "Agent Name",
    agentEndpoint: "IP / Endpoint (http://...)",
    apiKey: "API Key (Optional)",
    agentModel: "Model (Optional)",
    agentRole: "Role (Optional)",
    agentActive: "Active",
    agentInactive: "Disabled",
    saveAgent: "Save Agent",
    cancel: "Cancel",
    editAgent: "Edit",
    deleteAgent: "Delete",
    runActiveAgentsConcurrently: "Run Active Agents",
    runAgentsPromptPlaceholder: "Prompt for parallel execution across all active agents...",
    noAgentsYet: "No AI agents configured yet",
    
    // Save & Export Modal
    saveProjectTitle: "Save & Export Project",
    exportToGitHubTitle: "Export to GitHub",
    sameRepoOption: "Same Repo",
    existingRepoOption: "Existing Repo",
    newRepoOption: "New Repo",
    newRepoNameLabel: "New Repository Name",
    privacyLabel: "Privacy",
    branchLabel: "Branch",
    commitMessageLabel: "Commit Message",
    publishToGitHubBtn: "Publish to GitHub",
    publishing: "Publishing...",
    close: "Close",
    
    // Visual Editor Studio
    visualCanvasTitle: "Visual Workspace",
    elementTree: "Element Tree",
    propertiesPanel: "Properties Panel",
    designAndAssets: "Design & Assets",
    advancedTools: "Advanced Tools",
    historyRollback: "History Rollback",
    publishAndSaveBar: "Publish Bar",
    discardChanges: "Discard Changes",
    saveDraft: "Save Draft",
    previewMode: "Preview Mode",
    editMode: "Edit Mode",
    addSection: "Add Section",
    
    // Confirmations
    confirmTitle: "Confirm Action",
    confirmActionBtn: "Confirm",
  },
};
