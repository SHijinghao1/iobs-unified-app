// 日志时间格式化工具
export const formatDisplayTime = (val: string) => {
  if (!val) return val;
  const m = val.match(/^(\d{4})\.(\d{2})\.(\d{2})-(\d{2}:\d{2}:\d{2})(\.\d+)?$/);
  if (m) {
    return `${m[1]}-${m[2]}-${m[3]} ${m[4]}`;
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const HH = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
  }
  return val;
};

export const formatApiDate = (d: Date) => {
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const HH = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}.${MM}.${dd}-${HH}:${mm}:${ss}`;
};

export const apiDateToInput = (apiDate: string) => {
  if (!apiDate) return '';
  const parts = apiDate.split('-');
  if (parts.length !== 2) return apiDate;
  return `${parts[0].replace(/\./g, '-')}T${parts[1]}`;
};

export const inputToApiDate = (inputDate: string) => {
  if (!inputDate) return '';
  const parts = inputDate.split('T');
  if (parts.length !== 2) return inputDate;
  const time = parts[1].length === 5 ? `${parts[1]}:00` : parts[1];
  return `${parts[0].replace(/-/g, '.')}-${time}`;
};

export const formatChartTimestamp = (val: any) => {
  if (typeof val === "string") {
    let d = new Date(val);
    if (isNaN(d.getTime())) {
      const parts = val.split("-");
      if (parts.length >= 2) {
        const datePart = parts[0].replace(/\./g, "-");
        const timePart = parts[1];
        d = new Date(`${datePart}T${timePart}`);
      }
    }

    if (!isNaN(d.getTime())) {
      const HH = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      return `${HH}:${mm}:${ss}`;
    }
    if (val.includes("T")) {
      return val.split("T")[1].split(".")[0];
    }
    if (val.includes("-")) {
      return val.split("-").pop()?.split(".")[0] || val;
    }
  }
  return val;
};
