export const GUIDE_NOTE = "这是四项日常偏好自选，方便生成娱乐解读，不是心理测评。";

export const DIMENSIONS = [
  {
    id: "EI",
    prompt: "忙完一天之后，你更想怎么恢复精神？",
    options: [
      { letter: "E", text: "找人说说话，热闹会让我缓过来" },
      { letter: "I", text: "自己待一会儿，安静会让我缓过来" },
    ],
  },
  {
    id: "SN",
    prompt: "接触一件没见过的事，你先留意哪一边？",
    options: [
      { letter: "S", text: "眼前看得见的事实和具体步骤" },
      { letter: "N", text: "它以后可能展开的样子" },
    ],
  },
  {
    id: "TF",
    prompt: "两个人卡住了，你通常先做哪一步？",
    options: [
      { letter: "T", text: "先把利弊和原因说清楚" },
      { letter: "F", text: "先让彼此的感受被接住" },
    ],
  },
  {
    id: "JP",
    prompt: "忽然空出一天，你更习惯怎么过？",
    options: [
      { letter: "J", text: "先有个大致安排，心里踏实" },
      { letter: "P", text: "先留出空白，走到哪算哪" },
    ],
  },
];

export function codeFromChoices(choices) {
  const letters = [];
  for (let i = 0; i < DIMENSIONS.length; i += 1) {
    const letter = choices[DIMENSIONS[i].id];
    if (letter !== "E" && letter !== "I" && letter !== "S" && letter !== "N" && letter !== "T" && letter !== "F" && letter !== "J" && letter !== "P") {
      return null;
    }
    letters.push(letter);
  }
  return letters.join("");
}
