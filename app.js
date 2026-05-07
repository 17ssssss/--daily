const STORAGE_KEY = "yuanbenDailyReportDraft.v1";
const MAX_PHOTOS = 9;
const DEFAULT_COMPANY = "新熙华";

const fieldIds = [
  "companyName",
  "projectName",
  "reportDate",
  "manager",
  "weather",
  "people",
  "stage",
  "status",
  "workfaceStatus",
  "materialStatus",
  "safetyStatus",
  "plannedPeriod",
  "totalProgress",
  "phaseGoal",
  "phasePlanEnd",
  "scheduleCompare",
  "phaseProgress",
  "weeklyProgress",
  "weeklyFocus",
  "scheduleNote",
  "tomorrowFocus",
  "summary",
  "confirmItem",
  "confirmDeadline",
  "confirmImpact",
  "riskProblem",
  "riskImpact",
  "riskSolution",
  "riskOwner",
  "riskDate",
];

const photoGuides = [
  {
    title: "入户/现场全景",
    desc: "展示今日现场整体状态和施工秩序。",
  },
  {
    title: "今日主施工区域",
    desc: "展示今日主要作业面及施工推进位置。",
  },
  {
    title: "今日施工细节",
    desc: "展示现场正在推进的具体工序。",
  },
  {
    title: "隐蔽/节点细节",
    desc: "展示关键节点做法，便于后续验收追溯。",
  },
  {
    title: "材料/成品保护",
    desc: "展示材料堆放、保护及现场管理情况。",
  },
  {
    title: "明日作业面",
    desc: "展示明日计划继续推进的施工区域。",
  },
  {
    title: "补充记录",
    desc: "补充展示现场其他需要同步的情况。",
  },
  {
    title: "补充记录",
    desc: "补充展示现场其他需要同步的情况。",
  },
  {
    title: "补充记录",
    desc: "补充展示现场其他需要同步的情况。",
  },
];

const circledNumbers = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];

const reportForm = document.querySelector("#reportForm");
const overviewPeopleList = document.querySelector("#overviewPeopleList");
const completionList = document.querySelector("#completionList");
const weeklyPlanList = document.querySelector("#weeklyPlanList");
const tomorrowList = document.querySelector("#tomorrowList");
const photoList = document.querySelector("#photoList");
const photoInput = document.querySelector("#photoInput");
const photoStatus = document.querySelector("#photoStatus");
const reportPreview = document.querySelector("#reportPreview");
const reportOutput = document.querySelector("#reportOutput");
const documentPreview = document.querySelector("#documentPreview");
const qualityBox = document.querySelector("#qualityBox");
const qualityTitle = document.querySelector("#qualityTitle");
const qualityText = document.querySelector("#qualityText");
const toast = document.querySelector("#toast");

let completions = [];
let overviewPeople = [];
let weeklyTasks = [];
let tomorrowTasks = [];
let photos = [];
let toastTimer = 0;
let includeConfirmSection = true;
let includeRiskSection = true;

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function blankCompletion() {
  return {
    id: createId(),
    title: "",
    area: "",
    progress: "",
    note: "",
  };
}

function blankOverviewPerson() {
  return {
    id: createId(),
    role: "",
    people: "",
    area: "",
  };
}

function blankTomorrowTask() {
  return {
    id: createId(),
    task: "",
    people: "",
  };
}

function blankWeeklyTask() {
  return {
    id: createId(),
    task: "",
    target: "",
    status: "",
    note: "",
  };
}

function clean(value) {
  return String(value || "").trim();
}

function valueOf(id) {
  return clean(document.querySelector(`#${id}`).value);
}

function checkedOf(id) {
  return document.querySelector(`#${id}`).checked;
}

function setValue(id, value) {
  document.querySelector(`#${id}`).value = value || "";
}

function setChecked(id, value) {
  document.querySelector(`#${id}`).checked = Boolean(value);
}

