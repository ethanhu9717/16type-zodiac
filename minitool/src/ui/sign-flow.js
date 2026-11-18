// 星座选择区的展开/折叠判定。
// resolveBirthday 由页面传入（birthdayResult），只在生日查询模式下调用。
export function signReady(who, resolveBirthday) {
  if (who.signInput === "date") {
    if (who.month === "" || who.day === "") return false;
    return resolveBirthday(who).state === "ready";
  }
  return Boolean(who.signKey);
}

export function signCollapsed(who, resolveBirthday) {
  return !who.signEditing && signReady(who, resolveBirthday);
}
