// ============================================
// 心岛计划 — Shared Scoring Module (Beta 0.9.9.2)
// Extracted from app.js for audit use.
// All data & functions are identical to the live product.
// 12 core types + 8 branch types, pool filtering supported.
// ============================================

// ============================================
// 1. 36 CANONICAL SCENES
// ============================================
export const scenes = [
  // ===== 靠近海岸 (CL) — scenes 1-3 =====
  { id:'scene-01', location:'靠近海岸', dimension:'CL', chapter:'启航',
    title:'漂流瓶里的信', text:'你在沙滩上发现一个漂流瓶，瓶中信纸泛黄，隐约能看见字迹。海风在耳边低语。',
    options:[
      { id:'A', text:'立刻打开瓶子，迫不及待读信', score:100, memoryTag:'主动迎接每一份来自远方的问候' },
      { id:'B', text:'小心地打开，先在手中感受瓶身的温度', score:67, memoryTag:'带着珍惜靠近每一个故事' },
      { id:'C', text:'犹豫了一下才打开，不确定是否该窥探别人的心事', score:33, memoryTag:'在靠近之前需要片刻准备' },
      { id:'D', text:'把瓶子放回海里，有些故事不该被打扰', score:0, memoryTag:'尊重每一份留在海上的秘密' }
    ]},
  { id:'scene-02', location:'靠近海岸', dimension:'CL', chapter:'启航',
    title:'两个人影', text:'远处沙滩上，两个身影并肩坐着看海。夕阳把他们的轮廓镀成金色。',
    options:[
      { id:'A', text:'走过去坐在他们旁边，想分享这一刻', score:100, memoryTag:'天然地靠近温暖的人和事' },
      { id:'B', text:'在不远处坐下，让气氛自然融入', score:67, memoryTag:'用存在代替打扰' },
      { id:'C', text:'远远看了一眼，继续自己的路', score:33, memoryTag:'保持距离也是一种温柔' },
      { id:'D', text:'绕开这片沙滩，不打扰属于他们的时刻', score:0, memoryTag:'相信有些温暖不需要第三者' }
    ]},
  { id:'scene-03', location:'靠近海岸', dimension:'CL', chapter:'启航',
    title:'海螺的低语', text:'你捡到一只海螺，贴近耳朵能听到海浪声——但仔细听，好像是某人在诉说什么。',
    options:[
      { id:'A', text:'把海螺贴在耳边很久，想听完所有的声音', score:100, memoryTag:'渴望听完整每一个故事' },
      { id:'B', text:'听了片刻，把海螺收进口袋', score:67, memoryTag:'珍藏美好的片段' },
      { id:'C', text:'听了一下就放下了，不贪心', score:33, memoryTag:'浅尝辄止也是一种选择' },
      { id:'D', text:'没有拿起海螺，继续走自己的路', score:0, memoryTag:'不被声音牵引自己的方向' }
    ]},

  // ===== 边界山脊 (AU) — scenes 4-6 =====
  { id:'scene-04', location:'边界山脊', dimension:'AU', chapter:'启航',
    title:'独行小径', text:'山脊上有一条只容一人通过的小路。左边是云雾弥漫的峡谷，右边是无边无际的天空。',
    options:[
      { id:'A', text:'独自走上小径，享受一个人的节奏', score:100, memoryTag:'独行不是孤独，是选择' },
      { id:'B', text:'走在上面感受风的形状，但愿意随时折返与人同行', score:67, memoryTag:'自由与陪伴可以共存' },
      { id:'C', text:'犹豫要不要走上去，回头看有没有人也想一起', score:33, memoryTag:'在自由和陪伴之间需要权衡' },
      { id:'D', text:'退回山脚，想等有人一起再走这条路', score:0, memoryTag:'不想被狭窄的路径定义' }
    ]},
  { id:'scene-05', location:'边界山脊', dimension:'AU', chapter:'启航',
    title:'盘旋的鹰', text:'一只鹰在头顶独自盘旋，它没有同伴，但翅膀划出的弧线优美而自由。',
    options:[
      { id:'A', text:'羡慕它的自由，你是那种也需要广阔天空的人', score:100, memoryTag:'自由是灵魂的必需品' },
      { id:'B', text:'欣赏它的姿态，但也觉得有同伴的飞行更温暖', score:67, memoryTag:'独立但不拒绝连接' },
      { id:'C', text:'看了片刻，担心它会不会孤单', score:33, memoryTag:'自由和孤单在你的世界里容易混淆' },
      { id:'D', text:'觉得鹰飞得太远太孤单，还是更想回到有人陪伴的路上', score:0, memoryTag:'不被外物轻易影响' }
    ]},
  { id:'scene-06', location:'边界山脊', dimension:'AU', chapter:'启航',
    title:'分岔路口', text:'两条路摆在眼前：一条通向山下热闹的村落，一条通向更深的荒野。',
    options:[
      { id:'A', text:'毫不犹豫走向荒野，那才是你的方向', score:100, memoryTag:'荒野的呼唤比人群的温暖更吸引你' },
      { id:'B', text:'先走荒野那条，如果无聊了再去村落', score:67, memoryTag:'先探索自己，再寻找他人' },
      { id:'C', text:'在路口徘徊了很久，难以决定', score:33, memoryTag:'选择本身有时比方向更让人焦虑' },
      { id:'D', text:'走向村落，人多的地方更让你安心', score:0, memoryTag:'人群的温度比独自前行更重要' }
    ]},

  // ===== 回声港湾 (SE) — scenes 7-9 =====
  { id:'scene-07', location:'回声港湾', dimension:'SE', chapter:'启航',
    title:'等待回应的呼喊', text:'你对着港湾喊了一声。回声传来——但那回声和你的声音不完全一样，像是有人在回应你。',
    options:[
      { id:'A', text:'再喊一次，渴望听到更清晰的回应', score:100, memoryTag:'需要确认的声音被听到了' },
      { id:'B', text:'微笑了一下，知道有人在就足够', score:67, memoryTag:'回应不需要完美，存在就够了' },
      { id:'C', text:'不确定那是不是真正的回应，选择观察', score:33, memoryTag:'对回应的真实性保持谨慎' },
      { id:'D', text:'不在意回声，继续做自己的事', score:0, memoryTag:'不需要外界的回应来确认自己' }
    ]},
  { id:'scene-08', location:'回声港湾', dimension:'SE', chapter:'启航',
    title:'灯塔的信号', text:'灯塔每隔十秒闪一次光。有人告诉你：规律的灯光意味着有人在等你。',
    options:[
      { id:'A', text:'朝着灯塔走去，想知道谁在等', score:100, memoryTag:'被承诺的信号牵引' },
      { id:'B', text:'对灯塔的方向点了点头，先完成自己的探索再过去', score:67, memoryTag:'确认有人在等，但不会改变自己的节奏' },
      { id:'C', text:'不确定那灯光是不是真的为自己而亮', score:33, memoryTag:'对信号的真实性保持怀疑' },
      { id:'D', text:'不去在意灯塔——有没有人等，对你来说并不重要', score:0, memoryTag:'不依赖外部信号导航' }
    ]},
  { id:'scene-09', location:'回声港湾', dimension:'SE', chapter:'启航',
    title:'沙滩上的誓言', text:'沙滩上写着一行字："我会回来。"字迹被海浪冲淡了一半。',
    options:[
      { id:'A', text:'蹲下来把快要消失的字迹重新描深', score:100, memoryTag:'愿意守住每一个即将消逝的承诺' },
      { id:'B', text:'看了一会儿，默默记住这行字的样子', score:67, memoryTag:'记住承诺，但不强求' },
      { id:'C', text:'心想：写这句话的人真的会回来吗', score:33, memoryTag:'对承诺保持理性质疑' },
      { id:'D', text:'不去读它——别人的承诺与你无关', score:0, memoryTag:'不被别人的承诺牵动' }
    ]},

  // ===== 潮汐河流 (EX) — scenes 10-12 =====
  { id:'scene-10', location:'潮汐河流', dimension:'EX', chapter:'深入',
    title:'水面的倒映', text:'河水平静如镜，你看见自己的倒影——但倒影的表情和你此刻的表情不一样，它看起来更真实。',
    options:[
      { id:'A', text:'对着水面说出你此刻真正的感受', score:100, memoryTag:'面对自己时从不伪装' },
      { id:'B', text:'在心里默默承认那个倒影才是真实的你', score:67, memoryTag:'对自己诚实，只是不太习惯说出口' },
      { id:'C', text:'移开视线——有些感受现在还不是面对的时候', score:33, memoryTag:'真实有时需要合适的时机' },
      { id:'D', text:'搅乱了水面，不需要倒影来告诉你你是谁', score:0, memoryTag:'不需要反射来确认自己' }
    ]},
  { id:'scene-11', location:'潮汐河流', dimension:'EX', chapter:'深入',
    title:'漂流的话语', text:'河面上飘来一片树叶，叶子上写着一些字——像是上游有人把自己的心事写下来，让河带走。',
    options:[
      { id:'A', text:'也找一片叶子，写下自己最想说的话', score:100, memoryTag:'愿意让心事漂流到未知的远方' },
      { id:'B', text:'读完了叶子上的字，在心里默默回应', score:67, memoryTag:'共情但不一定说出口' },
      { id:'C', text:'看完了就把叶子放回水里，不留下痕迹', score:33, memoryTag:'感受了，但选择不参与' },
      { id:'D', text:'不去读也不去写——有些表达是多余的', score:0, memoryTag:'表达不是你的语言' }
    ]},
  { id:'scene-12', location:'潮汐河流', dimension:'EX', chapter:'深入',
    title:'河底的石头', text:'河水清澈见底，你能看见每一块河底的石头。有些石头光滑，有些棱角分明。',
    options:[
      { id:'A', text:'走进河里，亲手摸一摸那些棱角分明的石头', score:100, memoryTag:'愿意触碰最真实的不完美' },
      { id:'B', text:'站在岸边，仔细看每一块石头的形状', score:67, memoryTag:'观察真实的细节，但不急着触碰' },
      { id:'C', text:'只看那些光滑好看的石头', score:33, memoryTag:'倾向于展示美好的一面' },
      { id:'D', text:'不去看河底——看到的未必是真的', score:0, memoryTag:'对表面之下的真实保持距离' }
    ]},

  // ===== 裂隙火山 (RP) — scenes 13-15 =====
  { id:'scene-13', location:'裂隙火山', dimension:'RP', chapter:'深入',
    title:'裂开的大地', text:'地面有一道很宽的裂缝，裂缝深处隐约有火光。裂缝的两边，是两株根须还连在一起的树。',
    options:[
      { id:'A', text:'寻找材料搭一座简易的桥，连接裂缝两边', score:100, memoryTag:'相信裂痕可以被修复' },
      { id:'B', text:'在两棵树之间系一根绳子，让它们知道彼此还存在', score:67, memoryTag:'连接不需要完美，只需要存在' },
      { id:'C', text:'站在裂缝边思考：有些裂缝也许不该被填上', score:33, memoryTag:'质疑修复是否总是必要的' },
      { id:'D', text:'裂缝存在一定有它的原因，不去干预', score:0, memoryTag:'接受断裂作为一种存在的状态' }
    ]},
  { id:'scene-14', location:'裂隙火山', dimension:'RP', chapter:'深入',
    title:'喷发的余烬', text:'火山刚刚喷发过，空气中还飘着余烬。一只小鸟被烫伤了翅膀，倒在路边。',
    options:[
      { id:'A', text:'用随身的水壶给它降温，留在它身边直到它能飞', score:100, memoryTag:'在伤害发生后第一时间给予温暖' },
      { id:'B', text:'把它移到安全的地方，但知道真正的恢复需要时间', score:67, memoryTag:'提供庇护但不强求快速痊愈' },
      { id:'C', text:'站在远处守护，不想过度干预它的恢复过程', score:33, memoryTag:'在远近之间寻找合适的距离' },
      { id:'D', text:'自然是残酷的，有些伤需要自己愈合', score:0, memoryTag:'相信自然疗愈的力量，不主动介入' }
    ]},
  { id:'scene-15', location:'裂隙火山', dimension:'RP', chapter:'深入',
    title:'重新生长的花', text:'火山灰中，有一朵花正在努力破土。它很小、很脆弱，但它确实在生长。',
    options:[
      { id:'A', text:'每天来这里浇水，直到它完全开放', score:100, memoryTag:'相信持续的努力可以让美好重生' },
      { id:'B', text:'给它浇一次水，然后让它自己面对风雨', score:67, memoryTag:'提供一个起点，但尊重它自己的节奏' },
      { id:'C', text:'在旁边放一块石头为它挡风，仅此而已', score:33, memoryTag:'提供最小的帮助，不多不少' },
      { id:'D', text:'不打扰——能活下来的花，不需要人为干预', score:0, memoryTag:'相信生命有自己的韧性' }
    ]},

  // ===== 风向平原 (IN) — scenes 16-18 =====
  { id:'scene-16', location:'风向平原', dimension:'IN', chapter:'深入',
    title:'顺风的方向', text:'平原上的风很大，风向指向远方的山脉。有人说，顺着风走，就会到达对的终点。',
    options:[
      { id:'A', text:'张开双臂顺着风大步跑去，恨不得立刻到达', score:100, memoryTag:'被方向牵引时你会全力以赴' },
      { id:'B', text:'顺着风走，但不急——终点是确定的，过程可以慢一点', score:67, memoryTag:'有方向，但享受沿途' },
      { id:'C', text:'不确定风的方向是不是对的，先走走看再说', score:33, memoryTag:'跟随但保持怀疑' },
      { id:'D', text:'停在原地，等风自己过去——你不想被任何方向催着走', score:0, memoryTag:'不被任何外力推动你的方向' }
    ]},
  { id:'scene-17', location:'风向平原', dimension:'IN', chapter:'深入',
    title:'远方的篝火', text:'平原尽头有一簇篝火。你知道走过去需要两个小时，但你能闻到木柴的香味。',
    options:[
      { id:'A', text:'立刻出发，想在火灭之前到达', score:100, memoryTag:'为了温暖不惜跋涉' },
      { id:'B', text:'整理好背包再出发，确保路上有足够的补给', score:67, memoryTag:'主动但有准备' },
      { id:'C', text:'等天亮再走吧——篝火也许还会在', score:33, memoryTag:'等待比行动更让你安心' },
      { id:'D', text:'不再追那团火，原地坐下等夜色过去', score:0, memoryTag:'不依赖远方的温暖，自己创造' }
    ]},
  { id:'scene-18', location:'风向平原', dimension:'IN', chapter:'深入',
    title:'十字路口', text:'你来到一个十字路口，四条路通向四个不同的方向。你手里没有地图，但直觉告诉你该做决定了。',
    options:[
      { id:'A', text:'凭直觉选一条路，立刻启程', score:100, memoryTag:'相信直觉，不犹豫' },
      { id:'B', text:'在路口找一些线索——脚印、风向、光的方向', score:67, memoryTag:'先收集信息再行动' },
      { id:'C', text:'坐下來等一等，也许会有路人经过可以问路', score:33, memoryTag:'在决策前等待外部信息' },
      { id:'D', text:'不急着走——此时此刻的停留本身也是一种选择', score:0, memoryTag:'不行动也是一种立场' }
    ]},

  // ===== 星眠天文台 (ID) — scenes 19-21 =====
  { id:'scene-19', location:'星眠天文台', dimension:'ID', chapter:'高处',
    title:'望远镜里的星', text:'天文台上有一架古老的望远镜，对准了一颗你从未见过的星星。',
    options:[
      { id:'A', text:'凑上去看那颗星，想了解它的一切', score:100, memoryTag:'被未知的美深深吸引' },
      { id:'B', text:'先调整焦距，确保看清楚了再做判断', score:67, memoryTag:'欣赏但不冲动' },
      { id:'C', text:'看了一会儿，觉得它和别的星星没有太大不同', score:33, memoryTag:'浪漫滤镜在你这里比较薄' },
      { id:'D', text:'不看——星星在天上就够了，不需要通过望远镜', score:0, memoryTag:'不需要工具来确认美好' }
    ]},
  { id:'scene-20', location:'星眠天文台', dimension:'ID', chapter:'高处',
    title:'流星划过', text:'一颗流星划过头顶。老人们说：看到流星时许的愿望，会顺着星光传到对的人心里。',
    options:[
      { id:'A', text:'闭上眼睛许了一个关于爱情的愿望', score:100, memoryTag:'相信星星能把心意传给对的人' },
      { id:'B', text:'默默在心里说了一句话，但不太确信会被听到', score:67, memoryTag:'渴望被听见，但保持理性' },
      { id:'C', text:'看完了流星没有许愿——愿望应该靠自己实现', score:33, memoryTag:'浪漫和务实之间你倾向后者' },
      { id:'D', text:'流星只是陨石燃烧，不需要赋予它意义', score:0, memoryTag:'不需要浪漫化的解释' }
    ]},
  { id:'scene-21', location:'星眠天文台', dimension:'ID', chapter:'高处',
    title:'星座的传说', text:'墙上刻着一幅古老的星座图，旁边写着：找到属于你的星座，就能找到与你灵魂共振的人。',
    options:[
      { id:'A', text:'仔细研究星座图，想知道哪一颗星属于你', score:100, memoryTag:'渴望找到灵魂层面的归属' },
      { id:'B', text:'觉得这个传说很美，但不一定需要星座来指引爱情', score:67, memoryTag:'欣赏浪漫但保持自主' },
      { id:'C', text:'看了半天也看不出哪颗星星和自己有关', score:33, memoryTag:'在浪漫叙事中容易迷失' },
      { id:'D', text:'星座和人没有必然联系——你相信更实在的东西', score:0, memoryTag:'灵魂共鸣不如脚踏实地' }
    ]},

  // ===== 誓约之塔 (ST) — scenes 22-24 =====
  { id:'scene-22', location:'誓约之塔', dimension:'ST', chapter:'高处',
    title:'古老的钟', text:'塔顶有一口古老的钟。传说每当有人在此许下承诺并敲钟，钟声就会永远回荡在山谷里。',
    options:[
      { id:'A', text:'敲响那口钟，让钟声见证你此刻的决心', score:100, memoryTag:'相信承诺需要被听见和记住' },
      { id:'B', text:'摸了摸钟，但没有敲——承诺在心不在钟声', score:67, memoryTag:'重视承诺但不需要仪式' },
      { id:'C', text:'不确定自己是否准备好敲响它——承诺太重了', score:33, memoryTag:'对承诺的重量保持敬畏' },
      { id:'D', text:'不去碰它——你不想让任何承诺提前固定未来', score:0, memoryTag:'不需要外部仪式来确认决心' }
    ]},
  { id:'scene-23', location:'誓约之塔', dimension:'ST', chapter:'高处',
    title:'石墙上的名字', text:'塔的石墙上刻满了名字——都是曾经来到这座岛的人留下的。有些名字被风雨侵蚀得模糊了，有些还很清晰。',
    options:[
      { id:'A', text:'也把你的名字刻在墙上，和那些名字一起留在这里', score:100, memoryTag:'愿意留下长久的印记' },
      { id:'B', text:'用手指在墙上轻轻写了一下，不留永久的痕迹', score:67, memoryTag:'存在过但不强求永恒' },
      { id:'C', text:'看完了那些名字，没有留下自己的——不知道值不值得', score:33, memoryTag:'对自己的停留保持不确定' },
      { id:'D', text:'不在意墙上的名字——来过就够了，不需要证明', score:0, memoryTag:'存在不需要被记录' }
    ]},
  { id:'scene-24', location:'誓约之塔', dimension:'ST', chapter:'高处',
    title:'塔的基石', text:'塔的底部有一块巨大的基石，上面写着：所有长久的事物，都是从一块石头开始。',
    options:[
      { id:'A', text:'从旁边搬来一块石头，放在基石旁边', score:100, memoryTag:'愿意一块一块地搭建长久' },
      { id:'B', text:'摸了摸基石，感受它的重量和温度', score:67, memoryTag:'欣赏长久但不急着参与搭建' },
      { id:'C', text:'觉得"长久"是一个太遥远的词，不确定自己能坚持', score:33, memoryTag:'对长期承诺感到不确定' },
      { id:'D', text:'不需要基石——短暂的事物也可以很美', score:0, memoryTag:'长久不是唯一的价值标准' }
    ]},

  // ===== 灯火码头 (CA) — scenes 25-27 =====
  { id:'scene-25', location:'灯火码头', dimension:'CA', chapter:'高处',
    title:'等待的人', text:'码头上站着一个看起来迷路的人。他的行李散落一地，眼神里有迷茫。',
    options:[
      { id:'A', text:'走过去帮他捡起行李，问他要不要一起走', score:100, memoryTag:'看见需要时本能地伸出援手' },
      { id:'B', text:'问他需不需要帮忙——如果他摇头，你就不勉强', score:67, memoryTag:'提供帮助但尊重对方的边界' },
      { id:'C', text:'在旁边观察了一会儿，不确定自己的帮助是否会被接受', score:33, memoryTag:'想要帮助但需要确认对方需要' },
      { id:'D', text:'每个人都有自己的路要走，不需要你来承担', score:0, memoryTag:'不替别人承担属于他们的事' }
    ]},
  { id:'scene-26', location:'灯火码头', dimension:'CA', chapter:'高处',
    title:'熄灭的灯', text:'码头的路灯灭了一半。剩下的一半在风中也摇摇欲坠。',
    options:[
      { id:'A', text:'用自己的方式——也许用手遮挡、也许添油——让灯继续亮着', score:100, memoryTag:'本能让你不让温暖熄灭' },
      { id:'B', text:'在还能亮的灯下坐一会儿，享受最后的微光', score:67, memoryTag:'珍惜尚存的温暖但不强求' },
      { id:'C', text:'看到灯灭了有些难过，但不觉得自己能做什么', score:33, memoryTag:'被熄灭触动但不行动' },
      { id:'D', text:'灯灭不灭是天意——不需要人为去维持', score:0, memoryTag:'不需要承担维持光亮的责任' }
    ]},
  { id:'scene-27', location:'灯火码头', dimension:'CA', chapter:'高处',
    title:'沉重的行囊', text:'你的行囊越来越重——里面装了不少沿途捡到的东西。有人提醒你：有些东西可以放下。',
    options:[
      { id:'A', text:'检查行囊，把属于别人的东西还给别人，属于自己的留着', score:33, memoryTag:'能分清哪些责任属于自己' },
      { id:'B', text:'放下一些最重的东西，但留几样最重要的', score:67, memoryTag:'学会选择性地承担' },
      { id:'C', text:'觉得每样东西都很重要，舍不得放下任何一件', score:100, memoryTag:'总觉得每一份重量都不该被放下' },
      { id:'D', text:'把整个行囊放在路边——旅途不需要那么多负担', score:0, memoryTag:'轻松前行比背负更重要' }
    ]},

  // ===== 迷雾航线 (NV) — scenes 28-30 =====
  { id:'scene-28', location:'迷雾航线', dimension:'NV', chapter:'归航',
    title:'未知的海图', text:'船上有一张海图，但海图上有一大片标注着"未知"。没有人知道那片海域有什么。',
    options:[
      { id:'A', text:'调转船头驶向那片"未知"海域', score:100, memoryTag:'未知不是危险，是邀请' },
      { id:'B', text:'先沿着已知航线航行，等准备好了再探索未知', score:67, memoryTag:'对未知有兴趣但需要准备' },
      { id:'C', text:'不确定是否该去——未知里可能有好东西，也可能有危险', score:33, memoryTag:'在刺激和安全之间犹豫' },
      { id:'D', text:'沿已知航线走就够了——不需要冒险', score:0, memoryTag:'安全比新鲜更重要' }
    ]},
  { id:'scene-29', location:'迷雾航线', dimension:'NV', chapter:'归航',
    title:'海市蜃楼', text:'前方海面上出现了一座从未见过的岛屿——也许是海市蜃楼，也许是真的。',
    options:[
      { id:'A', text:'全速前进，就算是幻觉也值得追一次', score:100, memoryTag:'被每一个"可能"点燃' },
      { id:'B', text:'慢慢靠近，保持警惕但不想错过', score:67, memoryTag:'在探索中保留理性' },
      { id:'C', text:'停下来观察——如果是真的，它不会消失', score:33, memoryTag:'等待确认而不是追逐' },
      { id:'D', text:'海市蜃楼不是真的——不值得为了幻觉偏离航线', score:0, memoryTag:'不为虚假的希望改变方向' }
    ]},
  { id:'scene-30', location:'迷雾航线', dimension:'NV', chapter:'归航',
    title:'换一条路', text:'你已经走了很远的固定航线，但船舵在你手里——你可以随时改变方向。',
    options:[
      { id:'A', text:'猛转舵，换个全新的方向——重复让人厌倦', score:100, memoryTag:'变化本身就是一种兴奋剂' },
      { id:'B', text:'偶尔偏离航线看看新风景，但保留回到主航线的可能', score:67, memoryTag:'在稳定和变化之间找到节奏' },
      { id:'C', text:'不确定要不要换方向——现在的航线虽然没什么惊喜但也安全', score:33, memoryTag:'对变化感到矛盾' },
      { id:'D', text:'不换方向——沿着固定航线走到终点就是胜利', score:0, memoryTag:'一致性和坚持比新鲜感重要' }
    ]},

  // ===== 旧船湾 (ME) — scenes 31-33 =====
  { id:'scene-31', location:'旧船湾', dimension:'ME', chapter:'归航',
    title:'搁浅的旧船', text:'海湾里搁浅着一艘很老的木船，船身爬满了藤壶，但船头的名字还隐约可见。',
    options:[
      { id:'A', text:'登上旧船，想了解它曾经航行过哪些海域', score:100, memoryTag:'被过去的故事深深吸引' },
      { id:'B', text:'在船边站了一会儿，想象它曾经乘风破浪的样子', score:67, memoryTag:'尊重过去但不沉溺' },
      { id:'C', text:'看了一眼就移开了目光——旧船让人有些伤感', score:33, memoryTag:'过去容易勾起复杂的情绪' },
      { id:'D', text:'旧船已经完成了它的使命，不需要再去打扰', score:0, memoryTag:'向前看，不回头' }
    ]},
  { id:'scene-32', location:'旧船湾', dimension:'ME', chapter:'归航',
    title:'船长的日志', text:'旧船舱里有一本航海日志，记录着每一次出海和归航的日期。最后一页写着："今日风平，想起多年前的那个港口。"',
    options:[
      { id:'A', text:'一页一页翻看整本日志，从第一页到最后', score:100, memoryTag:'渴望完整地了解一个故事的全貌' },
      { id:'B', text:'只看第一页和最后一页——开头和结局最重要', score:67, memoryTag:'有选择地回顾过去' },
      { id:'C', text:'只看了最后一页就放下了——不想被太多的故事牵动', score:33, memoryTag:'过去看一点就好，多了容易情绪起伏' },
      { id:'D', text:'不翻看日志——别人的过去与你无关', score:0, memoryTag:'不被过去的叙述萦绕' }
    ]},
  { id:'scene-33', location:'旧船湾', dimension:'ME', chapter:'归航',
    title:'旧照片', text:'船舱墙上钉着一张褪色的照片——一群人站在船头笑着，但你现在只能看清其中一两个人的脸。',
    options:[
      { id:'A', text:'仔细端详每张模糊的脸，尝试想象他们的故事', score:100, memoryTag:'对过去的每一个细节都充满深情' },
      { id:'B', text:'看了看那张照片，微笑了一下然后离开', score:67, memoryTag:'对过去温柔，但不会停留太久' },
      { id:'C', text:'想伸手把照片拿下来，但又觉得不该碰别人的回忆', score:33, memoryTag:'在靠近和尊重之间徘徊' },
      { id:'D', text:'过去的事没有太多意义——眼前的路更重要', score:0, memoryTag:'不为过去的人和事花费心力' }
    ]},

  // ===== 月潮湖 (EV) — scenes 34-36 =====
  { id:'scene-34', location:'月潮湖', dimension:'EV', chapter:'归航',
    title:'月下的湖水', text:'月光洒在湖面上，湖水随着月相缓缓涨落。安静到你能听见自己的心跳。',
    options:[
      { id:'A', text:'坐在湖边感受月光和湖水，让情绪自然流淌', score:100, memoryTag:'愿意完全沉浸在情绪里' },
      { id:'B', text:'在湖边坐了一小会儿，感受了一下然后继续前行', score:67, memoryTag:'感受情绪但不被淹没' },
      { id:'C', text:'看了一会儿，没太多感觉，只觉得这里比想象中安静', score:33, memoryTag:'安静有时比喧闹更让人不安' },
      { id:'D', text:'不去感受湖水——情绪和环境没有必然联系', score:0, memoryTag:'不被环境影响情绪' }
    ]},
  { id:'scene-35', location:'月潮湖', dimension:'EV', chapter:'归航',
    title:'湖中的倒影', text:'湖面忽然起了涟漪——不是风，是你心里某根弦被拨动了。你的倒影在湖水中微微摇晃。',
    options:[
      { id:'A', text:'蹲下来看自己的倒影——它看起来比你平时更真实', score:100, memoryTag:'在情绪的涟漪中看见更真实的自己' },
      { id:'B', text:'注意到自己心跳变快了——承认这一刻湖水确实触动了你', score:67, memoryTag:'承认情绪但不完全沉浸' },
      { id:'C', text:'不确定为什么湖水会让你有反应——也许只是累了', score:33, memoryTag:'用理性解释情绪波动' },
      { id:'D', text:'站起来继续走——湖水不该影响你', score:0, memoryTag:'不被任何外物影响情绪' }
    ]},
  { id:'scene-36', location:'月潮湖', dimension:'EV', chapter:'归航',
    title:'满月之夜', text:'今晚是满月。湖水涨到了最高点，整个湖面像一面巨大的银色镜子。空气中有一种说不清的期待。',
    options:[
      { id:'A', text:'深吸一口气——你能感受到空气中所有微妙的情绪震动', score:100, memoryTag:'情绪的触角伸向每一个角落' },
      { id:'B', text:'觉得今晚确实有些不一样，但说不清是什么', score:67, memoryTag:'感受到氛围但保持距离' },
      { id:'C', text:'今晚和平时没什么不同——月亮圆不圆和你无关', score:33, memoryTag:'对氛围变化免疫' },
      { id:'D', text:'满月只是天文现象——不需要赋予额外意义', score:0, memoryTag:'情绪和天象没有关联' }
    ]}
];

