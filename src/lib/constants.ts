/** 工种选项 */
export const CRAFT_TYPES = [
  "喷漆工",
  "打磨工",
  "除锈工",
  "涂装工",
  "焊工",
  "电工",
  "钳工",
  "架子工",
  "起重工",
  "安全员",
  "质检员",
  "其他",
] as const

/** 员工级别 */
export const WORKER_LEVELS = [
  "高级技师",
  "技师",
  "高级工",
  "中级工",
  "初级工",
  "学徒",
] as const

/** 船舶类型 */
export const SHIP_TYPES = [
  "散货船",
  "油轮",
  "集装箱船",
  "化学品船",
  "液化气船",
  "客滚船",
  "工程船",
  "军舰",
  "其他",
] as const

/** 船舶状态 */
export const SHIP_STATUS_MAP = {
  docked: { label: "坞内", color: "#E74C3C" },
  at_berth: { label: "靠泊", color: "#F39C12" },
  at_sea: { label: "在航", color: "#2ECC71" },
  maintenance: { label: "维修", color: "#9B59B6" },
} as const

/** 码头设施状态 */
export const DOCK_STATUS_MAP = {
  occupied: { label: "占用", color: "#E74C3C" },
  available: { label: "空闲", color: "#2ECC71" },
  maintenance: { label: "维护", color: "#F39C12" },
} as const

/** 处罚分类 */
export const PUNISHMENT_CATEGORIES = {
  normal: "普通处罚",
  high_voltage: "高压线处罚",
} as const

/** 外板区域选项 */
export const EXTERNAL_PLATE_AREAS = [
  "船首",
  "船尾",
  "左舷",
  "右舷",
  "船底",
  "水线间",
  "干舷",
  "甲板",
  "上层建筑",
] as const

/** 水刀工程项目 */
export const WATER_JET_PROJECTS = [
  "船首水刀除锈",
  "船底水刀清理",
  "船尾水刀除锈",
  "左舷水刀清理",
  "右舷水刀清理",
  "甲板水刀除锈",
  "水线间水刀",
  "上层建筑水刀",
] as const

/** 分页默认值 */
export const DEFAULT_PAGE_SIZE = 20