function todayInputValue() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateChinese(inputValue) {
  if (!inputValue) return "年__月__日";
  const parts = inputValue.split("-");
  if (parts.length !== 3) return inputValue;
  const [year, month, day] = parts;
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function numbered(index) {
  return circledNumbers[index] || `${index + 1}.`;
}

function fallback(value, placeholder) {
  return clean(value) || placeholder;
}

function currentCompanyName() {
  return fallback(valueOf("companyName"), DEFAULT_COMPANY);
}

function updatePageBranding() {
  const company = currentCompanyName();
  document.querySelector("#appCompanyLabel").textContent = company;
  document.title = `${company}施工日报生成器`;
}

function progressValue(id) {
  const rawValue = valueOf(id);
  if (!rawValue) return null;
  const numberValue = Number(rawValue);
  if (!Number.isFinite(numberValue)) return null;
  return Math.max(0, Math.min(100, Math.round(numberValue)));
}

function progressLabel(value) {
  return value === null ? "待填写" : `${value}%`;
}

function nonEmptyCompletionRows() {
  return completions.filter((item) =>
    [item.title, item.area, item.progress, item.note].some(clean)
  );
}

function nonEmptyTomorrowRows() {
  return tomorrowTasks.filter((item) => [item.task, item.people].some(clean));
}

function nonEmptyWeeklyRows() {
  return weeklyTasks.filter((item) =>
    [item.task, item.target, item.status, item.note].some(clean)
  );
}

function nonEmptyOverviewPeopleRows() {
  return overviewPeople.filter((item) => [item.role, item.people, item.area].some(clean));
}

function overviewPeopleTotal() {
  const total = overviewPeople.reduce((sum, item) => {
    const value = Number(clean(item.people));
    if (!Number.isFinite(value) || value <= 0) return sum;
    return sum + value;
  }, 0);
  return total > 0 ? Math.round(total) : null;
}

function currentPeopleCount() {
  const total = overviewPeopleTotal();
  if (total !== null) return total;
  const manualValue = Number(valueOf("people"));
  return Number.isFinite(manualValue) && manualValue > 0 ? Math.round(manualValue) : null;
}

function peopleCountText(value, emptyText = "待填写") {
  return value === null || !Number.isFinite(value) ? emptyText : `${value}人`;
}

function syncPeopleFromOverview() {
  const total = overviewPeopleTotal();
  if (total !== null) {
    setValue("people", String(total));
  }
}

function collectDraft() {
  const fields = {};
  fieldIds.forEach((id) => {
    fields[id] = document.querySelector(`#${id}`).value;
  });

  return {
    fields,
    hasConfirm: checkedOf("hasConfirm"),
    hasRisk: checkedOf("hasRisk"),
    includeConfirmSection,
    includeRiskSection,
    overviewPeople,
    completions,
    weeklyTasks,
    tomorrowTasks,
    photoNotes: photos.map((photo) => ({
      title: photo.title,
      desc: photo.desc,
      fileName: photo.fileName,
    })),
  };
}

function saveDraft() {
  const draft = collectDraft();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

function applyDraft(draft) {
  fieldIds.forEach((id) => {
    setValue(id, draft?.fields?.[id] || "");
  });

  if (!valueOf("companyName")) {
    setValue("companyName", DEFAULT_COMPANY);
  }

  if (!valueOf("reportDate")) {
    setValue("reportDate", todayInputValue());
  }

  if (!valueOf("status")) {
    setValue("status", "正常推进");
  }

  if (!valueOf("workfaceStatus")) {
    setValue("workfaceStatus", "正常展开");
  }

  if (!valueOf("materialStatus")) {
    setValue("materialStatus", "材料到位");
  }

  if (!valueOf("safetyStatus")) {
    setValue("safetyStatus", "正常");
  }

  if (!valueOf("scheduleCompare")) {
    setValue("scheduleCompare", "按计划执行");
  }

  setChecked("hasConfirm", draft?.hasConfirm);
  setChecked("hasRisk", draft?.hasRisk);
  includeConfirmSection = draft?.includeConfirmSection !== false;
  includeRiskSection = draft?.includeRiskSection !== false;

  overviewPeople = Array.isArray(draft?.overviewPeople) && draft.overviewPeople.length
    ? draft.overviewPeople.map((item) => ({ ...blankOverviewPerson(), ...item, id: createId() }))
    : [blankOverviewPerson(), blankOverviewPerson()];
  syncPeopleFromOverview();

  completions = Array.isArray(draft?.completions) && draft.completions.length
    ? draft.completions.map((item) => ({ ...blankCompletion(), ...item, id: createId() }))
    : [blankCompletion(), blankCompletion()];

  weeklyTasks = Array.isArray(draft?.weeklyTasks) && draft.weeklyTasks.length
    ? draft.weeklyTasks.map((item) => ({ ...blankWeeklyTask(), ...item, id: createId() }))
    : [blankWeeklyTask(), blankWeeklyTask(), blankWeeklyTask()];

  tomorrowTasks = Array.isArray(draft?.tomorrowTasks) && draft.tomorrowTasks.length
    ? draft.tomorrowTasks.map((item) => ({ ...blankTomorrowTask(), ...item, id: createId() }))
    : [blankTomorrowTask(), blankTomorrowTask(), blankTomorrowTask()];

  photos = [];
  renderOverviewPeopleList();
  renderWeeklyPlanList();
  renderCompletionList();
  renderTomorrowList();
  renderPhotoList();
  updateConditionalFields();
  updateOptionalSections();
  updatePageBranding();
  updateReport();
}

function renderCompletionList() {
  completionList.innerHTML = completions
    .map((item, index) => {
      return `
        <article class="work-item" data-id="${item.id}">
          <span class="item-index">${numbered(index)}</span>
          <div class="work-fields">
            <label>
              施工内容
              <input data-field="title" type="text" value="${escapeHtml(item.title)}" placeholder="1层桥架施工" />
            </label>
            <label>
              施工区域
              <input data-field="area" type="text" value="${escapeHtml(item.area)}" placeholder="1层" />
            </label>
            <label>
              完成情况
              <input data-field="progress" type="text" value="${escapeHtml(item.progress)}" placeholder="进行中，约完成40%" />
            </label>
            <label>
              现场说明
              <textarea data-field="note" rows="2" placeholder="今日主要完成部分桥架定位、安装及固定工作。">${escapeHtml(item.note)}</textarea>
            </label>
          </div>
          <button class="icon-button" data-action="remove-completion" type="button" title="删除">×</button>
        </article>
      `;
    })
    .join("");
}

function renderOverviewPeopleList() {
  overviewPeopleList.innerHTML = overviewPeople
    .map((item, index) => {
      return `
        <article class="work-item" data-id="${item.id}">
          <span class="item-index">${numbered(index)}</span>
          <div class="work-fields">
            <label>
              工种/班组
              <input data-field="role" type="text" value="${escapeHtml(item.role)}" placeholder="电工班组" />
            </label>
            <label>
              人数
              <input data-field="people" type="number" min="0" step="1" value="${escapeHtml(item.people)}" placeholder="4" />
            </label>
            <label>
              作业区域/任务
              <textarea data-field="area" rows="2" placeholder="1层桥架及C型钢支座施工">${escapeHtml(item.area)}</textarea>
            </label>
          </div>
          <button class="icon-button" data-action="remove-overview-person" type="button" title="删除">×</button>
        </article>
      `;
    })
    .join("");
}

function renderWeeklyPlanList() {
  weeklyPlanList.innerHTML = weeklyTasks
    .map((item, index) => {
      return `
        <article class="work-item" data-id="${item.id}">
          <span class="item-index">${numbered(index)}</span>
          <div class="work-fields">
            <label>
              本周计划事项
              <input data-field="task" type="text" value="${escapeHtml(item.task)}" placeholder="1层桥架及C型钢支座施工" />
            </label>
            <label>
              计划节点
              <input data-field="target" type="text" value="${escapeHtml(item.target)}" placeholder="5月3日前完成主要区域" />
            </label>
            <label>
              当前状态
              <input data-field="status" type="text" value="${escapeHtml(item.status)}" placeholder="按计划推进" />
            </label>
            <label>
              执行说明
              <textarea data-field="note" rows="2" placeholder="今日施工内容属于本周计划内工作，当前与节点目标匹配。">${escapeHtml(item.note)}</textarea>
            </label>
          </div>
          <button class="icon-button" data-action="remove-weekly" type="button" title="删除">×</button>
        </article>
      `;
    })
    .join("");
}

function renderTomorrowList() {
  tomorrowList.innerHTML = tomorrowTasks
    .map((item, index) => {
      return `
        <article class="work-item" data-id="${item.id}">
          <span class="item-index">${numbered(index)}</span>
          <div class="work-fields">
            <label>
              工作内容
              <input data-field="task" type="text" value="${escapeHtml(item.task)}" placeholder="2层新风管施工" />
            </label>
            <label>
              计划人数
              <input data-field="people" type="number" min="0" step="1" value="${escapeHtml(item.people)}" placeholder="1" />
            </label>
          </div>
          <button class="icon-button" data-action="remove-tomorrow" type="button" title="删除">×</button>
        </article>
      `;
    })
    .join("");
}

function renderPhotoList() {
  photoStatus.textContent = photos.length
    ? `已上传${photos.length}张照片，文档和微信发送时请保持图序一致`
    : "尚未上传照片";

  photoList.innerHTML = photos
    .map((photo, index) => {
      return `
        <article class="photo-card" data-id="${photo.id}">
          <img src="${photo.url}" alt="图${index + 1}预览" />
          <div>
            <div class="photo-meta">图${index + 1}｜${escapeHtml(photo.fileName)}</div>
            <div class="photo-fields">
              <label>
                图题
                <input data-photo-field="title" type="text" value="${escapeHtml(photo.title)}" />
              </label>
              <label>
                说明
                <textarea data-photo-field="desc" rows="2">${escapeHtml(photo.desc)}</textarea>
              </label>
            </div>
          </div>
          <div class="photo-actions">
            <button class="icon-button move-button" data-photo-action="up" type="button" title="上移">↑</button>
            <button class="icon-button move-button" data-photo-action="down" type="button" title="下移">↓</button>
            <button class="icon-button" data-photo-action="remove" type="button" title="删除">×</button>
          </div>
        </article>
      `;
    })
    .join("");

  updateReport();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function updateConditionalFields() {
  document.querySelector("#confirmFields").classList.toggle("is-open", checkedOf("hasConfirm"));
  document.querySelector("#riskFields").classList.toggle("is-open", checkedOf("hasRisk"));
}

function updateOptionalSections() {
  document.querySelector("#confirmBlock").classList.toggle("is-hidden", !includeConfirmSection);
  document.querySelector("#riskBlock").classList.toggle("is-hidden", !includeRiskSection);
  document.querySelector("#toggleConfirmSectionBtn").textContent = includeConfirmSection
    ? "删除板块"
    : "恢复板块";
  document.querySelector("#toggleRiskSectionBtn").textContent = includeRiskSection
    ? "删除板块"
    : "恢复板块";
}

function buildReportText() {
  const company = currentCompanyName();
  const projectName = fallback(valueOf("projectName"), "__________");
  const reportDate = formatDateChinese(valueOf("reportDate"));
  const manager = fallback(valueOf("manager"), "______");
  const weather = fallback(valueOf("weather"), "__________");
  syncPeopleFromOverview();
  const peopleCount = currentPeopleCount();
  const stage = fallback(valueOf("stage"), "__________");
  const status = fallback(valueOf("status"), "正常推进");
  const overviewPeopleRows = nonEmptyOverviewPeopleRows();
  const weeklyRows = nonEmptyWeeklyRows();
  const completionRows = nonEmptyCompletionRows();
  const tomorrowRows = nonEmptyTomorrowRows();
  const sep = "━━━━━━━━━━━━";

  const lines = [
    `【${company}｜今日施工简报】`,
    "",
    `项目名称：${projectName}`,
    `日期：${reportDate}`,
    `项目经理：${manager}`,
    `今日天气：${weather}`,
    `现场人数：${peopleCountText(peopleCount)}`,
    `当前阶段：${stage}`,
    `进度状态：${status}`,
    "",
    sep,
    "",
    "01｜今日现场概览",
    "",
  ];

  lines.push(
    `今日现场共${peopleCount === null ? "__名施工人员" : `${peopleCount}名施工人员`}在场，作业面${fallback(valueOf("workfaceStatus"), "正常展开")}，材料状态为${fallback(valueOf("materialStatus"), "材料到位")}，安全文明状态${fallback(valueOf("safetyStatus"), "正常")}，整体施工秩序${status === "正常推进" ? "正常" : "按现场情况推进"}。`
  );

  if (overviewPeopleRows.length) {
    lines.push("", "现场人员配置：");
    overviewPeopleRows.forEach((item, index) => {
      const peopleText = clean(item.people) ? `${clean(item.people)}人` : "人数待补充";
      lines.push(
        `${numbered(index)} ${fallback(item.role, "工种/班组待补充")}：${peopleText}`,
        `作业区域/任务：${fallback(item.area, "__________")}`
      );
    });
  }

  lines.push(
    "",
    "现场组织状态：",
    `作业面：${fallback(valueOf("workfaceStatus"), "正常展开")}`,
    `材料状态：${fallback(valueOf("materialStatus"), "材料到位")}`,
    `安全文明：${fallback(valueOf("safetyStatus"), "正常")}`
  );

  lines.push("", sep, "", "02｜工期计划与三层进度", "");
  lines.push(
    "总工期：",
    `总工期计划：${fallback(valueOf("plannedPeriod"), "__________")}`,
    `总工期完成比例：${progressLabel(progressValue("totalProgress"))}`,
    `整体执行判断：${fallback(valueOf("scheduleCompare"), "按计划执行")}`,
    "",
    "当前阶段：",
    `当前大阶段：${stage}`,
    `阶段目标：${fallback(valueOf("phaseGoal"), "__________")}`,
    `阶段计划完成时间：${fallback(valueOf("phasePlanEnd"), "__________")}`,
    `阶段完成比例：${progressLabel(progressValue("phaseProgress"))}`,
    "",
    "本周计划：",
    `本周计划完成比例：${progressLabel(progressValue("weeklyProgress"))}`,
    "",
    "本周目标：",
    fallback(valueOf("weeklyFocus"), "__________")
  );

  if (weeklyRows.length) {
    lines.push("", "本周计划拆解：");
    weeklyRows.forEach((item, index) => {
      lines.push(
        `${numbered(index)} ${fallback(item.task, "__________")}`,
        `计划节点：${fallback(item.target, "__________")}`,
        `当前状态：${fallback(item.status, "__________")}`,
        `执行说明：${fallback(item.note, "__________")}`
      );
      if (index < weeklyRows.length - 1) lines.push("");
    });
  }

  lines.push("", "进度说明：");
  lines.push(fallback(valueOf("scheduleNote"), "__________"));

  lines.push("", sep, "", "03｜今日完成内容", "");

  if (completionRows.length) {
    completionRows.forEach((item, index) => {
      if (index > 0) lines.push("");
      lines.push(
        `${numbered(index)} ${fallback(item.title, "__________")}`,
        `施工区域：${fallback(item.area, "__________")}`,
        `完成情况：${fallback(item.progress, "__________")}`,
        `现场说明：${fallback(item.note, "__________")}`
      );
    });
  } else {
    lines.push("今日完成内容待补充。");
  }

  lines.push("", sep, "", "04｜现场照片说明", "");

  if (photos.length) {
    photos.forEach((photo, index) => {
      if (index > 0) lines.push("");
      lines.push(
        `图${index + 1}｜${fallback(photo.title, photoGuides[index]?.title || "现场照片")}`,
        `说明：${fallback(photo.desc, photoGuides[index]?.desc || "现场情况记录。")}`
      );
    });
  } else {
    lines.push("照片上传后，将自动生成图1至图9的说明。");
  }

  lines.push("", sep, "", "05｜明日工作安排", "");

  if (tomorrowRows.length) {
    tomorrowRows.forEach((item, index) => {
      const peopleText = clean(item.people) ? `，计划${clean(item.people)}人` : "";
      lines.push(`${numbered(index)} ${fallback(item.task, "__________")}${peopleText}`);
    });
  } else {
    lines.push("明日工作安排待补充。");
  }

  lines.push("", "明日重点：");
  lines.push(fallback(valueOf("tomorrowFocus"), "__________"));

  let nextTextSection = 6;

  if (includeConfirmSection) {
    lines.push("", sep, "", `${String(nextTextSection).padStart(2, "0")}｜客户需确认事项`, "");
    nextTextSection += 1;

    if (checkedOf("hasConfirm")) {
      lines.push(
        `事项：${fallback(valueOf("confirmItem"), "__________")}`,
        `最晚确认时间：${fallback(valueOf("confirmDeadline"), "月__日")}`,
        `如未确认影响：${fallback(valueOf("confirmImpact"), "__________")}`
      );
    } else {
      lines.push("今日暂无需客户确认事项。");
    }
  }

  if (includeRiskSection) {
    lines.push("", sep, "", `${String(nextTextSection).padStart(2, "0")}｜问题与风险提示`, "");
    nextTextSection += 1;

    if (checkedOf("hasRisk")) {
      lines.push(
        `问题：${fallback(valueOf("riskProblem"), "__________")}`,
        `影响：${fallback(valueOf("riskImpact"), "__________")}`,
        `解决方案：${fallback(valueOf("riskSolution"), "__________")}`,
        `责任人：${fallback(valueOf("riskOwner"), "__________")}`,
        `计划解决时间：${fallback(valueOf("riskDate"), "____月__日")}`
      );
    } else {
      lines.push("今日暂无新增问题，现场推进正常。");
    }
  }

  lines.push("", sep, "", `${String(nextTextSection).padStart(2, "0")}｜项目经理说明`, "");
  lines.push(
    fallback(
      valueOf("summary"),
      "今日现场整体推进正常。后续我们将继续按照施工计划推进，并持续关注现场秩序、隐蔽节点、材料衔接及安全文明施工。"
    )
  );

  return lines.join("\n");
}

function previewPhotoItems() {
  return photos.map((photo, index) => ({
    src: photo.url,
    title: fallback(photo.title, photoGuides[index]?.title || "现场照片"),
    desc: fallback(photo.desc, photoGuides[index]?.desc || "现场情况记录。"),
    fileName: photo.fileName,
  }));
}

function getReportData(photoItems = previewPhotoItems()) {
  syncPeopleFromOverview();
  const peopleCount = currentPeopleCount();
  const status = fallback(valueOf("status"), "正常推进");
  const totalProgress = progressValue("totalProgress");
  const phaseProgress = progressValue("phaseProgress");
  const weeklyProgress = progressValue("weeklyProgress");

  return {
    companyName: currentCompanyName(),
    projectName: fallback(valueOf("projectName"), "项目名称待填写"),
    reportDate: formatDateChinese(valueOf("reportDate")),
    manager: fallback(valueOf("manager"), "待填写"),
    weather: fallback(valueOf("weather"), "待填写"),
    people: peopleCountText(peopleCount),
    peopleCount: peopleCount ?? "__",
    stage: fallback(valueOf("stage"), "当前阶段待填写"),
    status,
    plannedPeriod: fallback(valueOf("plannedPeriod"), "总工期计划待填写"),
    totalProgress,
    totalProgressLabel: progressLabel(totalProgress),
    phaseGoal: fallback(valueOf("phaseGoal"), "阶段目标待填写"),
    phasePlanEnd: fallback(valueOf("phasePlanEnd"), "阶段计划完成时间待填写"),
    scheduleCompare: fallback(valueOf("scheduleCompare"), "按计划执行"),
    phaseProgress,
    phaseProgressLabel: progressLabel(phaseProgress),
    weeklyProgress,
    weeklyProgressLabel: progressLabel(weeklyProgress),
    weeklyFocus: fallback(valueOf("weeklyFocus"), "本周目标待补充。"),
    scheduleNote: fallback(valueOf("scheduleNote"), "进度说明待补充。"),
    overviewPeople: nonEmptyOverviewPeopleRows(),
    workfaceStatus: fallback(valueOf("workfaceStatus"), "正常展开"),
    materialStatus: fallback(valueOf("materialStatus"), "材料到位"),
    safetyStatus: fallback(valueOf("safetyStatus"), "正常"),
    weeklyTasks: nonEmptyWeeklyRows(),
    completions: nonEmptyCompletionRows(),
    tomorrowTasks: nonEmptyTomorrowRows(),
    tomorrowFocus: fallback(valueOf("tomorrowFocus"), "明日重点待补充。"),
    includeConfirmSection,
    includeRiskSection,
    hasConfirm: checkedOf("hasConfirm"),
    confirmItem: fallback(valueOf("confirmItem"), "待填写"),
    confirmDeadline: fallback(valueOf("confirmDeadline"), "待填写"),
    confirmImpact: fallback(valueOf("confirmImpact"), "待填写"),
    hasRisk: checkedOf("hasRisk"),
    riskProblem: fallback(valueOf("riskProblem"), "待填写"),
    riskImpact: fallback(valueOf("riskImpact"), "待填写"),
    riskSolution: fallback(valueOf("riskSolution"), "待填写"),
    riskOwner: fallback(valueOf("riskOwner"), "待填写"),
    riskDate: fallback(valueOf("riskDate"), "待填写"),
    summary: fallback(
      valueOf("summary"),
      "今日现场整体推进正常。后续我们将继续按照施工计划推进，并持续关注现场秩序、隐蔽节点、材料衔接及安全文明施工。"
    ),
    photos: photoItems,
  };
}

function buildOverviewSentence(data) {
  const orderText = data.status === "正常推进" ? "正常" : "按现场情况推进";
  const peopleText =
    data.peopleCount === "__" ? "__名施工人员" : `${data.peopleCount}名施工人员`;
  return `今日现场共${peopleText}在场，作业面${data.workfaceStatus}，材料状态为${data.materialStatus}，安全文明状态${data.safetyStatus}，整体施工秩序${orderText}。`;
}

function scheduleAttentionLevel(data) {
  if (data.scheduleCompare === "需重点关注" || data.status === "需重点关注") return "danger";
  if (data.scheduleCompare === "轻微滞后" || data.status === "轻微滞后") return "warn";
  return "";
}

function textAttentionLevel(values) {
  const text = values.map((value) => clean(value)).join(" ");
  if (/严重|停工|返工|需重点关注|重大/.test(text)) return "danger";
  if (/滞后|延后|延期|需关注|未完成|受限|影响/.test(text)) return "warn";
  return "";
}

function statusAttentionLevel(value) {
  const text = clean(value);
  if (/需重点关注|需协调/.test(text)) return "danger";
  if (/局部受限|部分待进场|需加强/.test(text)) return "warn";
  return "";
}

function attentionClass(baseClass, level) {
  return level ? `${baseClass} attention-${level}` : baseClass;
}

function buildDocumentMarkup(photoItems) {
  const data = getReportData(photoItems);
  const scheduleLevel = scheduleAttentionLevel(data);
  const workfaceLevel = statusAttentionLevel(data.workfaceStatus);
  const materialLevel = statusAttentionLevel(data.materialStatus);
  const safetyLevel = statusAttentionLevel(data.safetyStatus);
  const peopleHtml = data.overviewPeople.length
    ? `<div class="doc-work-list">${data.overviewPeople
        .map(
          (item, index) => `
            <article class="doc-work compact">
              <div class="doc-work-title"><span>${numbered(index)}</span><strong>${escapeHtml(fallback(item.role, "工种/班组待补充"))}</strong></div>
              <div class="doc-work-grid">
                <div class="doc-mini"><span class="doc-mini-label">人数</span><strong>${escapeHtml(clean(item.people) ? `${clean(item.people)}人` : "待填写")}</strong></div>
                <div class="doc-mini"><span class="doc-mini-label">作业区域/任务</span><strong>${escapeHtml(fallback(item.area, "待填写"))}</strong></div>
              </div>
            </article>
          `
        )
        .join("")}</div>`
    : `<div class="doc-alert"><strong>现场人员配置待补充</strong><span>补充班组、人数和作业任务后，客户可以更清楚看到现场组织情况。</span></div>`;

  const overviewStatusHtml = `
    <div class="doc-work-grid">
      <div class="${attentionClass("doc-mini", workfaceLevel)}"><span class="doc-mini-label">作业面状态</span><strong>${escapeHtml(data.workfaceStatus)}</strong></div>
      <div class="${attentionClass("doc-mini", materialLevel)}"><span class="doc-mini-label">材料状态</span><strong>${escapeHtml(data.materialStatus)}</strong></div>
      <div class="${attentionClass("doc-mini", safetyLevel)}"><span class="doc-mini-label">安全文明</span><strong>${escapeHtml(data.safetyStatus)}</strong></div>
      <div class="doc-mini"><span class="doc-mini-label">现场人数</span><strong>${escapeHtml(data.people)}</strong></div>
    </div>
  `;

  const weeklyHtml = data.weeklyTasks.length
    ? `<div class="doc-work-list">${data.weeklyTasks
        .map((item, index) => {
          const itemLevel = textAttentionLevel([item.status, item.note]);
          return `
            <article class="${attentionClass("doc-work", itemLevel)}">
              <div class="doc-work-title"><span>${numbered(index)}</span><strong>${escapeHtml(fallback(item.task, "本周计划待填写"))}</strong></div>
              <div class="doc-work-grid">
                <div class="doc-mini"><span class="doc-mini-label">计划节点</span><strong>${escapeHtml(fallback(item.target, "待填写"))}</strong></div>
                <div class="${attentionClass("doc-mini", itemLevel)}"><span class="doc-mini-label">当前状态</span><strong>${escapeHtml(fallback(item.status, "待填写"))}</strong></div>
              </div>
              <p class="doc-note">${escapeHtml(fallback(item.note, "执行说明待填写。"))}</p>
            </article>
          `;
        })
        .join("")}</div>`
    : `<div class="doc-alert"><strong>本周计划待补充</strong><span>补充周计划后，客户可以看到今日工作是否服务于阶段节点。</span></div>`;

  const progressHtml = `
    <div class="doc-progress-list">
      <div class="${attentionClass("doc-progress", scheduleLevel)}">
        <div class="doc-progress-head">
          <span>总工期完成比例</span>
          <strong>${escapeHtml(data.totalProgressLabel)}</strong>
        </div>
        <div class="doc-progress-track"><div class="${attentionClass("doc-progress-fill", scheduleLevel)}" style="width: ${data.totalProgress ?? 0}%"></div></div>
      </div>
      <div class="${attentionClass("doc-progress", scheduleLevel)}">
        <div class="doc-progress-head">
          <span>当前阶段完成比例</span>
          <strong>${escapeHtml(data.phaseProgressLabel)}</strong>
        </div>
        <div class="doc-progress-track"><div class="${attentionClass("doc-progress-fill", scheduleLevel)}" style="width: ${data.phaseProgress ?? 0}%"></div></div>
      </div>
      <div class="${attentionClass("doc-progress", scheduleLevel)}">
        <div class="doc-progress-head">
          <span>本周计划完成比例</span>
          <strong>${escapeHtml(data.weeklyProgressLabel)}</strong>
        </div>
        <div class="doc-progress-track"><div class="${attentionClass("doc-progress-fill weekly", scheduleLevel)}" style="width: ${data.weeklyProgress ?? 0}%"></div></div>
      </div>
    </div>
  `;

  const completionsHtml = data.completions.length
    ? `<div class="doc-work-list">${data.completions
        .map(
          (item, index) => `
            <article class="doc-work">
              <div class="doc-work-title"><span>${numbered(index)}</span><strong>${escapeHtml(fallback(item.title, "施工内容待填写"))}</strong></div>
              <div class="doc-work-grid">
                <div class="doc-mini"><span class="doc-mini-label">施工区域</span><strong>${escapeHtml(fallback(item.area, "待填写"))}</strong></div>
                <div class="doc-mini"><span class="doc-mini-label">完成情况</span><strong>${escapeHtml(fallback(item.progress, "待填写"))}</strong></div>
              </div>
              <p class="doc-note">${escapeHtml(fallback(item.note, "现场说明待填写。"))}</p>
            </article>
          `
        )
        .join("")}</div>`
    : `<div class="doc-alert"><strong>今日完成内容待补充</strong><span>填写完成事项后，这里会自动生成标准化图文内容。</span></div>`;

  const photosHtml = data.photos.length
    ? data.photos
        .map(
          (photo, index) => `
            <figure class="doc-photo">
              <img src="${escapeAttr(photo.src)}" alt="图${index + 1} ${escapeAttr(photo.title)}" />
              <figcaption class="doc-photo-caption">
                <span class="doc-photo-index">图${index + 1}</span>
                <h5>${escapeHtml(photo.title)}</h5>
                <p>${escapeHtml(photo.desc)}</p>
              </figcaption>
            </figure>
          `
        )
        .join("")
    : `<div class="doc-photo-empty">上传现场照片后，这里会生成适合手机查看的大图记录。</div>`;

  const tomorrowHtml = data.tomorrowTasks.length
    ? `<div class="doc-tomorrow-list">${data.tomorrowTasks
        .map((item, index) => {
          const peopleText = clean(item.people) ? `计划${clean(item.people)}人` : "计划人数待填写";
          return `
            <div class="doc-tomorrow">
              <strong>${numbered(index)}</strong>
              <div>${escapeHtml(fallback(item.task, "明日工作待填写"))}<br /><span>${escapeHtml(peopleText)}</span></div>
            </div>
          `;
        })
        .join("")}</div>`
    : `<div class="doc-alert"><strong>明日工作安排待补充</strong><span>填写计划后，客户能更清楚看到下一步安排。</span></div>`;

  const confirmHtml = data.hasConfirm
    ? `
      <div class="doc-alert attention-warn">
        <strong>事项：${escapeHtml(data.confirmItem)}</strong>
        <p>最晚确认时间：${escapeHtml(data.confirmDeadline)}</p>
        <p>如未确认影响：${escapeHtml(data.confirmImpact)}</p>
      </div>
    `
    : `<div class="doc-alert ok"><strong>今日暂无需客户确认事项</strong><span>后续涉及材料、点位、尺寸、变更等内容，会提前在群内同步。</span></div>`;

  const riskHtml = data.hasRisk
    ? `
      <div class="doc-alert attention-danger">
        <strong>问题：${escapeHtml(data.riskProblem)}</strong>
        <p>影响：${escapeHtml(data.riskImpact)}</p>
        <p>解决方案：${escapeHtml(data.riskSolution)}</p>
        <p>责任人：${escapeHtml(data.riskOwner)}　计划解决时间：${escapeHtml(data.riskDate)}</p>
      </div>
    `
    : `<div class="doc-alert ok"><strong>今日暂无新增问题</strong><span>现场推进正常，后续继续关注关键节点和施工秩序。</span></div>`;

  let nextDocSection = 6;
  const optionalDocSections = [];
  if (data.includeConfirmSection) {
    const confirmLevel = data.hasConfirm ? "warn" : "";
    optionalDocSections.push(`
      <section class="${attentionClass(nextDocSection % 2 === 0 ? "doc-section soft" : "doc-section", confirmLevel)}">
        <div class="doc-section-head">
          <h4>客户确认事项</h4>
          <span class="doc-section-kicker">${String(nextDocSection).padStart(2, "0")}</span>
        </div>
        ${confirmHtml}
      </section>
    `);
    nextDocSection += 1;
  }

  if (data.includeRiskSection) {
    const riskLevel = data.hasRisk ? "danger" : "";
    optionalDocSections.push(`
      <section class="${attentionClass(nextDocSection % 2 === 0 ? "doc-section soft" : "doc-section", riskLevel)}">
        <div class="doc-section-head">
          <h4>问题与风险提示</h4>
          <span class="doc-section-kicker">${String(nextDocSection).padStart(2, "0")}</span>
        </div>
        ${riskHtml}
      </section>
    `);
    nextDocSection += 1;
  }

  return `
    <article class="doc-page">
      <header class="doc-hero">
        <p class="doc-brand">${escapeHtml(data.companyName)}｜项目日进度汇报</p>
        <h3>${escapeHtml(data.projectName)}</h3>
        <p class="doc-subtitle">${escapeHtml(data.reportDate)} · ${escapeHtml(data.stage)}</p>
        <div class="doc-status">
          <div><span>项目经理</span><strong>${escapeHtml(data.manager)}</strong></div>
          <div><span>现场人数</span><strong>${escapeHtml(data.people)}</strong></div>
          <div><span>进度状态</span><strong>${escapeHtml(data.status)}</strong></div>
          <div><span>今日天气</span><strong>${escapeHtml(data.weather)}</strong></div>
        </div>
      </header>

      <section class="doc-section">
        <div class="doc-section-head">
          <h4>今日现场概览</h4>
          <span class="doc-section-kicker">01</span>
        </div>
        <p class="doc-lead">${escapeHtml(buildOverviewSentence(data))}</p>
        ${overviewStatusHtml}
        ${peopleHtml}
      </section>

      <section class="${attentionClass("doc-section soft", scheduleLevel)}">
        <div class="doc-section-head">
          <h4>工期计划与三层进度</h4>
          <span class="doc-section-kicker">02</span>
        </div>
        <div class="doc-work-grid">
          <div class="doc-mini"><span class="doc-mini-label">总工期计划</span><strong>${escapeHtml(data.plannedPeriod)}</strong></div>
          <div class="doc-mini"><span class="doc-mini-label">当前阶段</span><strong>${escapeHtml(data.stage)}</strong></div>
          <div class="doc-mini"><span class="doc-mini-label">阶段目标</span><strong>${escapeHtml(data.phaseGoal)}</strong></div>
          <div class="doc-mini"><span class="doc-mini-label">阶段计划完成时间</span><strong>${escapeHtml(data.phasePlanEnd)}</strong></div>
          <div class="${attentionClass("doc-mini", scheduleLevel)}"><span class="doc-mini-label">执行判断</span><strong>${escapeHtml(data.scheduleCompare)}</strong></div>
        </div>
        ${progressHtml}
        <div class="doc-alert ok">
          <strong>本周目标</strong>
          <span>${escapeHtml(data.weeklyFocus)}</span>
        </div>
        ${weeklyHtml}
        <div class="doc-alert ok">
          <strong>进度说明</strong>
          <span>${escapeHtml(data.scheduleNote)}</span>
        </div>
      </section>

      <section class="doc-section">
        <div class="doc-section-head">
          <h4>今日完成内容</h4>
          <span class="doc-section-kicker">03</span>
        </div>
        ${completionsHtml}
      </section>

      <section class="doc-section soft">
        <div class="doc-section-head">
          <h4>现场影像记录</h4>
          <span class="doc-section-kicker">04｜大图查看</span>
        </div>
        ${photosHtml}
      </section>

      <section class="doc-section">
        <div class="doc-section-head">
          <h4>明日工作安排</h4>
          <span class="doc-section-kicker">05</span>
        </div>
        ${tomorrowHtml}
        <div class="doc-alert ok">
          <strong>明日重点</strong>
          <span>${escapeHtml(data.tomorrowFocus)}</span>
        </div>
      </section>

      ${optionalDocSections.join("")}

      <footer class="doc-footer">
        <p>${escapeHtml(data.summary)}</p>
      </footer>
    </article>
  `;
}

function standaloneDocumentCss() {
  return `
    * { box-sizing: border-box; }
    html { background: #edf3f2; }
    body {
      margin: 0;
      background: #edf3f2;
      color: #1f2829;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif;
    }
    .document-preview {
      width: min(100%, 760px);
      margin: 0 auto;
      background: #f8faf9;
      font-size: 17px;
      line-height: 1.78;
    }
    .doc-hero {
      padding: 34px 24px 24px;
      background: linear-gradient(135deg, rgba(15, 78, 72, 0.98), rgba(31, 75, 106, 0.96)), #123d40;
      color: #fff;
    }
    .doc-brand { margin: 0 0 14px; color: #d7ebe7; font-size: 13px; font-weight: 800; }
    .doc-hero h3 { margin: 0; font-size: 32px; line-height: 1.16; letter-spacing: 0; }
    .doc-subtitle { margin: 10px 0 0; color: #edf7f5; font-size: 15px; }
    .doc-status { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 22px; }
    .doc-status div { min-height: 62px; padding: 10px 11px; border: 1px solid rgba(255,255,255,.18); border-radius: 8px; background: rgba(255,255,255,.1); }
    .doc-status span, .doc-section-kicker, .doc-photo-index, .doc-mini-label { display: block; color: #6b7779; font-size: 12px; font-weight: 800; }
    .doc-status span { color: #c8dedb; }
    .doc-status strong { display: block; margin-top: 4px; color: #fff; font-size: 16px; line-height: 1.35; }
    .doc-section { padding: 24px; border-bottom: 1px solid #dfe8e6; background: #fff; }
    .doc-section.soft { background: #f7faf9; }
    .doc-section.attention-warn { border-left: 5px solid #d28a12; background: #fff8e8; }
    .doc-section.attention-danger { border-left: 5px solid #c94336; background: #fff2f0; }
    .doc-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 13px; }
    .doc-section h4 { margin: 0; color: #20282a; font-size: 21px; line-height: 1.35; }
    .doc-section-kicker { color: #176b61; }
    .doc-lead { margin: 0; color: #2e393b; }
    .doc-work-list, .doc-tomorrow-list { display: grid; gap: 10px; margin: 15px 0 0; }
    .doc-work, .doc-tomorrow, .doc-alert { border: 1px solid #dfe8e6; border-radius: 8px; background: #fbfdfc; }
    .doc-work { padding: 14px; }
    .doc-work.attention-warn { border-color: #e5b65a; background: #fffaf0; }
    .doc-work.attention-danger { border-color: #e6a19a; background: #fff5f3; }
    .doc-work-title { display: flex; gap: 8px; align-items: center; margin-bottom: 9px; color: #0f4e48; font-weight: 900; }
    .doc-work-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 8px; }
    .doc-mini { padding: 9px 10px; border-radius: 6px; background: #f1f6f5; }
    .doc-mini.attention-warn { border: 1px solid #e5b65a; background: #fff1cb; }
    .doc-mini.attention-danger { border: 1px solid #e6a19a; background: #ffe1dc; }
    .doc-mini strong { display: block; margin-top: 2px; color: #20282a; font-size: 15px; }
    .doc-progress-list { display: grid; gap: 10px; margin: 12px 0; }
    .doc-progress { padding: 12px; border: 1px solid #dfe8e6; border-radius: 8px; background: #fff; }
    .doc-progress.attention-warn { border-color: #e5b65a; background: #fffaf0; }
    .doc-progress.attention-danger { border-color: #e6a19a; background: #fff5f3; }
    .doc-progress-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; color: #425052; font-size: 13px; font-weight: 800; }
    .doc-progress-head strong { color: #0f4e48; font-size: 18px; }
    .doc-progress-track { overflow: hidden; height: 10px; border-radius: 999px; background: #e6eeee; }
    .doc-progress-fill { width: 0; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #176b61, #315f8a); }
    .doc-progress-fill.weekly { background: linear-gradient(90deg, #315f8a, #a06b1a); }
    .doc-progress-fill.attention-warn { background: linear-gradient(90deg, #d28a12, #e5b65a); }
    .doc-progress-fill.attention-danger { background: linear-gradient(90deg, #c94336, #e66f61); }
    .doc-note { margin: 0; color: #3a4547; }
    .doc-photo { overflow: hidden; margin: 16px 0 0; border: 1px solid #d7e2e0; border-radius: 8px; background: #fff; }
    .doc-photo:first-of-type { margin-top: 0; }
    .doc-photo img { display: block; width: 100%; height: auto; background: #edf2f1; }
    .doc-photo-caption { padding: 14px 15px 15px; }
    .doc-photo-index { color: #315f8a; }
    .doc-photo-caption h5 { margin: 4px 0 6px; color: #20282a; font-size: 18px; line-height: 1.35; }
    .doc-photo-caption p { margin: 0; color: #4f5a5c; }
    .doc-photo-empty { display: grid; place-items: center; min-height: 180px; padding: 20px; background: #eef4f3; color: #657174; text-align: center; font-weight: 800; }
    .doc-tomorrow { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 8px; padding: 12px; }
    .doc-tomorrow strong { color: #0f4e48; }
    .doc-tomorrow span { color: #657174; }
    .doc-alert { margin-top: 12px; padding: 14px; border-left: 4px solid #a06b1a; }
    .doc-alert.ok { border-left-color: #176b61; }
    .doc-alert.attention-warn { border-color: #e5b65a; border-left-color: #d28a12; background: #fff6df; color: #5f4212; }
    .doc-alert.attention-danger { border-color: #e6a19a; border-left-color: #c94336; background: #fff0ed; color: #6c231c; }
    .doc-alert strong { display: block; margin-bottom: 4px; }
    .doc-alert p { margin: 4px 0 0; }
    .doc-footer { padding: 24px; background: #172f32; color: #eef7f5; }
    .doc-footer p { margin: 0; }
    @media (max-width: 560px) {
      .document-preview { font-size: 16px; }
      .doc-hero { padding: 30px 20px 22px; }
      .doc-hero h3 { font-size: 28px; }
      .doc-section, .doc-footer { padding: 22px 18px; }
      .doc-work-grid { grid-template-columns: 1fr; }
    }
  `;
}

function updateQuality() {
  const missing = [];
  if (!valueOf("projectName")) missing.push("项目名称");
  if (!valueOf("people")) missing.push("现场人数");
  if (!valueOf("stage")) missing.push("当前阶段");
  if (!nonEmptyOverviewPeopleRows().length) missing.push("人员配置");
  if (!valueOf("plannedPeriod")) missing.push("总工期计划");
  if (progressValue("totalProgress") === null) missing.push("总工期进度");
  if (!valueOf("phaseGoal")) missing.push("阶段目标");
  if (!valueOf("phasePlanEnd")) missing.push("阶段计划时间");
  if (progressValue("phaseProgress") === null) missing.push("阶段进度");
  if (progressValue("weeklyProgress") === null) missing.push("本周进度");
  if (!nonEmptyWeeklyRows().length) missing.push("本周计划");
  if (!nonEmptyCompletionRows().length) missing.push("完成内容");
  if (!nonEmptyTomorrowRows().length) missing.push("明日安排");
  if (photos.length < 6) missing.push("6张照片");

  const ready = missing.length === 0;
  qualityBox.classList.toggle("is-ready", ready);
  qualityTitle.textContent = ready ? "可以发送" : "待完善";
  qualityText.textContent = ready
    ? "核心信息和照片已完整，建议导出图文文档后发给客户查看。"
    : `建议补充：${missing.join("、")}。`;
}

function updateReport() {
  updatePageBranding();
  const text = buildReportText();
  reportPreview.textContent = text;
  reportOutput.value = text;
  documentPreview.innerHTML = buildDocumentMarkup(previewPhotoItems());
  updateQuality();
  saveDraft();
}

function updateCollectionItem(event, collection) {
  const itemNode = event.target.closest("[data-id]");
  if (!itemNode) return;
  const item = collection.find((entry) => entry.id === itemNode.dataset.id);
  if (!item) return;
  const field = event.target.dataset.field;
  if (!field) return;
  item[field] = event.target.value;
  updateReport();
}

function removeCollectionItem(id, collection, fallbackFactory) {
  const next = collection.filter((item) => item.id !== id);
  return next.length ? next : [fallbackFactory()];
}

function handlePhotoUpload(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  const remaining = MAX_PHOTOS - photos.length;
  if (remaining <= 0) {
    showToast("最多上传9张照片");
    event.target.value = "";
    return;
  }

  files.slice(0, remaining).forEach((file) => {
    const guide = photoGuides[photos.length] || photoGuides.at(-1);
    photos.push({
      id: createId(),
      file,
      fileName: file.name,
      url: URL.createObjectURL(file),
      title: guide.title,
      desc: guide.desc,
    });
  });

  if (files.length > remaining) {
    showToast(`已保留前${remaining}张照片，最多9张`);
  }

  event.target.value = "";
  renderPhotoList();
  saveDraft();
}

function handlePhotoInput(event) {
  const card = event.target.closest("[data-id]");
  if (!card) return;
  const photo = photos.find((item) => item.id === card.dataset.id);
  if (!photo) return;
  const field = event.target.dataset.photoField;
  if (!field) return;
  photo[field] = event.target.value;
  updateReport();
}

function handlePhotoClick(event) {
  const button = event.target.closest("[data-photo-action]");
  if (!button) return;
  const card = button.closest("[data-id]");
  const index = photos.findIndex((item) => item.id === card.dataset.id);
  if (index < 0) return;

  const action = button.dataset.photoAction;
  if (action === "remove") {
    URL.revokeObjectURL(photos[index].url);
    photos.splice(index, 1);
  }

  if (action === "up" && index > 0) {
    [photos[index - 1], photos[index]] = [photos[index], photos[index - 1]];
  }

  if (action === "down" && index < photos.length - 1) {
    [photos[index + 1], photos[index]] = [photos[index], photos[index + 1]];
  }

  renderPhotoList();
  saveDraft();
}

async function copyReport() {
  const text = reportOutput.value;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    reportOutput.focus();
    reportOutput.select();
    document.execCommand("copy");
  }
  showToast("日报正文已复制");
}

function downloadReport() {
  const project = valueOf("projectName") || "施工日报";
  const date = valueOf("reportDate") || todayInputValue();
  const company = currentCompanyName();
  const blob = new Blob([reportOutput.value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(project)}-${safeFileName(date)}-${safeFileName(company)}微信日报.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function exportPhotoItems() {
  const items = [];
  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index];
    if (!photo.dataUrl && photo.file) {
      photo.dataUrl = await fileToDataUrl(photo.file);
    }
    items.push({
      src: photo.dataUrl || photo.url,
      title: fallback(photo.title, photoGuides[index]?.title || "现场照片"),
      desc: fallback(photo.desc, photoGuides[index]?.desc || "现场情况记录。"),
      fileName: photo.fileName,
    });
  }
  return items;
}

function safeFileName(value) {
  return clean(value)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "")
    .slice(0, 80) || "施工日报";
}

function exportBaseName() {
  const company = safeFileName(currentCompanyName());
  const project = safeFileName(valueOf("projectName") || "施工日报");
  const date = safeFileName(valueOf("reportDate") || todayInputValue());
  return `${project}-${date}-${company}施工日报`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function canvasToBlob(canvas, type = "image/png", quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Canvas export failed"));
      }
    }, type, quality);
  });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image render failed"));
    image.src = url;
  });
}