// Continuous narrative display order
export const displayScenes = scenes;

// ============================================
// 2. DIMENSION METADATA
// ============================================
export const DIM_META = {
  CL:{label:'亲密连接',location:'靠近海岸',icon:'🏖️',desc:'渴望陪伴、靠近、共享日常'},
  AU:{label:'自由边界',location:'边界山脊',icon:'⛰️',desc:'需要自由、空间、自主节奏'},
  SE:{label:'安全确认',location:'回声港湾',icon:'🔔',desc:'需要回应、承诺、明确关系信号'},
  EX:{label:'表达开放',location:'潮汐河流',icon:'🌊',desc:'愿意表达真实感受、暴露脆弱'},
  RP:{label:'修复能力',location:'裂隙火山',icon:'🌋',desc:'冲突后愿意沟通、修复、重新连接'},
  IN:{label:'主动推进',location:'风向平原',icon:'💨',desc:'主动靠近、推动关系、规划下一步'},
  ID:{label:'灵魂理想',location:'星眠天文台',icon:'🔭',desc:'重视灵魂共鸣、命运感、浪漫想象'},
  ST:{label:'稳定经营',location:'誓约之塔',icon:'🗼',desc:'渴望长期关系、共同规划、稳定建设'},
  CA:{label:'照顾承担',location:'灯火码头',icon:'🛟',desc:'容易照顾、托底、成为支撑者'},
  NV:{label:'新鲜探索',location:'迷雾航线',icon:'🧭',desc:'热爱变化、新鲜感、未知可能性'},
  ME:{label:'回忆牵引',location:'旧船湾',icon:'⛵',desc:'念旧、怀念、珍藏关系记忆'},
  EV:{label:'情绪敏感',location:'月潮湖',icon:'🌙',desc:'容易被情绪、关系氛围、对方状态影响'}
};

