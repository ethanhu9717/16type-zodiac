export const GUIDE_NOTE = "这是四组日常偏好小问，方便生成娱乐解读，不是心理测评。";

export const DIMENSIONS = [
  {
    id: "EI",
    questions: [
      {
        id: "EI1",
        prompt: "忙完一天之后，你更想怎么恢复精神？",
        options: [
          { letter: "E", text: "找人说说话，热闹会让我缓过来" },
          { letter: "I", text: "自己待一会儿，安静会让我缓过来" },
        ],
      },
      {
        id: "EI2",
        prompt: "到了一个新环境，你更常怎么做？",
        options: [
          { letter: "E", text: "先跟周围人搭上话，慢慢就熟了" },
          { letter: "I", text: "先在旁边观察，等熟悉了再开口" },
        ],
      },
      {
        id: "EI3",
        prompt: "一场聚会结束，你的感受更接近？",
        options: [
          { letter: "E", text: "意犹未尽，还想再待一会儿" },
          { letter: "I", text: "终于可以一个人松口气了" },
        ],
      },
    ],
  },
  {
    id: "SN",
    questions: [
      {
        id: "SN1",
        prompt: "接触一件没见过的事，你先留意哪一边？",
        options: [
          { letter: "S", text: "眼前看得见的事实和具体步骤" },
          { letter: "N", text: "它以后可能展开的样子" },
        ],
      },
      {
        id: "SN2",
        prompt: "别人给你讲一件事，你更想知道？",
        options: [
          { letter: "S", text: "具体是什么时候、怎么发生的" },
          { letter: "N", text: "它背后是什么意思、会怎样" },
        ],
      },
      {
        id: "SN3",
        prompt: "面对一个抽象的概念，你更习惯？",
        options: [
          { letter: "S", text: "找个具体的例子才踏实" },
          { letter: "N", text: "顺着它往下想挺有意思" },
        ],
      },
    ],
  },
  {
    id: "TF",
    questions: [
      {
        id: "TF1",
        prompt: "两个人卡住了，你通常先做哪一步？",
        options: [
          { letter: "T", text: "先把利弊和原因说清楚" },
          { letter: "F", text: "先让彼此的感受被接住" },
        ],
      },
      {
        id: "TF2",
        prompt: "朋友跟你倒苦水，你的第一反应是？",
        options: [
          { letter: "T", text: "帮他想办法、给建议" },
          { letter: "F", text: "先接住他的情绪，陪着他" },
        ],
      },
      {
        id: "TF3",
        prompt: "做选择时，哪种更让你为难？",
        options: [
          { letter: "T", text: "怕想得不够周全、不够公平" },
          { letter: "F", text: "怕伤了和气、让人失望" },
        ],
      },
    ],
  },
  {
    id: "JP",
    questions: [
      {
        id: "JP1",
        prompt: "忽然空出一天，你更习惯怎么过？",
        options: [
          { letter: "J", text: "先有个大致安排，心里踏实" },
          { letter: "P", text: "先留出空白，走到哪算哪" },
        ],
      },
      {
        id: "JP2",
        prompt: "计划好的事临时有变，你通常？",
        options: [
          { letter: "J", text: "有点烦躁，想把计划拉回来" },
          { letter: "P", text: "顺势调整，看情况再定" },
        ],
      },
      {
        id: "JP3",
        prompt: "你的桌面或房间，更接近哪种？",
        options: [
          { letter: "J", text: "东西各有位置，大致整齐" },
          { letter: "P", text: "随手放，自己找得到就行" },
        ],
      },
    ],
  },
];

// 拍平后的题目列表，供向导逐题渲染；dimIndex 用于把进度点映射到 4 个维度。
export const QUESTIONS = [];
for (let d = 0; d < DIMENSIONS.length; d += 1) {
  const dim = DIMENSIONS[d];
  for (let q = 0; q < dim.questions.length; q += 1) {
    const question = dim.questions[q];
    QUESTIONS.push({ ...question, dimension: dim.id, dimIndex: d });
  }
}

function validLetter(letter) {
  return letter === "E" || letter === "I" || letter === "S" || letter === "N" ||
    letter === "T" || letter === "F" || letter === "J" || letter === "P";
}

export function codeFromChoices(choices) {
  const letters = [];
  for (let d = 0; d < DIMENSIONS.length; d += 1) {
    const dim = DIMENSIONS[d];
    const left = dim.questions[0].options[0].letter;
    const right = dim.questions[0].options[1].letter;
    let leftVotes = 0;
    let rightVotes = 0;
    for (let q = 0; q < dim.questions.length; q += 1) {
      const letter = choices[dim.questions[q].id];
      if (!validLetter(letter)) return null;
      if (letter === left) leftVotes += 1;
      else if (letter === right) rightVotes += 1;
      else return null;
    }
    letters.push(leftVotes > rightVotes ? left : right);
  }
  return letters.join("");
}