const CANVAS_FONT =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", Arial, sans-serif';
const CANVAS_WIDTH = 900;
const CANVAS_MARGIN = 38;
const CANVAS_GAP = 14;

function canvasFont(size, weight = 400) {
  return `${weight} ${size}px ${CANVAS_FONT}`;
}

function createCanvasState() {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = 6000;
  const context = canvas.getContext("2d");
  context.fillStyle = "#f8faf9";
  context.fillRect(0, 0, canvas.width, canvas.height);
  return { canvas, context };
}

function ensureCanvasHeight(state, bottom) {
  if (bottom <= state.canvas.height - 200) return;
  const nextHeight = Math.ceil(Math.max(bottom + 1200, state.canvas.height * 1.5));
  const nextCanvas = document.createElement("canvas");
  nextCanvas.width = state.canvas.width;
  nextCanvas.height = nextHeight;
  const nextContext = nextCanvas.getContext("2d");
  nextContext.fillStyle = "#f8faf9";
  nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextContext.drawImage(state.canvas, 0, 0);
  state.canvas = nextCanvas;
  state.context = nextContext;
}

function finishCanvas(state, height) {
  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = state.canvas.width;
  finalCanvas.height = Math.ceil(height);
  const finalContext = finalCanvas.getContext("2d");
  finalContext.fillStyle = "#f8faf9";
  finalContext.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
  finalContext.drawImage(state.canvas, 0, 0);
  return finalCanvas;
}