export const DIM_ORDER = ['CL','AU','SE','EX','RP','IN','ID','ST','CA','NV','ME','EV'];

// ============================================
// 3. 20 PERSONALITY TYPES
// ============================================
export const personalities = [
  {
    id:'lighthouse', name:'灯塔型',
    targetVector:{CL:65,AU:45,SE:45,EX:70,RP:85,IN:78,ID:45,ST:78,CA:92,NV:30,ME:45,EV:45},
    coreThresholds:{CA:80,RP:75,IN:65},
    hitLine:'你总在照亮别人，却经常忘记自己也需要被照亮。',
    keywords:['守护','可靠','付出'],
    keyDimensions:["CA","RP","IN","ST","EX","CL"]
  },
  {
    id:'gatekeeper', name:'守门人型',
    targetVector:{CL:55,AU:84,SE:55,EX:35,RP:62,IN:32,ID:45,ST:84,CA:55,NV:25,ME:50,EV:45},
    coreThresholds:{AU:75,ST:65,EX_MAX:45},
    hitLine:'进入你的世界很难，但离开更难。',
    keywords:['谨慎','忠诚','边界'],
    keyDimensions:["AU","ST","EX","IN","RP","SE"]
  },
  {
    id:'nest_builder', name:'筑巢型',
    targetVector:{CL:88,AU:30,SE:68,EX:65,RP:75,IN:55,ID:45,ST:92,CA:70,NV:22,ME:55,EV:45},
    coreThresholds:{CL:80,ST:80,AU_MAX:45},
    hitLine:'你想经营关系，而不是体验关系。',
    keywords:['稳定','经营','陪伴'],
    keyDimensions:["CL","ST","AU","CA","RP","SE"]
  },
  {
    id:'old_captain', name:'旧船长型',
    targetVector:{CL:75,AU:42,SE:72,EX:48,RP:45,IN:38,ID:55,ST:82,CA:55,NV:15,ME:95,EV:62},
    coreThresholds:{ME:80,ST:70,NV_MAX:35},
    hitLine:'你记住的从来不是过去，而是过去里的自己。',
    keywords:['念旧','深情','珍藏'],
    keyDimensions:["ME","ST","NV","SE","CL","EV"]
  },
  {
    id:'migratory_bird', name:'候鸟型',
    targetVector:{CL:65,AU:84,SE:58,EX:55,RP:35,IN:62,ID:62,ST:28,NV:84,CA:35,ME:60,EV:70},
    coreThresholds:{AU:70,NV:65,ST_MAX:45},
    hitLine:'你向往亲密，却害怕亲密吞掉你的自由。',
    keywords:['自由','矛盾','敏感'],
    keyDimensions:["AU","NV","ST","CL","EV","RP"]
  },
  {
    id:'island', name:'岛屿型',
    targetVector:{CL:28,AU:94,SE:25,EX:25,RP:50,IN:28,ID:30,ST:45,CA:22,NV:35,ME:25,EV:25},
    coreThresholds:{AU:85,CL_MAX:40,EX_MAX:35},
    hitLine:'你不是不需要爱，只是习惯一个人解决问题。',
    keywords:['独立','自足','安静'],
    keyDimensions:["AU","CL","EX","SE","CA","IN"]
  },
  {
    id:'explorer', name:'探险家型',
    targetVector:{CL:55,AU:78,SE:35,EX:68,RP:50,IN:84,ID:60,ST:22,NV:95,CA:30,ME:25,EV:45},
    coreThresholds:{NV:85,IN:75,ST_MAX:40},
    hitLine:'你爱上的往往不是一个人，而是一种新的可能。',
    keywords:['好奇','探索','自由'],
    keyDimensions:["NV","IN","ST","AU","EX","ID"]
  },
  {
    id:'wandering_poet', name:'流浪诗人型',
    targetVector:{CL:60,AU:70,SE:45,EX:65,RP:48,IN:55,ID:95,ST:30,NV:78,CA:38,ME:62,EV:65},
    coreThresholds:{ID:85,NV:65,ST_MAX:45},
    hitLine:'你寻找的不是爱情，而是灵魂共鸣。',
    keywords:['浪漫','理想','诗意'],
    keyDimensions:["ID","NV","ST","EX","ME","AU"]
  },
  {
    id:'collector', name:'收藏家型',
    targetVector:{CL:58,AU:62,SE:60,EX:32,RP:38,IN:25,ID:78,ST:52,CA:35,NV:25,ME:95,EV:70},
    coreThresholds:{ME:85,IN_MAX:40,EX_MAX:45},
    hitLine:'你爱的不是拥有，而是那些被珍藏的瞬间。',
    keywords:['细腻','珍藏','含蓄'],
    keyDimensions:["ME","IN","EX","ID","EV","AU"]
  },
  {
    id:'script_writer', name:'剧本型',
    targetVector:{CL:65,AU:45,SE:72,EX:55,RP:40,IN:50,ID:92,ST:55,CA:38,NV:55,ME:70,EV:78},
    coreThresholds:{ID:85,SE:65,EV:65},
    hitLine:'故事还没开始，你已经在心里演完了结局。',
    keywords:['想象','浪漫','期待'],
    keyDimensions:["ID","SE","EV","ME","CL","RP"]
  },
  {
    id:'spark', name:'星火型',
    targetVector:{CL:78,AU:42,SE:62,EX:85,RP:35,IN:90,ID:75,ST:35,NV:82,CA:35,ME:30,EV:75},
    coreThresholds:{IN:80,EX:75,NV:70},
    hitLine:'你点燃一段关系的速度，往往比别人更快。',
    keywords:['热烈','冲动','真挚'],
    keyDimensions:["IN","EX","NV","ID","EV","ST"]
  },
  {
    id:'moonlight', name:'月光型',
    targetVector:{CL:78,AU:38,SE:60,EX:70,RP:65,IN:45,ID:82,ST:70,CA:62,NV:35,ME:55,EV:72},
    coreThresholds:{ID:75,CA:55,EV:60},
    hitLine:'你总能看见别人身上的光。',
    keywords:['温柔','包容','欣赏'],
    keyDimensions:["ID","CA","EV","CL","EX","ST"]
  },
  {
    id:'mirror', name:'镜像型',
    targetVector:{CL:72,AU:35,SE:70,EX:58,RP:48,IN:38,ID:62,ST:60,CA:70,NV:25,ME:50,EV:92},
    coreThresholds:{EV:85,CA:60,AU_MAX:45},
    hitLine:'别人的情绪，常常比你的情绪更早影响你。',
    keywords:['共情','敏感','体贴'],
    keyDimensions:["EV","CA","AU","SE","CL","IN"]
  },
  {
    id:'resonance', name:'共振型',
    targetVector:{CL:72,AU:55,SE:45,EX:80,RP:70,IN:50,ID:88,ST:62,CA:45,NV:45,ME:50,EV:55},
    coreThresholds:{ID:80,EX:70,RP:60},
    hitLine:'你想要的不是陪伴，而是理解。',
    keywords:['深度','理解','共鸣'],
    keyDimensions:["ID","EX","RP","CL","ST","SE"]
  },
  {
    id:'tide', name:'潮汐型',
    targetVector:{CL:75,AU:68,SE:82,EX:65,RP:25,IN:45,ID:70,ST:35,NV:60,CA:35,ME:70,EV:95},
    coreThresholds:{EV:85,RP_MAX:40,SE:70},
    hitLine:'靠近是真的，离开也是真的。',
    keywords:['矛盾','浓烈','拉扯'],
    keyDimensions:["EV","RP","SE","CL","AU","ST"]
  },
  {
    id:'greenhouse', name:'温室型',
    targetVector:{CL:88,AU:25,SE:92,EX:68,RP:45,IN:35,ID:65,ST:82,CA:55,NV:18,ME:55,EV:85},
    coreThresholds:{SE:85,CL:80,AU_MAX:40},
    hitLine:'当被好好爱的时候，你会长出最真实的自己。',
    keywords:['依赖','投入','敏感'],
    keyDimensions:["SE","CL","AU","EV","ST","IN"]
  },
  {
    id:'deep_sea', name:'深海型',
    targetVector:{CL:60,AU:72,SE:58,EX:25,RP:55,IN:22,ID:82,ST:70,CA:45,NV:25,ME:65,EV:88},
    coreThresholds:{EV:75,EX_MAX:35,ID:75},
    hitLine:'你表面平静，但很少有人知道你内心到底有多深。',
    keywords:['深邃','内敛','丰富'],
    keyDimensions:["EV","EX","ID","AU","ST","IN"]
  },
  {
    id:'aurora', name:'极光型',
    targetVector:{CL:60,AU:82,SE:40,EX:82,RP:45,IN:85,ID:88,ST:25,NV:95,CA:30,ME:35,EV:65},
    coreThresholds:{NV:85,ID:80,IN:75},
    hitLine:'你的人生轨迹从来不喜欢按照常规路线运行。',
    keywords:['独特','变幻','自由'],
    keyDimensions:["NV","ID","IN","AU","EX","ST"]
  },
  {
    id:'black_forest', name:'黑森林型',
    targetVector:{CL:42,AU:88,SE:62,EX:18,RP:40,IN:22,ID:65,ST:55,CA:35,NV:32,ME:55,EV:78},
    coreThresholds:{AU:80,EX_MAX:30,EV:65},
    hitLine:'你让人想靠近，却又让人不知道该如何靠近。',
    keywords:['神秘','防御','独立'],
    keyDimensions:["AU","EX","EV","CL","SE","IN"]
  },
  {
    id:'stargazer', name:'观星者型',
    targetVector:{CL:52,AU:70,SE:42,EX:45,RP:62,IN:35,ID:92,ST:82,CA:45,NV:35,ME:40,EV:45},
    coreThresholds:{ID:85,ST:75,IN_MAX:45},
    hitLine:'你总在看未来，所以经常忘记活在当下。',
    keywords:['远见','理性','规划'],
    keyDimensions:["ID","ST","IN","AU","RP","CL"]
  }
];

