// 16 型人格选择区的展开/折叠判定。
export function typeCollapsed(who) {
  return Boolean(who.typeCode) && !who.typeEditing && !who.choosing;
}