function roundedRectPath(context, x, y, width, height, radius = 12) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function drawBox(state, x, y, width, height, options = {}) {
  ensureCanvasHeight(state, y + height + 40);
  const context = state.context;
  roundedRectPath(context, x, y, width, height, options.radius || 12);
  context.fillStyle = options.fill || "#ffffff";
  context.fill();
  if (options.stroke) {
    context.strokeStyle = options.stroke;
    context.lineWidth = options.lineWidth || 1;
    context.stroke();
  }
  if (options.borderLeft) {
    context.save();
    roundedRectPath(context, x, y, width, height, options.radius || 12);
    context.clip();
    context.fillStyle = options.borderLeft;
    context.fillRect(x, y, options.borderLeftWidth || 6, height);
    context.restore();
  }
}

function setCanvasText(context, size, weight, color) {
  context.font = canvasFont(size, weight);
  context.fillStyle = color;
  context.textBaseline = "top";
}

function wrapCanvasText(context, text, maxWidth) {
  const paragraphs = String(text || "").split("\n");
  const lines = [];
  paragraphs.forEach((paragraph) => {
    const chars = Array.from(paragraph || " ");
    let line = "";
    chars.forEach((char) => {
      const nextLine = line + char;
      if (line && context.measureText(nextLine).width > maxWidth) {
        lines.push(line);
        line = char.trimStart();
      } else {
        line = nextLine;
      }
    });
    lines.push(line);
  });
  return lines;
}