// ============================================
// 3b. CORE & BRANCH TYPE CLASSIFICATION (Beta 0.9.7)
// ============================================
export const CORE_TYPE_IDS = [
  'lighthouse', 'gatekeeper', 'nest_builder', 'collector',
  'migratory_bird', 'island', 'explorer', 'wandering_poet',
  'spark', 'moonlight', 'mirror', 'stargazer'
];

export const BRANCH_TYPE_IDS = [
  'old_captain', 'script_writer', 'resonance', 'tide',
  'greenhouse', 'deep_sea', 'aurora', 'black_forest'
];

export const BRANCH_PARENT_MAP = {
  old_captain:   'collector',
  script_writer: 'wandering_poet',
  resonance:     'mirror',
  tide:          'spark',
  greenhouse:    'nest_builder',
  deep_sea:      'island',
  aurora:        'explorer',
  black_forest:  'gatekeeper'
};

export function isCoreType(personalityOrId) {
  const id = typeof personalityOrId === 'string' ? personalityOrId : personalityOrId.id;
  return CORE_TYPE_IDS.includes(id);
}

export function isBranchType(personalityOrId) {
  const id = typeof personalityOrId === 'string' ? personalityOrId : personalityOrId.id;
  return BRANCH_TYPE_IDS.includes(id);
}

