import React from 'react';
import { Database, X, Save, CheckCircle, Trash2, ChevronRight } from 'lucide-react';

export default function ProjectVault({
  t,
  showProjectPanel,
  setShowProjectPanel,
  projectName,
  setProjectName,
  saveProject,
  dbLoading,
  runs,
  projectId,
  industry,
  loadProjectList,
  projectList,
  loadProjectDetail,
  deleteProject,
  compareIds,
  toggleCompare,
  setCurrentTab
}) {
  if (!showProjectPanel) return null;

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) setShowProjectPanel(false);
      }}
      className="fixed inset-0 bg-black/45 z-50 flex items-start justify-end"
    >
      <div
        className="h-full bg-theme-card shadow-2xl flex flex-col w-[min(420px,100vw)] border-l border-theme"
      >
        {/* 패널 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-theme flex-shrink-0">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-[--color-primary]" />
            <span className="font-bold text-theme-main text-base">{t('projectList')}</span>
          </div>
          <button
            onClick={() => setShowProjectPanel(false)}
            className="text-theme-muted hover:text-theme-main p-1 rounded-lg hover:bg-theme-inset transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* 새 프로젝트 저장 섹션 */}
        <div className="p-4 border-b border-theme flex-shrink-0">
          <p className="text-xs text-theme-muted mb-2 font-medium">{t('auth.saveCurrentWork') || '현재 작업을 DB에 저장'}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder={`${industry} ${new Date().toLocaleDateString()}`}
              className="flex-1 px-3 py-2 text-sm border border-theme rounded-lg bg-theme-inset text-theme-main focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={saveProject}
              disabled={dbLoading || runs.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-[--color-primary] text-white rounded-lg text-sm font-bold hover:bg-blue-800 transition disabled:opacity-50 flex-shrink-0"
            >
              <Save size={14} />
              {dbLoading ? '...' : projectId ? t('dbUpdate') : t('dbSave')}
            </button>
          </div>
        </div>

        {/* 프로젝트 목록 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-theme-muted">{t('auth.savedProjects') || '저장된 프로젝트'}</p>
            <button
              onClick={loadProjectList}
              disabled={dbLoading}
              className="text-xs text-[--color-primary] hover:underline disabled:opacity-50"
            >
              {dbLoading ? '...' : 'Refresh'}
            </button>
          </div>

          <div className="space-y-2">
            {projectList.map(proj => {
              const isActive = proj.id === projectId;
              const updatedAt = new Date(proj.updated_at);
              return (
                <div
                  key={proj.id}
                  className={`p-3 rounded-xl border transition flex items-center gap-3 ${
                    isActive
                      ? 'border-[--color-primary] bg-blue-50 dark:bg-blue-900/20'
                      : 'border-theme bg-theme-card hover:bg-theme-inset'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={compareIds.includes(proj.id)}
                    onChange={() => toggleCompare(proj.id)}
                    className="w-4 h-4 rounded border-theme text-[--color-primary] focus:ring-[--color-primary]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-theme-main truncate">{proj.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-theme-muted mt-0.5">
                      <span>{proj.industry}</span>
                      <span>·</span>
                      <span>{updatedAt.toLocaleDateString()}</span>
                    </div>
                  </div>

                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => loadProjectDetail(proj.id)}
                        disabled={dbLoading}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        <ChevronRight size={12} /> {t('auth.load') || 'Load'}
                      </button>
                      <button
                        onClick={() => deleteProject(proj.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
            })}
          </div>
        </div>
        
        {/* 비교하기 버튼 */}
        <div className="p-4 border-t border-theme bg-theme-inset flex-shrink-0">
          <button
            onClick={() => {
              setShowProjectPanel(false);
              setCurrentTab(7); // 비교 탭으로 이동
            }}
            disabled={compareIds.length < 2}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition disabled:opacity-30 flex items-center justify-center gap-2"
          >
            {t('auth.compareSelected') || '선택한 프로젝트 비교'} ({compareIds.length})
          </button>
        </div>
      </div>
    </div>
  );
}