function measureCanvasText(state, text, maxWidth, options = {}) {
  const context = state.context;
  setCanvasText(context, options.size || 24, options.weight || 400, options.color || "#20282a");
  const lines = wrapCanvasText(context, text, maxWidth);
  return {
    lines,
    height: lines.length * (options.lineHeight || Math.ceil((options.size || 24) * 1.55)),
  };
}

function drawCanvasText(state, text, x, y, maxWidth, options = {}) {
  const context = state.context;
  const size = options.size || 24;
  const lineHeight = options.lineHeight || Math.ceil(size * 1.55);
  setCanvasText(context, size, options.weight || 400, options.color || "#20282a");
  const lines = wrapCanvasText(context, text, maxWidth);
  lines.forEach((line, index) => {
    ensureCanvasHeight(state, y + (index + 1) * lineHeight + 40);
    context.fillText(line, x, y + index * lineHeight);
  });
  return y + lines.length * lineHeight;
}

function attentionColors(level) {
  if (level === "danger") {
    return { fill: "#fff2f0", stroke: "#e6a19a", accent: "#c94336", text: "#6c231c" };
  }
  if (level === "warn") {
    return { fill: "#fff8e8", stroke: "#e5b65a", accent: "#d28a12", text: "#5f4212" };
  }
  return { fill: "#ffffff", stroke: "#dfe8e6", accent: "#176b61", text: "#20282a" };
}

