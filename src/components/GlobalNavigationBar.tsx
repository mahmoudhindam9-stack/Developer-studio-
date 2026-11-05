import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Code2,
  Globe,
  HardDrive,
  Github,
  Palette,
  Check,
  ChevronDown,
} from "lucide-react";
import {
  type Language,
  type ThemeId,
  THEME_OPTIONS,
  translations,
} from "../lib/translations";

interface GlobalNavigationBarProps {
  currentView: "home" | "import" | "agents" | "workspace" | "visual";
  pageTitle: string;
  canGoBack: boolean;
  onGoBack: () => void;
  lang: Language;
  onLanguageChange: (newLang: Language) => void;
  currentTheme: ThemeId;
  onThemeChange: (newTheme: ThemeId) => void;
  activeAgentsCount: number;
  activeProjectName?: string;
  activeProjectSource?: "local" | "github";
  onOpenAgentsModal?: () => void;
}

export function GlobalNavigationBar({
  currentView,
  pageTitle,
  canGoBack,
  onGoBack,
  lang,
  onLanguageChange,
  currentTheme,
  onThemeChange,
  activeAgentsCount,
  activeProjectName,
  activeProjectSource,
  onOpenAgentsModal,
}: GlobalNavigationBarProps) {
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const t = translations[lang];
  const isRtl = lang === "ar";

  const selectedThemeObj =
    THEME_OPTIONS.find((tm) => tm.id === currentTheme) || THEME_OPTIONS[0];

  return (
    <header
      className="sticky top-0 z-50 flex h-13 w-full shrink-0 items-center justify-between border-b bg-card/95 px-4 shadow-sm backdrop-blur-md transition-colors"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Left / Start Section: Brand + Back Button + Current Page Title */}
      <div className="flex items-center gap-3">
        {canGoBack && currentView !== "home" && (
          <button
            onClick={onGoBack}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-emerald-500/50 hover:bg-slate-700/80 active:scale-95"
            title={t.back}
          >
            {isRtl ? <ArrowRight size={15} /> : <ArrowLeft size={15} />}
            <span>{t.back}</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-950/20">
            <Code2 size={18} />
          </div>
          <span className="hidden font-extrabold text-foreground sm:inline text-sm">
            {t.appName}
          </span>
        </div>

        {/* Current Page Title Badge */}
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-bold text-xs text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{pageTitle}</span>
        </div>

        {/* Active Open Project Badge */}
        {activeProjectName && (
          <div className="hidden md:flex items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-300">
            {activeProjectSource === "github" ? (
              <Github size={13} className="text-emerald-400" />
            ) : (
              <HardDrive size={13} className="text-emerald-400" />
            )}
            <span className="font-mono truncate max-w-[140px]">
              {activeProjectName}
            </span>
          </div>
        )}
      </div>

      {/* Right / End Section: Active AI Agents Badge + Language Switcher + Theme Switcher */}
      <div className="flex items-center gap-2">
        {/* Active AI Agents Counter */}
        {onOpenAgentsModal && (
          <button
            onClick={onOpenAgentsModal}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-2.5 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-900/40"
            title={t.activeAgentsCount}
          >
            <Bot size={15} className="text-emerald-400" />
            <span className="hidden sm:inline">{t.activeAgentsCount}:</span>
            <span className="rounded-lg bg-emerald-500/20 px-1.5 py-0.2 font-mono font-extrabold text-emerald-300">
              {activeAgentsCount}
            </span>
          </button>
        )}

        {/* Theme Switcher Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowThemeMenu((v) => !v);
              setShowLangMenu(false);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700/70 bg-slate-900/60 px-2.5 py-1.5 text-xs font-bold text-foreground transition hover:border-emerald-500/50 hover:bg-slate-800"
            title={t.theme}
          >
            <Palette size={15} style={{ color: selectedThemeObj.colorHex }} />
            <span className="hidden md:inline">
              {isRtl ? selectedThemeObj.nameAr : selectedThemeObj.nameEn}
            </span>
            <ChevronDown size={13} className="text-slate-400" />
          </button>

          {showThemeMenu && (
            <div
              className={`absolute top-full mt-2 w-56 rounded-2xl border border-slate-700 bg-card/98 p-1.5 shadow-2xl backdrop-blur-xl z-50 ${
                isRtl ? "left-0" : "right-0"
              }`}
            >
              <div className="px-2 py-1 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                {t.theme}
              </div>
              <div className="space-y-1">
                {THEME_OPTIONS.map((theme) => {
                  const selected = theme.id === currentTheme;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => {
                        onThemeChange(theme.id);
                        setShowThemeMenu(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
                        selected
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-slate-600"
                          style={{ backgroundColor: theme.colorHex }}
                        />
                        <span>{isRtl ? theme.nameAr : theme.nameEn}</span>
                      </div>
                      {selected && <Check size={14} className="text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Language Switcher Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowLangMenu((v) => !v);
              setShowThemeMenu(false);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700/70 bg-slate-900/60 px-2.5 py-1.5 text-xs font-bold text-foreground transition hover:border-emerald-500/50 hover:bg-slate-800"
            title={t.language}
          >
            <Globe size={15} className="text-emerald-400" />
            <span>{lang === "ar" ? "العربية" : "English"}</span>
            <ChevronDown size={13} className="text-slate-400" />
          </button>

          {showLangMenu && (
            <div
              className={`absolute top-full mt-2 w-36 rounded-2xl border border-slate-700 bg-card/98 p-1.5 shadow-2xl backdrop-blur-xl z-50 ${
                isRtl ? "left-0" : "right-0"
              }`}
            >
              <button
                onClick={() => {
                  onLanguageChange("ar");
                  setShowLangMenu(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  lang === "ar"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <span>العربية</span>
                {lang === "ar" && <Check size={14} className="text-emerald-400" />}
              </button>
              <button
                onClick={() => {
                  onLanguageChange("en");
                  setShowLangMenu(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  lang === "en"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <span>English</span>
                {lang === "en" && <Check size={14} className="text-emerald-400" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