// ============================================
// 4. SCORING FUNCTIONS (identical to app.js)
// ============================================

/** Safe value accessor — prevents real 0 scores from being swallowed */
export function getScore(obj, key, fallback = 50) {
  const value = obj?.[key];
  return Number.isFinite(value) ? value : fallback;
}

export function computeDimensionScores(choiceHistory) {
  const groups = {};
  for (const choice of choiceHistory) {
    if (!groups[choice.dimension]) groups[choice.dimension] = [];
    groups[choice.dimension].push(choice.score);
  }
  const avgs = {};
  for (const dim of DIM_ORDER) {
    const scores = groups[dim] || [];
    avgs[dim] = scores.length > 0 ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : 50;
  }
  return avgs;
}

// ═══════════════════════════════════════════════
// LIVE_SCORING_PROFILE = 'calibrationB' (B+)
// These algorithm params MUST stay in sync with:
//   - app.js matchAllTypes()
//   - core/calibration-profiles.mjs LIVE_SCORING_PROFILE
//   - scripts/probability-audit.mjs (when --profile calibrationB)
// ═══════════════════════════════════════════════
const LIVE_PARAMS = {
  coreWeight: 2.20,
  metBonus: 2.0,
  failPenalty: 6.0
};

export function matchAllTypes(avgDimensionScores, poolFilter) {
  // poolFilter: 'core' = only 12 core types, 'branch' = only 8 branch types, undefined/'all' = all 20
  const pool = !poolFilter || poolFilter === 'all' ? personalities
    : poolFilter === 'core' ? personalities.filter(p => CORE_TYPE_IDS.includes(p.id))
    : poolFilter === 'branch' ? personalities.filter(p => BRANCH_TYPE_IDS.includes(p.id))
    : personalities;

  const results = [];
  for (const p of pool) {
    let weightedSum = 0, totalWeight = 0;
    const thresholds = p.coreThresholds || {};

    for (const dim of DIM_ORDER) {
      const userScore = getScore(avgDimensionScores, dim);
      const targetScore = getScore(p.targetVector, dim);
      const diff = Math.abs(userScore - targetScore);

      // Weight: coreThreshold dimensions = coreWeight (B+: 2.20), others = 1.0
      let weight = 1.0;
      for (const key of Object.keys(thresholds)) {
        const baseDim = key.replace('_MAX','');
        if (baseDim === dim) { weight = LIVE_PARAMS.coreWeight; break; }
      }
      weightedSum += weight * diff;
      totalWeight += weight;
    }

    const weightedAvgDiff = weightedSum / totalWeight;
    let matchScore = 100 - weightedAvgDiff;

    // Core threshold penalty/bonus (B+ calibration):
    //  - Met threshold: +metBonus points each
    //  - Failed threshold: -failPenalty points each
    //  - _MAX thresholds: user score must be <= threshold
    let metCount = 0, failCount = 0;
    for (const [key, threshold] of Object.entries(thresholds)) {
      if (key.endsWith('_MAX')) {
        const dim = key.replace('_MAX','');
        if (getScore(avgDimensionScores, dim) <= threshold) {
          metCount++;
        } else {
          failCount++;
        }
      } else {
        if (getScore(avgDimensionScores, key) >= threshold) {
          metCount++;
        } else {
          failCount++;
        }
      }
    }
    matchScore += metCount * LIVE_PARAMS.metBonus;
    matchScore -= failCount * LIVE_PARAMS.failPenalty;

    matchScore = Math.min(99, Math.max(0, Math.round(matchScore)));

    results.push({ personality: p, matchScore });
  }

  results.sort((a,b) => b.matchScore - a.matchScore);
  return results;
}

/** Debug: full 20-type match (for internal use & audit) */
export function matchAllTypesDebug(avgDimensionScores) {
  return matchAllTypes(avgDimensionScores, 'all');
}

/** Fisher-Yates shuffle — identical to app.js */
export function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