function drawCanvasHeader(state, data) {
  const context = state.context;
  const height = 350;
  const gradient = context.createLinearGradient(0, 0, CANVAS_WIDTH, height);
  gradient.addColorStop(0, "#0f4e48");
  gradient.addColorStop(1, "#315f6a");
  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_WIDTH, height);

  drawCanvasText(state, `${data.companyName}｜项目日进度汇报`, CANVAS_MARGIN, 38, CANVAS_WIDTH - CANVAS_MARGIN * 2, {
    size: 22,
    weight: 800,
    color: "#d7ebe7",
    lineHeight: 30,
  });
  drawCanvasText(state, data.projectName, CANVAS_MARGIN, 82, CANVAS_WIDTH - CANVAS_MARGIN * 2, {
    size: 46,
    weight: 900,
    color: "#ffffff",
    lineHeight: 58,
  });
  drawCanvasText(state, `${data.reportDate} · ${data.stage}`, CANVAS_MARGIN, 148, CANVAS_WIDTH - CANVAS_MARGIN * 2, {
    size: 24,
    weight: 700,
    color: "#edf7f5",
    lineHeight: 34,
  });

  const cardWidth = (CANVAS_WIDTH - CANVAS_MARGIN * 2 - CANVAS_GAP) / 2;
  const cards = [
    ["项目经理", data.manager],
    ["现场人数", data.people],
    ["进度状态", data.status],
    ["今日天气", data.weather],
  ];
  cards.forEach(([label, value], index) => {
    const x = CANVAS_MARGIN + (index % 2) * (cardWidth + CANVAS_GAP);
    const y = 198 + Math.floor(index / 2) * 74;
    roundedRectPath(context, x, y, cardWidth, 58, 10);
    context.fillStyle = "rgba(255, 255, 255, 0.1)";
    context.fill();
    context.strokeStyle = "rgba(255, 255, 255, 0.2)";
    context.stroke();
    drawCanvasText(state, label, x + 18, y + 10, cardWidth - 36, {
      size: 17,
      weight: 800,
      color: "#c8dedb",
      lineHeight: 22,
    });
    drawCanvasText(state, value, x + 18, y + 31, cardWidth - 36, {
      size: 22,
      weight: 900,
      color: "#ffffff",
      lineHeight: 24,
    });
  });

  return 390;
}

function drawSectionTitle(state, y, index, title) {
  const context = state.context;
  ensureCanvasHeight(state, y + 70);
  context.fillStyle = "#dcefed";
  roundedRectPath(context, CANVAS_MARGIN, y, 50, 42, 10);
  context.fill();
  drawCanvasText(state, String(index).padStart(2, "0"), CANVAS_MARGIN + 12, y + 8, 40, {
    size: 20,
    weight: 900,
    color: "#0f4e48",
    lineHeight: 24,
  });
  drawCanvasText(state, title, CANVAS_MARGIN + 68, y + 4, CANVAS_WIDTH - CANVAS_MARGIN * 2 - 68, {
    size: 30,
    weight: 900,
    color: "#20282a",
    lineHeight: 38,
  });
  return y + 60;
}

function drawMiniCard(state, x, y, width, label, value, level = "") {
  const colors = attentionColors(level);
  drawBox(state, x, y, width, 76, { fill: colors.fill, stroke: colors.stroke, radius: 10 });
  drawCanvasText(state, label, x + 16, y + 12, width - 32, {
    size: 17,
    weight: 800,
    color: "#6b7779",
    lineHeight: 22,
  });
  drawCanvasText(state, value, x + 16, y + 38, width - 32, {
    size: 22,
    weight: 900,
    color: colors.text,
    lineHeight: 26,
  });
}

function drawMiniGrid(state, y, items) {
  const width = (CANVAS_WIDTH - CANVAS_MARGIN * 2 - CANVAS_GAP) / 2;
  items.forEach((item, index) => {
    const x = CANVAS_MARGIN + (index % 2) * (width + CANVAS_GAP);
    const rowY = y + Math.floor(index / 2) * 88;
    drawMiniCard(state, x, rowY, width, item.label, item.value, item.level);
  });
  return y + Math.ceil(items.length / 2) * 88;
}

function drawParagraphCard(state, y, title, text, level = "") {
  const width = CANVAS_WIDTH - CANVAS_MARGIN * 2;
  const colors = attentionColors(level);
  const body = measureCanvasText(state, text, width - 44, { size: 22, lineHeight: 34 });
  const height = 78 + body.height;
  drawBox(state, CANVAS_MARGIN, y, width, height, {
    fill: colors.fill,
    stroke: colors.stroke,
    borderLeft: colors.accent,
    radius: 12,
  });
  drawCanvasText(state, title, CANVAS_MARGIN + 24, y + 18, width - 48, {
    size: 22,
    weight: 900,
    color: colors.text,
    lineHeight: 28,
  });
  drawCanvasText(state, text, CANVAS_MARGIN + 24, y + 52, width - 48, {
    size: 22,
    weight: 400,
    color: colors.text,
    lineHeight: 34,
  });
  return y + height + CANVAS_GAP;
}

function drawProgressCard(state, y, label, value, level = "", fillClass = "") {
  const width = CANVAS_WIDTH - CANVAS_MARGIN * 2;
  const colors = attentionColors(level);
  drawBox(state, CANVAS_MARGIN, y, width, 96, { fill: colors.fill, stroke: colors.stroke, radius: 12 });
  drawCanvasText(state, label, CANVAS_MARGIN + 20, y + 16, width - 180, {
    size: 21,
    weight: 900,
    color: "#425052",
    lineHeight: 28,
  });
  drawCanvasText(state, progressLabel(value), CANVAS_WIDTH - CANVAS_MARGIN - 120, y + 14, 100, {
    size: 28,
    weight: 900,
    color: colors.text,
    lineHeight: 32,
  });

  const trackX = CANVAS_MARGIN + 20;
  const trackY = y + 60;
  const trackW = width - 40;
  const trackH = 14;
  roundedRectPath(state.context, trackX, trackY, trackW, trackH, 99);
  state.context.fillStyle = "#e6eeee";
  state.context.fill();

  const percent = value === null ? 0 : Math.max(0, Math.min(100, value));
  const gradient = state.context.createLinearGradient(trackX, trackY, trackX + trackW, trackY);
  if (level === "danger") {
    gradient.addColorStop(0, "#c94336");
    gradient.addColorStop(1, "#e66f61");
  } else if (level === "warn") {
    gradient.addColorStop(0, "#d28a12");
    gradient.addColorStop(1, "#e5b65a");
  } else if (fillClass === "weekly") {
    gradient.addColorStop(0, "#315f8a");
    gradient.addColorStop(1, "#a06b1a");
  } else {
    gradient.addColorStop(0, "#176b61");
    gradient.addColorStop(1, "#315f8a");
  }
  roundedRectPath(state.context, trackX, trackY, (trackW * percent) / 100, trackH, 99);
  state.context.fillStyle = gradient;
  state.context.fill();
  return y + 110;
}

function drawWorkCard(state, y, title, fields, note, level = "") {
  const width = CANVAS_WIDTH - CANVAS_MARGIN * 2;
  const colors = attentionColors(level);
  const fieldTexts = fields.map((field) => `${field.label}：${field.value}`);
  const fieldMeasures = fieldTexts.map((text) =>
    measureCanvasText(state, text, width - 40, { size: 21, weight: 700, lineHeight: 30 })
  );
  const noteMeasure = note ? measureCanvasText(state, note, width - 40, { size: 21, lineHeight: 32 }) : { height: 0 };
  const fieldHeight = fieldMeasures.reduce((sum, item) => sum + item.height + 12, 0);
  const height = 72 + fieldHeight + noteMeasure.height + (note ? 16 : 0);
  drawBox(state, CANVAS_MARGIN, y, width, height, { fill: colors.fill, stroke: colors.stroke, radius: 12 });
  drawCanvasText(state, title, CANVAS_MARGIN + 20, y + 18, width - 40, {
    size: 24,
    weight: 900,
    color: colors.accent,
    lineHeight: 30,
  });
  let cursor = y + 58;
  fieldTexts.forEach((text, index) => {
    drawCanvasText(state, text, CANVAS_MARGIN + 20, cursor, width - 40, {
      size: 21,
      weight: 700,
      color: colors.text,
      lineHeight: 30,
    });
    cursor += fieldMeasures[index].height + 12;
  });
  if (note) {
    drawCanvasText(state, note, CANVAS_MARGIN + 20, cursor, width - 40, {
      size: 21,
      weight: 400,
      color: "#4f5a5c",
      lineHeight: 32,
    });
  }
  return y + height + CANVAS_GAP;
}

function drawTomorrowCard(state, y, index, task, people) {
  const width = CANVAS_WIDTH - CANVAS_MARGIN * 2;
  drawBox(state, CANVAS_MARGIN, y, width, 78, { fill: "#ffffff", stroke: "#dfe8e6", radius: 12 });
  drawCanvasText(state, numbered(index), CANVAS_MARGIN + 20, y + 20, 42, {
    size: 24,
    weight: 900,
    color: "#176b61",
    lineHeight: 32,
  });
  drawCanvasText(state, task, CANVAS_MARGIN + 68, y + 14, width - 88, {
    size: 23,
    weight: 900,
    color: "#20282a",
    lineHeight: 30,
  });
  drawCanvasText(state, people, CANVAS_MARGIN + 68, y + 44, width - 88, {
    size: 19,
    weight: 700,
    color: "#657174",
    lineHeight: 24,
  });
  return y + 92;
}

function drawPhotoCard(state, y, photo, image, index) {
  const width = CANVAS_WIDTH - CANVAS_MARGIN * 2;
  const captionTitle = `${numbered(index)} ${fallback(photo.title, "现场照片")}`;
  const descMeasure = measureCanvasText(state, photo.desc, width - 42, { size: 21, lineHeight: 32 });
  const titleMeasure = measureCanvasText(state, captionTitle, width - 42, {
    size: 25,
    weight: 900,
    lineHeight: 32,
  });
  const imageHeight = image
    ? Math.max(260, Math.round((width * image.naturalHeight) / image.naturalWidth))
    : 260;
  const height = imageHeight + titleMeasure.height + descMeasure.height + 58;
  drawBox(state, CANVAS_MARGIN, y, width, height, { fill: "#ffffff", stroke: "#d7e2e0", radius: 12 });

  const context = state.context;
  ensureCanvasHeight(state, y + height + 40);
  context.save();
  roundedRectPath(context, CANVAS_MARGIN, y, width, imageHeight, 12);
  context.clip();
  context.fillStyle = "#edf2f1";
  context.fillRect(CANVAS_MARGIN, y, width, imageHeight);
  if (image) {
    context.drawImage(image, CANVAS_MARGIN, y, width, imageHeight);
  } else {
    drawCanvasText(state, "现场照片待上传", CANVAS_MARGIN + 280, y + 110, width - 560, {
      size: 24,
      weight: 900,
      color: "#657174",
      lineHeight: 32,
    });
  }
  context.restore();

  const captionY = y + imageHeight + 18;
  drawCanvasText(state, captionTitle, CANVAS_MARGIN + 20, captionY, width - 40, {
    size: 25,
    weight: 900,
    color: "#20282a",
    lineHeight: 32,
  });
  drawCanvasText(state, photo.desc, CANVAS_MARGIN + 20, captionY + titleMeasure.height + 8, width - 40, {
    size: 21,
    color: "#4f5a5c",
    lineHeight: 32,
  });
  return y + height + CANVAS_GAP;
}

function drawCanvasReport(data, photoImages) {
  const state = createCanvasState();
  let y = drawCanvasHeader(state, data);

  y = drawSectionTitle(state, y, 1, "今日现场概览");
  y = drawCanvasText(state, buildOverviewSentence(data), CANVAS_MARGIN, y, CANVAS_WIDTH - CANVAS_MARGIN * 2, {
    size: 24,
    color: "#2e393b",
    lineHeight: 38,
  }) + 18;
  y = drawMiniGrid(state, y, [
    { label: "作业面状态", value: data.workfaceStatus, level: statusAttentionLevel(data.workfaceStatus) },
    { label: "材料状态", value: data.materialStatus, level: statusAttentionLevel(data.materialStatus) },
    { label: "安全文明", value: data.safetyStatus, level: statusAttentionLevel(data.safetyStatus) },
    { label: "现场人数", value: data.people },
  ]) + 8;
  if (data.overviewPeople.length) {
    data.overviewPeople.forEach((item, index) => {
      y = drawWorkCard(
        state,
        y,
        `${numbered(index)} ${fallback(item.role, "工种/班组待补充")}`,
        [
          { label: "人数", value: clean(item.people) ? `${clean(item.people)}人` : "待填写" },
          { label: "作业区域/任务", value: fallback(item.area, "待填写") },
        ],
        ""
      );
    });
  } else {
    y = drawParagraphCard(state, y, "现场人员配置待补充", "补充班组、人数和作业任务后，客户可以更清楚看到现场组织情况。");
  }

  y += 18;
  const scheduleLevel = scheduleAttentionLevel(data);
  y = drawSectionTitle(state, y, 2, "工期计划与三层进度");
  y = drawMiniGrid(state, y, [
    { label: "总工期计划", value: data.plannedPeriod },
    { label: "当前阶段", value: data.stage },
    { label: "阶段目标", value: data.phaseGoal },
    { label: "阶段计划完成时间", value: data.phasePlanEnd },
    { label: "执行判断", value: data.scheduleCompare, level: scheduleLevel },
  ]) + 8;
  y = drawProgressCard(state, y, "总工期完成比例", data.totalProgress, scheduleLevel);
  y = drawProgressCard(state, y, "当前阶段完成比例", data.phaseProgress, scheduleLevel);
  y = drawProgressCard(state, y, "本周计划完成比例", data.weeklyProgress, scheduleLevel, "weekly");
  y = drawParagraphCard(state, y, "本周目标", data.weeklyFocus, scheduleLevel);
  y = drawParagraphCard(state, y, "进度说明", data.scheduleNote, scheduleLevel);
  if (data.weeklyTasks.length) {
    data.weeklyTasks.forEach((item, index) => {
      const level = textAttentionLevel([item.status, item.note]);
      y = drawWorkCard(
        state,
        y,
        `${numbered(index)} ${fallback(item.task, "本周计划待填写")}`,
        [
          { label: "计划节点", value: fallback(item.target, "待填写") },
          { label: "当前状态", value: fallback(item.status, "待填写") },
        ],
        fallback(item.note, "执行说明待填写"),
        level
      );
    });
  }

  y += 18;
  y = drawSectionTitle(state, y, 3, "今日完成内容");
  if (data.completions.length) {
    data.completions.forEach((item, index) => {
      y = drawWorkCard(
        state,
        y,
        `${numbered(index)} ${fallback(item.title, "施工内容待填写")}`,
        [
          { label: "施工区域", value: fallback(item.area, "待填写") },
          { label: "完成情况", value: fallback(item.progress, "待填写") },
        ],
        fallback(item.note, "现场说明待填写"),
        textAttentionLevel([item.progress, item.note])
      );
    });
  } else {
    y = drawParagraphCard(state, y, "完成内容待补充", "补充今日完成事项后，客户可以更直观看到每日推进情况。");
  }

  y += 18;
  y = drawSectionTitle(state, y, 4, "现场照片说明");
  if (data.photos.length) {
    data.photos.forEach((photo, index) => {
      y = drawPhotoCard(state, y, photo, photoImages[index], index);
    });
  } else {
    y = drawPhotoCard(state, y, { title: "现场照片待上传", desc: "建议上传6张照片，包含全景、主施工面、施工细节、隐蔽节点、材料保护和明日作业面。" }, null, 0);
  }

  y += 18;
  y = drawSectionTitle(state, y, 5, "明日工作安排");
  if (data.tomorrowTasks.length) {
    data.tomorrowTasks.forEach((item, index) => {
      const peopleText = clean(item.people) ? `计划${clean(item.people)}人` : "计划人数待填写";
      y = drawTomorrowCard(state, y, index, fallback(item.task, "明日工作待填写"), peopleText);
    });
  } else {
    y = drawParagraphCard(state, y, "明日工作待补充", "补充明日工作安排后，客户可以提前了解下一步施工节奏。");
  }
  y = drawParagraphCard(state, y, "明日重点", data.tomorrowFocus);

  let sectionIndex = 6;
  if (data.includeConfirmSection) {
    y += 18;
    y = drawSectionTitle(state, y, sectionIndex, "客户需确认事项");
    sectionIndex += 1;
    y = data.hasConfirm
      ? drawParagraphCard(
          state,
          y,
          data.confirmItem,
          `最晚确认时间：${data.confirmDeadline}\n如未确认影响：${data.confirmImpact}`,
          textAttentionLevel([data.confirmItem, data.confirmImpact])
        )
      : drawParagraphCard(state, y, "今日暂无需客户确认事项", "后续如涉及材料、点位、尺寸或变更，我们会提前在群内说明确认内容、确认时间及对工期的影响。");
  }

  if (data.includeRiskSection) {
    y += 18;
    y = drawSectionTitle(state, y, sectionIndex, "问题与风险提示");
    sectionIndex += 1;
    y = data.hasRisk
      ? drawParagraphCard(
          state,
          y,
          data.riskProblem,
          `影响：${data.riskImpact}\n解决方案：${data.riskSolution}\n责任人：${data.riskOwner}\n计划解决时间：${data.riskDate}`,
          textAttentionLevel([data.riskProblem, data.riskImpact, data.riskSolution])
        )
      : drawParagraphCard(state, y, "今日暂无新增问题", "现场推进正常。");
  }

  y += 18;
  ensureCanvasHeight(state, y + 160);
  state.context.fillStyle = "#172f32";
  state.context.fillRect(0, y, CANVAS_WIDTH, 150);
  drawCanvasText(state, data.summary, CANVAS_MARGIN, y + 32, CANVAS_WIDTH - CANVAS_MARGIN * 2, {
    size: 23,
    color: "#eef7f5",
    lineHeight: 36,
  });
  y += 150;

  return finishCanvas(state, y);
}

async function renderDocumentCanvas(photoItems) {
  const data = getReportData(photoItems);
  const photoImages = await Promise.all(data.photos.map((photo) => loadImage(photo.src).catch(() => null)));
  return drawCanvasReport(data, photoImages);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function dataUrlToBytes(dataUrl) {
  return base64ToBytes(dataUrl.split(",")[1] || "");
}

function pdfNumber(value) {
  return Number(value.toFixed(2)).toString();
}

function buildPdfFromCanvas(canvas) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 18;
  const imageWidth = pageWidth - margin * 2;
  const imageMaxHeight = pageHeight - margin * 2;
  const sliceHeight = Math.max(1, Math.floor((imageMaxHeight / imageWidth) * canvas.width));
  const sliceCanvas = document.createElement("canvas");
  const sliceContext = sliceCanvas.getContext("2d");
  const pages = [];

  sliceCanvas.width = canvas.width;
  for (let y = 0; y < canvas.height; y += sliceHeight) {
    const height = Math.min(sliceHeight, canvas.height - y);
    sliceCanvas.height = height;
    sliceContext.fillStyle = "#ffffff";
    sliceContext.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    sliceContext.drawImage(canvas, 0, y, canvas.width, height, 0, 0, canvas.width, height);
    pages.push({
      width: sliceCanvas.width,
      height,
      bytes: dataUrlToBytes(sliceCanvas.toDataURL("image/jpeg", 0.92)),
      drawHeight: (height / canvas.width) * imageWidth,
    });
  }

  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let offset = 0;

  function pushString(value) {
    const bytes = encoder.encode(value);
    chunks.push(bytes);
    offset += bytes.length;
  }

  function pushBytes(bytes) {
    chunks.push(bytes);
    offset += bytes.length;
  }

  function addObject(objectNumber, parts) {
    offsets[objectNumber] = offset;
    pushString(`${objectNumber} 0 obj\n`);
    parts.forEach((part) => {
      if (typeof part === "string") {
        pushString(part);
      } else {
        pushBytes(part);
      }
    });
    pushString("\nendobj\n");
  }

  pushString("%PDF-1.4\n");
  addObject(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  addObject(2, [
    `<< /Type /Pages /Kids [${pages
      .map((_, index) => `${3 + index * 3} 0 R`)
      .join(" ")}] /Count ${pages.length} >>`,
  ]);

  pages.forEach((page, index) => {
    const pageObject = 3 + index * 3;
    const contentObject = pageObject + 1;
    const imageObject = pageObject + 2;
    const imageName = `Im${index + 1}`;
    const x = margin;
    const y = pageHeight - margin - page.drawHeight;
    const command = `q ${pdfNumber(imageWidth)} 0 0 ${pdfNumber(page.drawHeight)} ${pdfNumber(x)} ${pdfNumber(y)} cm /${imageName} Do Q`;
    const contentStream = `${command}\n`;

    addObject(pageObject, [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfNumber(pageWidth)} ${pdfNumber(pageHeight)}] /Resources << /ProcSet [/PDF /ImageC] /XObject << /${imageName} ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`,
    ]);
    addObject(contentObject, [`<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream`]);
    addObject(imageObject, [
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`,
      page.bytes,
      "\nendstream",
    ]);
  });

  const startXref = offset;
  const objectCount = 2 + pages.length * 3;
  pushString(`xref\n0 ${objectCount + 1}\n`);
  pushString("0000000000 65535 f \n");
  for (let objectNumber = 1; objectNumber <= objectCount; objectNumber += 1) {
    pushString(`${String(offsets[objectNumber]).padStart(10, "0")} 00000 n \n`);
  }
  pushString(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`);

  return new Blob(chunks, { type: "application/pdf" });
}

async function runExport(buttonSelector, loadingText, successText, task) {
  const button = document.querySelector(buttonSelector);
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = loadingText;

  try {
    await task();
    showToast(successText);
  } catch {
    showToast("导出失败，请重新选择照片后再试");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function exportLongImage() {
  await runExport("#exportImageBtn", "生成中", "长图已导出", async () => {
    const photoItems = await exportPhotoItems();
    const canvas = await renderDocumentCanvas(photoItems);
    const blob = await canvasToBlob(canvas, "image/png");
    downloadBlob(blob, `${exportBaseName()}-长图.png`);
  });
}

async function exportPdf() {
  await runExport("#exportPdfBtn", "生成中", "PDF已导出", async () => {
    const photoItems = await exportPhotoItems();
    const canvas = await renderDocumentCanvas(photoItems);
    const blob = buildPdfFromCanvas(canvas);
    downloadBlob(blob, `${exportBaseName()}.pdf`);
  });
}

async function exportDocument() {
  const project = valueOf("projectName") || "施工日报";
  const date = valueOf("reportDate") || todayInputValue();
  const company = currentCompanyName();
  const exportButton = document.querySelector("#exportDocBtn");
  exportButton.disabled = true;
  exportButton.textContent = "生成中";

  try {
    const photoItems = await exportPhotoItems();
    const documentHtml = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(project)}｜${escapeHtml(company)}施工日报</title>
    <style>${standaloneDocumentCss()}</style>
  </head>
  <body>
    <main class="document-preview">
      ${buildDocumentMarkup(photoItems)}
    </main>
  </body>
</html>`;
    const blob = new Blob([documentHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(project)}-${safeFileName(date)}-${safeFileName(company)}施工日报.html`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("精美图文文档已导出");
  } catch {
    showToast("导出失败，请重新选择照片后再试");
  } finally {
    exportButton.disabled = false;
    exportButton.textContent = "导出文档";
  }
}

function switchPreviewTab(tabName) {
  document.querySelectorAll("[data-preview-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.previewTab === tabName);
  });
  document
    .querySelector("#documentPreviewPanel")
    .classList.toggle("is-active", tabName === "document");
  document.querySelector("#textPreviewPanel").classList.toggle("is-active", tabName === "text");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1800);
}

function loadSample() {
  const sample = {
    projectName: "云栖谷1期15栋",
    reportDate: "2026-04-30",
    manager: "代府诚",
    weather: "阴",
    people: "5",
    stage: "机电安装阶段",
    status: "正常推进",
    workfaceStatus: "正常展开",
    materialStatus: "材料到位",
    safetyStatus: "正常",
    plannedPeriod: "2026年4月20日-2026年6月30日",
    totalProgress: "16",
    phaseGoal: "完成机电隐蔽工程施工",
    phasePlanEnd: "5月20日",
    scheduleCompare: "按计划执行",
    phaseProgress: "40",
    weeklyProgress: "45",
    weeklyFocus:
      "本周重点完成1层桥架及C型钢支座施工，同步推进2层新风管施工，为后续机电隐蔽节点验收做准备。",
    scheduleNote:
      "当前施工内容与本阶段计划匹配，五一期间施工限制已纳入排期调整，整体仍按节点计划推进。",
    tomorrowFocus:
      "继续推进1层桥架及支座施工，并同步安排2层新风管施工，为后续机电系统完善做好准备。",
    summary:
      "今日现场整体推进正常。后续我们将继续按照施工计划推进，并持续关注机电隐蔽节点、现场秩序、材料衔接及安全文明施工。",
  };

  Object.entries(sample).forEach(([id, value]) => setValue(id, value));

  overviewPeople = [
    {
      id: createId(),
      role: "电工班组",
      people: "4",
      area: "1层桥架定位、安装及C型钢支座施工",
    },
    {
      id: createId(),
      role: "新风施工人员",
      people: "1",
      area: "现场作业面协调及明日2层新风管施工准备",
    },
  ];
  syncPeopleFromOverview();

  completions = [
    {
      id: createId(),
      title: "1层桥架施工",
      area: "1层",
      progress: "进行中，约完成40%",
      note: "今日主要完成部分桥架定位、安装及固定工作，后续将继续推进剩余区域施工。",
    },
    {
      id: createId(),
      title: "C型钢支座施工",
      area: "1层",
      progress: "进行中",
      note: "C型钢支座作为桥架安装的基础支撑结构，今日已完成部分安装，为后续桥架稳定固定提供基础。",
    },
  ];

  weeklyTasks = [
    {
      id: createId(),
      task: "1层桥架及C型钢支座施工",
      target: "本周完成主要区域安装",
      status: "按计划推进",
      note: "今日完成内容属于本周计划内工作，当前推进节奏与阶段节点匹配。",
    },
    {
      id: createId(),
      task: "2层新风管施工",
      target: "本周启动并完成首段安装",
      status: "计划明日启动",
      note: "明日安排1名施工人员进场推进，为后续机电系统衔接做准备。",
    },
    {
      id: createId(),
      task: "机电隐蔽节点检查准备",
      target: "本阶段节点验收前完成过程检查",
      status: "持续跟进",
      note: "项目经理将持续关注桥架固定、支座稳定性、管线衔接及现场安全文明。",
    },
  ];

  tomorrowTasks = [
    { id: createId(), task: "2层新风管施工", people: "1" },
    { id: createId(), task: "1层桥架及C型钢支座继续施工", people: "4" },
  ];

  setChecked("hasConfirm", false);
  setChecked("hasRisk", true);
  includeConfirmSection = true;
  includeRiskSection = true;
  setValue("riskProblem", "五一期间小区存在施工限制");
  setValue("riskImpact", "部分施工内容需根据物业要求合理安排。");
  setValue("riskSolution", "根据物业要求合理安排可施工内容，尽量减少对后续计划的影响。");
  setValue("riskOwner", "项目经理");
  setValue("riskDate", "5月5日");

  renderOverviewPeopleList();
  renderWeeklyPlanList();
  renderCompletionList();
  renderTomorrowList();
  updateConditionalFields();
  updateOptionalSections();
  updateReport();
  showToast("示例内容已套用");
}

function clearDraft() {
  if (!window.confirm("确定清空当前日报草稿吗？")) return;
  photos.forEach((photo) => URL.revokeObjectURL(photo.url));
  photos = [];
  localStorage.removeItem(STORAGE_KEY);
  applyDraft(null);
  showToast("草稿已清空");
}

function bindEvents() {
  reportForm.addEventListener("input", () => updateReport());
  reportForm.addEventListener("change", () => {
    updateConditionalFields();
    updateReport();
  });

  overviewPeopleList.addEventListener("input", (event) => {
    updateCollectionItem(event, overviewPeople);
    syncPeopleFromOverview();
    updateReport();
  });

  overviewPeopleList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='remove-overview-person']");
    if (!button) return;
    const item = button.closest("[data-id]");
    overviewPeople = removeCollectionItem(item.dataset.id, overviewPeople, blankOverviewPerson);
    syncPeopleFromOverview();
    renderOverviewPeopleList();
    updateReport();
  });

  completionList.addEventListener("input", (event) => {
    updateCollectionItem(event, completions);
  });

  completionList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='remove-completion']");
    if (!button) return;
    const item = button.closest("[data-id]");
    completions = removeCollectionItem(item.dataset.id, completions, blankCompletion);
    renderCompletionList();
    updateReport();
  });

  weeklyPlanList.addEventListener("input", (event) => {
    updateCollectionItem(event, weeklyTasks);
  });

  weeklyPlanList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='remove-weekly']");
    if (!button) return;
    const item = button.closest("[data-id]");
    weeklyTasks = removeCollectionItem(item.dataset.id, weeklyTasks, blankWeeklyTask);
    renderWeeklyPlanList();
    updateReport();
  });

  tomorrowList.addEventListener("input", (event) => {
    updateCollectionItem(event, tomorrowTasks);
  });

  tomorrowList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='remove-tomorrow']");
    if (!button) return;
    const item = button.closest("[data-id]");
    tomorrowTasks = removeCollectionItem(item.dataset.id, tomorrowTasks, blankTomorrowTask);
    renderTomorrowList();
    updateReport();
  });

  document.querySelector("#addCompletionBtn").addEventListener("click", () => {
    completions.push(blankCompletion());
    renderCompletionList();
    updateReport();
  });

  document.querySelector("#addOverviewPersonBtn").addEventListener("click", () => {
    overviewPeople.push(blankOverviewPerson());
    syncPeopleFromOverview();
    renderOverviewPeopleList();
    updateReport();
  });

  document.querySelector("#addWeeklyBtn").addEventListener("click", () => {
    weeklyTasks.push(blankWeeklyTask());
    renderWeeklyPlanList();
    updateReport();
  });

  document.querySelector("#addTomorrowBtn").addEventListener("click", () => {
    tomorrowTasks.push(blankTomorrowTask());
    renderTomorrowList();
    updateReport();
  });

  document.querySelector("#toggleConfirmSectionBtn").addEventListener("click", () => {
    includeConfirmSection = !includeConfirmSection;
    updateOptionalSections();
    updateReport();
  });

  document.querySelector("#toggleRiskSectionBtn").addEventListener("click", () => {
    includeRiskSection = !includeRiskSection;
    updateOptionalSections();
    updateReport();
  });

  photoInput.addEventListener("change", handlePhotoUpload);
  photoList.addEventListener("input", handlePhotoInput);
  photoList.addEventListener("click", handlePhotoClick);

  document.querySelector("#copyBtn").addEventListener("click", copyReport);
  document.querySelector("#downloadBtn").addEventListener("click", downloadReport);
  document.querySelector("#exportImageBtn").addEventListener("click", exportLongImage);
  document.querySelector("#exportPdfBtn").addEventListener("click", exportPdf);
  document.querySelector("#exportDocBtn").addEventListener("click", exportDocument);
  document.querySelectorAll("[data-preview-tab]").forEach((button) => {
    button.addEventListener("click", () => switchPreviewTab(button.dataset.previewTab));
  });
  document.querySelector("#sampleBtn").addEventListener("click", loadSample);
  document.querySelector("#clearBtn").addEventListener("click", clearDraft);
}

function init() {
  let draft = null;
  try {
    draft = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    draft = null;
  }

  applyDraft(draft);
  bindEvents();
}

init();
